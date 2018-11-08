// @flow

const { sendToLagoonLogs } = require('@lagoon/commons/src/logs');
const { deleteUser } = require('@lagoon/commons/src/api');

import type { WebhookRequestData } from '../types';

async function gitlabUserDelete(webhook: WebhookRequestData) {
  const { webhooktype, event, uuid, body } = webhook;

  try {
    const { user_id: id } = body;

    const meta = {
      user: id
    };

    await deleteUser(id);

    sendToLagoonLogs(
      'info',
      '',
      uuid,
      `${webhooktype}:${event}:handled`,
      meta,
      `Deleted user ${id}`
    );

    return;
  } catch (error) {
    sendToLagoonLogs(
      'error',
      '',
      uuid,
      `${webhooktype}:${event}:unhandled`,
      { data: body },
      `Could not delete user, reason: ${error}`
    );

    return;
  }
}

module.exports = gitlabUserDelete;
