import { test } from 'node:test';
import {
  serverId,
  executedCommands,
  withAuthedServer,
  assertSecondCommandPartialFailures,
  assert,
} from '../game-routes-fixture';
import { loopbackFetch } from '../support/http-helpers';

test('multi-command routes report partial failure when the second command fails', async () => {
  await assertSecondCommandPartialFailures([
    {
      path: '/api/respawn-toggle',
      body: { value: '1' },
      appliedCommands: ['mp_respawn_on_death_ct 1'],
      failedCommand: 'mp_respawn_on_death_t 1',
    },
    {
      path: '/api/set-startmoney',
      body: { value: 800 },
      appliedCommands: ['mp_startmoney 800'],
      failedCommand: 'mp_maxmoney 16000',
    },
    {
      path: '/api/set-roundtime',
      body: { value: 5 },
      appliedCommands: ['mp_roundtime 5'],
      failedCommand: 'mp_roundtime_defuse 5',
    },
    {
      path: '/api/set-overtime',
      body: { enable: '1', ot_rounds: 3 },
      appliedCommands: ['mp_overtime_enable 1'],
      failedCommand: 'mp_overtime_maxrounds 3',
    },
    {
      path: '/api/start-warmup',
      body: {},
      appliedCommands: ['mp_restartgame 1'],
      failedCommand: 'exec warmup.cfg',
    },
  ]);
});

test('preset routes reject malformed numeric values before sending RCON', async () => {
  await withAuthedServer(async (baseUrl, auth) => {
    const cases: Array<{ label: string; value: unknown }> = [
      { label: 'suffix junk', value: '5abc' },
      { label: 'prefix junk', value: 'abc5' },
      { label: 'decimal string', value: '5.5' },
      { label: 'empty string', value: '' },
      { label: 'out of range', value: 999 },
    ];

    for (const { label, value } of cases) {
      const res = await loopbackFetch(`${baseUrl}/api/set-freezetime`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          cookie: auth.sessionCookie,
          'x-csrf-token': auth.csrfToken,
        },
        body: JSON.stringify({ server_id: serverId, value }),
      });
      assert.equal(res.status, 400, label);
      assert.deepEqual(executedCommands, [], label);
    }
  });
});

test('preset routes accept strict allowed integer values including zero', async () => {
  await withAuthedServer(async (baseUrl, auth) => {
    const res = await loopbackFetch(`${baseUrl}/api/set-freezetime`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        cookie: auth.sessionCookie,
        'x-csrf-token': auth.csrfToken,
      },
      body: JSON.stringify({ server_id: serverId, value: '0' }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(executedCommands, ['mp_freezetime 0']);
  });
});

test('multi-command preset routes reject malformed numeric values before sending RCON', async () => {
  await withAuthedServer(async (baseUrl, auth) => {
    const scenarios: Array<{ path: string; body: Record<string, unknown> }> = [
      { path: '/api/set-roundtime', body: { value: '5abc' } },
      { path: '/api/set-overtime', body: { enable: '1', ot_rounds: '3abc' } },
    ];

    for (const scenario of scenarios) {
      const res = await loopbackFetch(`${baseUrl}${scenario.path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          cookie: auth.sessionCookie,
          'x-csrf-token': auth.csrfToken,
        },
        body: JSON.stringify({ server_id: serverId, ...scenario.body }),
      });
      assert.equal(res.status, 400, scenario.path);
      assert.deepEqual(executedCommands, [], scenario.path);
    }
  });
});
