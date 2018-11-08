// @flow

const promisify = require('util').promisify;
const OpenShiftClient = require('openshift-client');
const R = require('ramda');
const { logger } = require('@lagoon/commons/src/local-logging');
const {
  getOpenShiftInfoForProject,
  updateTask
} = require('@lagoon/commons/src/api');
const {
  sendToLagoonLogs,
  initSendToLagoonLogs
} = require('@lagoon/commons/src/logs');
const {
  consumeTasks,
  initSendToLagoonTasks,
  createTaskMonitor
} = require('@lagoon/commons/src/tasks');

initSendToLagoonLogs();
initSendToLagoonTasks();

const messageConsumer = async msg => {
  const { project, task, environment } = JSON.parse(msg.content.toString());

  logger.verbose(
    `Received JobOpenshift task for project: ${project.name}, task: ${task.id}`
  );

  const result = await getOpenShiftInfoForProject(project.name);
  const projectOpenShift = result.project;

  const ocsafety = string =>
    string.toLocaleLowerCase().replace(/[^0-9a-z-]/g, '-');

  try {
    var safeBranchName = ocsafety(environment.name);
    var safeProjectName = ocsafety(project.name);
    var openshiftConsole = projectOpenShift.openshift.consoleUrl.replace(
      /\/$/,
      ''
    );
    var openshiftToken = projectOpenShift.openshift.token || '';
    var openshiftProject = projectOpenShift.openshiftProjectPattern
      ? projectOpenShift.openshiftProjectPattern
          .replace('${branch}', safeBranchName)
          .replace('${project}', safeProjectName)
      : `${safeProjectName}-${safeBranchName}`;
    var jobName = `${openshiftProject}-${task.id}`;
  } catch (error) {
    logger.error(`Error while loading information for project ${project.name}`);
    logger.error(error);
    throw error;
  }

  const jobConfig = (name, spec) => {
    let config = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name
      },
      spec: {
        parallelism: 1,
        completions: 1,
        backoffLimit: 0,
        template: {
          metadata: {
            name: 'pi'
          },
          spec: {
            ...spec,
            restartPolicy: 'Never'
          }
        }
      }
    };

    return config;
  };

  // OpenShift API object
  const openshift = new OpenShiftClient.OApi({
    url: openshiftConsole,
    insecureSkipTlsVerify: true,
    auth: {
      bearer: openshiftToken
    }
  });

  // Kubernetes API Object - needed as some API calls are done to the Kubernetes API part of OpenShift and
  // the OpenShift API does not support them.
  const kubernetes = new OpenShiftClient.Core({
    url: openshiftConsole,
    insecureSkipTlsVerify: true,
    auth: {
      bearer: openshiftToken
    }
  });

  const batchApi = new OpenShiftClient.Batch({
    url: openshiftConsole,
    insecureSkipTlsVerify: true,
    auth: {
      bearer: openshiftToken
    }
  });

  let projectStatus = {};
  try {
    const projectsGet = promisify(openshift.projects(openshiftProject).get);
    projectStatus = await projectsGet();
  } catch (err) {
    if (err.code == 404) {
      logger.error(`Project ${openshiftProject} does not exist, bailing`);
      return;
    } else {
      logger.error(err);
      throw new Error();
    }
  }

  // Get pod spec for desired service
  let taskPodSpec;
  try {
    const podsGet = promisify(kubernetes.ns(openshiftProject).pods.get);
    const pods = await podsGet();

    const oneContainerPerSpec = pods.items.reduce(
      (specs, pod) => ({
        ...specs,
        ...pod.spec.containers.reduce(
          (specs, container) => ({
            ...specs,
            [container.name]: {
              ...pod.spec,
              containers: [container]
            }
          }),
          {}
        )
      }),
      {}
    );

    if (!oneContainerPerSpec[task.service]) {
      logger.error(`No spec for service ${task.service}, bailing`);
      return;
    }

    taskPodSpec = oneContainerPerSpec[task.service];
    taskPodSpec.containers[0].command = [
      '/sbin/tini',
      '--',
      '/lagoon/entrypoints.sh',
      ...task.command.split(' ')
    ];
  } catch (err) {
    logger.error(err);
    throw new Error(err);
  }

  // Create a new openshift job to run the lagoon task
  let openshiftJob;
  try {
    const jobConfigPost = promisify(
      batchApi.namespaces(openshiftProject).jobs.post
    );
    openshiftJob = await jobConfigPost({
      body: jobConfig(jobName, taskPodSpec)
    });
  } catch (err) {
    logger.error(err);
    throw new Error();
  }

  // Update lagoon task
  let updatedTask;
  try {
    const convertDateFormat = R.init;
    const dateOrNull = R.unless(R.isNil, convertDateFormat);

    updatedTask = await updateTask(task.id, {
      remoteId: openshiftJob.metadata.uid,
      created: convertDateFormat(openshiftJob.metadata.creationTimestamp),
      started: dateOrNull(openshiftJob.status.startTime)
    });
  } catch (error) {
    logger.error(
      `Could not update task ${project.name} ${task.name}. Message: ${error}`
    );
  }

  logger.verbose(`${openshiftProject}: Running job: ${task.name}`);

  const monitorPayload = {
    task: updatedTask.updateTask,
    project,
    environment
  };

  const taskMonitorLogs = await createTaskMonitor(
    'job-openshift',
    monitorPayload
  );

  sendToLagoonLogs(
    'start',
    project.name,
    '',
    'task:job-openshift:start',
    {},
    `*[${project.name}]* Task \`${task.id}\` *${task.name}* started`
  );
};

const deathHandler = async (msg, lastError) => {
  const { project, task } = JSON.parse(msg.content.toString());

  sendToLagoonLogs(
    'error',
    project.name,
    '',
    'task:job-openshift:error',
    {},
    `*[${project.name}]* Task \`${task.id}\` *${task.name}* ERROR:
\`\`\`
${lastError}
\`\`\``
  );
};

const retryHandler = async (msg, error, retryCount, retryExpirationSecs) => {
  const { project, task } = JSON.parse(msg.content.toString());

  sendToLagoonLogs(
    'warn',
    project.name,
    '',
    'task:job-openshift:retry',
    {
      error: error.message,
      msg: JSON.parse(msg.content.toString()),
      retryCount: 1
    },
    `*[${project.name}]* Task \`${task.id}\` *${task.name}* ERROR:
\`\`\`
${error.message}
\`\`\`
Retrying job in ${retryExpirationSecs} secs`
  );
};

consumeTasks('job-openshift', messageConsumer, retryHandler, deathHandler);
