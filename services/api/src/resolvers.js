// @flow

const GraphQLDate = require('graphql-iso-date');

const {
  addCustomer,
  deleteCustomer,
  getAllCustomers,
  getCustomerByProjectId,
  updateCustomer,
  getCustomerByName,
  deleteAllCustomers,
  resyncCustomersWithSearchguard,
} = require('./resources/customer/resolvers');

const {
  getDeploymentsByEnvironmentId,
  getDeploymentByRemoteId,
  addDeployment,
  deleteDeployment,
  updateDeployment,
} = require('./resources/deployment/resolvers');

const {
  getTasksByEnvironmentId,
  getTaskByRemoteId,
  addTask,
  deleteTask,
  updateTask,
} = require('./resources/task/resolvers');

const {
  addOrUpdateEnvironment,
  addOrUpdateEnvironmentStorage,
  getEnvironmentByName,
  getEnvironmentByOpenshiftProjectName,
  getEnvironmentHoursMonthByEnvironmentId,
  getEnvironmentStorageByEnvironmentId,
  getEnvironmentStorageMonthByEnvironmentId,
  getEnvironmentHitsMonthByEnvironmentId,
  getEnvironmentByDeploymentId,
  getEnvironmentByTaskId,
  getEnvironmentServicesByEnvironmentId,
  setEnvironmentServices,
  deleteEnvironment,
  getEnvironmentsByProjectId,
  updateEnvironment,
  getAllEnvironments,
  deleteAllEnvironments,
} = require('./resources/environment/resolvers');

const {
  addNotificationRocketChat,
  addNotificationSlack,
  addNotificationToProject,
  deleteNotificationRocketChat,
  deleteNotificationSlack,
  getNotificationsByProjectId,
  removeNotificationFromProject,
  updateNotificationRocketChat,
  updateNotificationSlack,
  deleteAllNotificationSlacks,
  deleteAllNotificationRocketChats,
  removeAllNotificationsFromAllProjects,
} = require('./resources/notification/resolvers');

const {
  addOpenshift,
  deleteOpenshift,
  getAllOpenshifts,
  getOpenshiftByProjectId,
  updateOpenshift,
  deleteAllOpenshifts,
} = require('./resources/openshift/resolvers');

const {
  deleteProject,
  addProject,
  getProjectByName,
  getProjectByGitUrl,
  getProjectByEnvironmentId,
  getAllProjects,
  updateProject,
  deleteAllProjects,
  createAllProjectsInKeycloak,
  createAllProjectsInSearchguard,
} = require('./resources/project/resolvers');

const {
  getUserSshKeys,
  addSshKey,
  updateSshKey,
  deleteSshKey,
  deleteAllSshKeys,
  removeAllSshKeysFromAllUsers,
} = require('./resources/sshKey/resolvers');

const {
  getUsersByProjectId,
  getUserBySshKey,
  addUser,
  updateUser,
  deleteUser,
  addUserToCustomer,
  removeUserFromCustomer,
  getUsersByCustomerId,
  addUserToProject,
  removeUserFromProject,
  deleteAllUsers,
  removeAllUsersFromAllCustomers,
  removeAllUsersFromAllProjects,
  createAllUsersInKeycloak,
} = require('./resources/user/resolvers');

const {
  addBackup,
  getBackupsByEnvironmentId,
  deleteAllBackups,
} = require('./resources/backup/resolvers');

const {
  getEnvVarsByProjectId,
  getEnvVarsByEnvironmentId,
  addEnvVariable,
  deleteEnvVariable,
} = require('./resources/env-variables/resolvers');

/* ::

import type {ResolversObj} from './resources';

*/

const resolvers /* : { [string]: ResolversObj | typeof GraphQLDate } */ = {
  Project: {
    customer: getCustomerByProjectId,
    users: getUsersByProjectId,
    notifications: getNotificationsByProjectId,
    openshift: getOpenshiftByProjectId,
    environments: getEnvironmentsByProjectId,
    envVariables: getEnvVarsByProjectId,
  },
  Environment: {
    project: getProjectByEnvironmentId,
    deployments: getDeploymentsByEnvironmentId,
    tasks: getTasksByEnvironmentId,
    hoursMonth: getEnvironmentHoursMonthByEnvironmentId,
    storages: getEnvironmentStorageByEnvironmentId,
    storageMonth: getEnvironmentStorageMonthByEnvironmentId,
    hitsMonth: getEnvironmentHitsMonthByEnvironmentId,
    backups: getBackupsByEnvironmentId,
    envVariables: getEnvVarsByEnvironmentId,
    services: getEnvironmentServicesByEnvironmentId,
  },
  Deployment: {
    environment: getEnvironmentByDeploymentId,
  },
  Task: {
    environment: getEnvironmentByTaskId,
  },
  Notification: {
    __resolveType(obj) {
      // $FlowFixMe
      switch (obj.type) {
        case 'slack':
          return 'NotificationSlack';
        case 'rocketchat':
          return 'NotificationRocketChat';
        default:
          return null;
      }
    },
  },
  Customer: {
    users: getUsersByCustomerId,
  },
  User: {
    sshKeys: getUserSshKeys,
  },
  Query: {
    userBySshKey: getUserBySshKey,
    customerByName: getCustomerByName,
    projectByGitUrl: getProjectByGitUrl,
    projectByName: getProjectByName,
    environmentByName: getEnvironmentByName,
    environmentByOpenshiftProjectName: getEnvironmentByOpenshiftProjectName,
    deploymentByRemoteId: getDeploymentByRemoteId,
    taskByRemoteId: getTaskByRemoteId,
    allProjects: getAllProjects,
    allCustomers: getAllCustomers,
    allOpenshifts: getAllOpenshifts,
    allEnvironments: getAllEnvironments,
  },
  Mutation: {
    addCustomer,
    updateCustomer,
    deleteCustomer,
    deleteAllCustomers,
    addOrUpdateEnvironment,
    updateEnvironment,
    deleteEnvironment,
    deleteAllEnvironments,
    addOrUpdateEnvironmentStorage,
    addNotificationSlack,
    updateNotificationSlack,
    deleteNotificationSlack,
    deleteAllNotificationSlacks,
    addNotificationRocketChat,
    updateNotificationRocketChat,
    deleteNotificationRocketChat,
    deleteAllNotificationRocketChats,
    addNotificationToProject,
    removeNotificationFromProject,
    removeAllNotificationsFromAllProjects,
    addOpenshift,
    updateOpenshift,
    deleteOpenshift,
    deleteAllOpenshifts,
    addProject,
    updateProject,
    deleteProject,
    deleteAllProjects,
    addSshKey,
    updateSshKey,
    deleteSshKey,
    deleteAllSshKeys,
    removeAllSshKeysFromAllUsers,
    addUser,
    updateUser,
    deleteUser,
    deleteAllUsers,
    addUserToCustomer,
    removeUserFromCustomer,
    removeAllUsersFromAllCustomers,
    addUserToProject,
    removeUserFromProject,
    removeAllUsersFromAllProjects,
    addDeployment,
    deleteDeployment,
    updateDeployment,
    addBackup,
    deleteAllBackups,
    createAllProjectsInKeycloak,
    createAllProjectsInSearchguard,
    resyncCustomersWithSearchguard,
    createAllUsersInKeycloak,
    addEnvVariable,
    deleteEnvVariable,
    addTask,
    deleteTask,
    updateTask,
    setEnvironmentServices,
  },
  Date: GraphQLDate,
};

module.exports = resolvers;
