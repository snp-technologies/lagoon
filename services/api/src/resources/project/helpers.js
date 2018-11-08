// @flow

const R = require('ramda');
const sqlClient = require('../../clients/sqlClient');
const keycloakClient = require('../../clients/keycloakClient');
const { query } = require('../../util/db');
const logger = require('../../logger');

const {
  getKeycloakUserIdByUsername,
  getUsersByCustomerId,
} = require('../user/helpers');

const KeycloakOperations = require('../project/keycloak');
const Sql = require('../project/sql');

const Helpers = {
  getProjectById: async (id /* : string */) => {
    const rows = await query(sqlClient, Sql.selectProject(id));
    return R.prop(0, rows);
  },
  getProjectIdByName: async (name /* : string */) => {
    const pidResult = await query(sqlClient, Sql.selectProjectIdByName(name));

    const amount = R.length(pidResult);
    if (amount > 1) {
      throw new Error(
        `Multiple project candidates for '${name}' (${amount} found). Do nothing.`,
      );
    }

    if (amount === 0) {
      throw new Error(`Not found: '${name}'`);
    }

    const pid = R.path(['0', 'id'], pidResult);

    return pid;
  },
  getProjectsWithoutDirectUserAccess: async (
    projectIds /* : Array<string> */,
    userIds /* : Array<number> */,
  ) =>
    query(
      sqlClient,
      Sql.selectProjectsWithoutDirectUserAccess(projectIds, userIds),
    ),
  getProjectIdsByCustomerIds: async (customerIds /* : Array<string> */) =>
    query(sqlClient, Sql.selectProjectIdsByCustomerIds(customerIds)),
  getAllProjects: async () =>
    query(sqlClient, Sql.selectAllProjects()),
  getCustomerProjectsWithoutDirectUserAccess: async (
    customerIds /* : Array<number> */,
    userIds /* : Array<number> */,
  ) =>
    query(
      sqlClient,
      Sql.selectCustomerProjectsWithoutDirectUserAccess(customerIds, userIds),
    ),
  getAllProjectNames: async () =>
    R.map(R.prop('name'), await query(sqlClient, Sql.selectAllProjectNames())),
  mapIfNoDirectProjectAccess: async (
    projectId /* : string */,
    customerId /* : number */,
    callback /* : ({keycloakUserId: string, keycloakUsername: string, keycloakGroupId: string, keycloakGroupName: string}) => Promise<void> */,
  ) => {
    // Get the users given access to the customer
    const users = await getUsersByCustomerId(customerId);

    // Remove all users from the Keycloak groups that correspond to all projects
    for (const user of users) {
      // Return the project in an array if the user id does not have other access via `project_user`.
      const projectName = R.path(
        [0, 'name'],
        await Helpers.getProjectsWithoutDirectUserAccess(
          [projectId],
          [R.prop('id', user)],
        ),
      );

      const email = R.prop('email', user);
      const keycloakUserId = await getKeycloakUserIdByUsername(email);

      const keycloakGroupId = await KeycloakOperations.findGroupIdByName(
        projectName,
      );

      await callback({
        keycloakUserId,
        keycloakUsername: email,
        keycloakGroupId,
        keycloakGroupName: projectName,
      });
    }
  },
  // Given a lagoon project, add all users (direct and indirect) that have access to the projects
  // corresponding keycloak group.
  addProjectUsersToKeycloakGroup: async (
    project /* : Object */,
  ) => {
    const users = await query(sqlClient, Sql.selectAllUsersForProjectId(project.id));

    const keycloakGroupId = await KeycloakOperations.findGroupIdByName(
      project.name,
    );

    for (const user of users) {
      const email = R.prop('email', user);
      const keycloakUserId = await getKeycloakUserIdByUsername(email);

      await keycloakClient.users.addToGroup({
        id: keycloakUserId,
        groupId: keycloakGroupId,
      });
      logger.debug(
        `Added Keycloak user ${email} to group "${project.name}"`,
      );
    }
  },
};

module.exports = Helpers;
