/** Registers validated practice and quick-control RCON routes. */
import type { Router } from 'express';
import isAuthenticated from '../../modules/middleware';
import { requireAuthorizedServerId } from '../../utils/serverAccess';
import logger from '../../utils/logger';
import {
  makePresetRoute,
  makeSimpleCmdRoute,
  makeToggleRoute,
  parseConVarValue,
  parseIntBody,
  requireAllowlisted,
  runGameCmd,
  runGameCmdSequence,
  sendGameRouteError,
} from './helpers';

const VALID_GIVE_WEAPONS = [
  'weapon_flashbang',
  'weapon_smokegrenade',
  'weapon_hegrenade',
  'weapon_molotov',
  'weapon_decoy',
  'weapon_incgrenade',
] as const;

export function registerPracticeControls(router: Router): void {
  router.post('/api/cheats-toggle', isAuthenticated, makeToggleRoute('cheats-toggle', 'sv_cheats'));
  router.post(
    '/api/free-armor-toggle',
    isAuthenticated,
    makeToggleRoute('free-armor-toggle', 'mp_free_armor')
  );
  router.post(
    '/api/buy-anywhere-toggle',
    isAuthenticated,
    makeToggleRoute('buy-anywhere-toggle', 'mp_buy_anywhere')
  );
  router.post(
    '/api/grenade-trajectory-toggle',
    isAuthenticated,
    makeToggleRoute(
      'grenade-trajectory-toggle',
      'sv_grenade_trajectory_prac_pipreview',
      'sv_grenade_trajectory'
    )
  );
  router.post(
    '/api/show-impacts-toggle',
    isAuthenticated,
    makeToggleRoute('show-impacts-toggle', 'sv_showimpacts')
  );

  router.post('/api/respawn-toggle', isAuthenticated, async (req, res) => {
    try {
      const server_id = requireAuthorizedServerId(req, res);
      if (!server_id) return;
      const value = parseConVarValue(req.body?.value);
      if (value === null) {
        return res.status(400).json({ error: 'value must be 0 or 1' });
      }
      logger.info(
        { user: req.session?.user?.username ?? 'unknown', action: 'respawn-toggle', value },
        '[game] action'
      );
      await runGameCmdSequence(server_id, [
        `mp_respawn_on_death_ct ${value}`,
        `mp_respawn_on_death_t ${value}`,
      ]);
      return res
        .status(200)
        .json({ message: `Respawn command sequence sent with value ${value}.` });
    } catch (err) {
      sendGameRouteError(res, err, 'respawn-toggle');
      return;
    }
  });

  router.post(
    '/api/infinite-ammo-toggle',
    isAuthenticated,
    makePresetRoute('infinite-ammo-toggle', 'sv_infinite_ammo', [0, 1, 2])
  );
  router.post(
    '/api/set-freezetime',
    isAuthenticated,
    makePresetRoute('set-freezetime', 'mp_freezetime', [0, 5, 10, 15, 20])
  );

  router.post('/api/set-startmoney', isAuthenticated, async (req, res) => {
    try {
      const server_id = requireAuthorizedServerId(req, res);
      if (!server_id) return;
      const value = parseIntBody(req.body?.value);
      const allowedValues = [0, 800, 1600, 3200, 16000];
      if (
        !requireAllowlisted(
          res,
          value,
          allowedValues,
          `value must be one of: ${allowedValues.join(', ')}`
        )
      )
        return;
      logger.info(
        { user: req.session?.user?.username ?? 'unknown', action: 'set-startmoney', value },
        '[game] action'
      );
      await runGameCmdSequence(server_id, [
        `mp_startmoney ${value}`,
        `mp_maxmoney ${Math.max(value, 16000)}`,
      ]);
      return res
        .status(200)
        .json({ message: `Start money command sequence sent with value ${value}.` });
    } catch (err) {
      sendGameRouteError(res, err, 'set-startmoney');
      return;
    }
  });

  router.post(
    '/api/bot-difficulty',
    isAuthenticated,
    makePresetRoute('bot-difficulty', 'bot_difficulty', [0, 1, 2, 3])
  );

  router.post('/api/set-roundtime', isAuthenticated, async (req, res) => {
    try {
      const server_id = requireAuthorizedServerId(req, res);
      if (!server_id) return;
      const value = parseIntBody(req.body?.value);
      const allowedValues = [1, 2, 5, 60];
      if (
        !requireAllowlisted(
          res,
          value,
          allowedValues,
          `value must be one of: ${allowedValues.join(', ')}`
        )
      )
        return;
      logger.info(
        { user: req.session?.user?.username ?? 'unknown', action: 'set-roundtime', value },
        '[game] action'
      );
      await runGameCmdSequence(server_id, [
        `mp_roundtime ${value}`,
        `mp_roundtime_defuse ${value}`,
      ]);
      return res
        .status(200)
        .json({ message: `Round time command sequence sent with value ${value} min.` });
    } catch (err) {
      sendGameRouteError(res, err, 'set-roundtime');
      return;
    }
  });

  router.post(
    '/api/bot-add-ct',
    isAuthenticated,
    makeSimpleCmdRoute('bot-add-ct', 'bot_add ct', 'CT bot add command sent.')
  );
  router.post(
    '/api/bot-add-t',
    isAuthenticated,
    makeSimpleCmdRoute('bot-add-t', 'bot_add t', 'T bot add command sent.')
  );
  router.post(
    '/api/bot-kick-ct',
    isAuthenticated,
    makeSimpleCmdRoute('bot-kick-ct', 'bot_kick ct', 'CT bot kick command sent.')
  );
  router.post(
    '/api/bot-kick-t',
    isAuthenticated,
    makeSimpleCmdRoute('bot-kick-t', 'bot_kick t', 'T bot kick command sent.')
  );

  router.post('/api/give-weapon', isAuthenticated, async (req, res) => {
    try {
      const server_id = requireAuthorizedServerId(req, res);
      if (!server_id) return;
      const weapon = req.body?.weapon;
      if (
        typeof weapon !== 'string' ||
        !(VALID_GIVE_WEAPONS as readonly string[]).includes(weapon)
      ) {
        return res
          .status(400)
          .json({ error: `weapon must be one of: ${VALID_GIVE_WEAPONS.join(', ')}` });
      }
      logger.info(
        { user: req.session?.user?.username ?? 'unknown', action: 'give-weapon', weapon },
        '[game] action'
      );
      await runGameCmd(server_id, `give ${weapon}`);
      return res.status(200).json({ message: `Give ${weapon} command sent.` });
    } catch (err) {
      sendGameRouteError(res, err, 'give-weapon');
      return;
    }
  });
}
