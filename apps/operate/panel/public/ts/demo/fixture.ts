/** Sanitized, deterministic state used only by the static GitHub Pages demo. */
export interface DemoPlayer {
  userid: string;
  name: string;
  steamId64: string;
}

export interface DemoHistoryEntry {
  command: string;
  uses: number;
}

export interface DemoFixture {
  server: {
    id: string;
    hostname: string;
    host: string;
    port: number;
    map: string;
    humans: number;
    bots: number;
    maxPlayers: number;
    observedLabel: string;
  };
  requested: {
    gameType: string;
    gameMode: string;
    map: string;
  };
  gameTypes: Record<string, Record<string, string[]>>;
  mapGroups: Array<{ id: string; displayName: string }>;
  players: DemoPlayer[];
  commandHistory: DemoHistoryEntry[];
}

export const demoFixture: DemoFixture = {
  server: {
    id: '1',
    hostname: 'Server 1',
    host: '203.0.113.10',
    port: 27015,
    map: 'de_ancient',
    humans: 8,
    bots: 2,
    maxPlayers: 12,
    observedLabel: '5:33:34 PM',
  },
  requested: {
    gameType: 'competitive',
    gameMode: 'competitive',
    map: 'de_ancient',
  },
  gameTypes: {
    competitive: {
      competitive: [
        'de_ancient',
        'de_anubis',
        'de_dust2',
        'de_inferno',
        'de_mirage',
        'de_nuke',
        'de_overpass',
      ],
      wingman: ['de_overpass', 'de_vertigo', 'de_ancient', 'de_inferno', 'de_nuke'],
    },
    casual: {
      deathmatch: ['de_ancient', 'de_anubis', 'de_dust2', 'de_inferno'],
      gungame: ['ar_shoots', 'ar_baggage'],
    },
    fun: {
      bunnyhop: ['workshop/3077211069/bhop_at_night'],
      ctf: ['workshop/3555531615/ctf_2fort'],
      scoutzknivez: ['workshop/3073929825/scoutzknivez_pure_cs2'],
      surf: ['workshop/3070321829/surf_beginner'],
      deathrun: ['workshop/3164611860/deathrun_playground'],
      oitc: ['de_ancient'],
      '1v1arenas': ['workshop/3070581293/de_bank'],
    },
  },
  mapGroups: [
    { id: 'mg_active', displayName: 'Active Duty' },
    { id: 'mg_wingman', displayName: 'Wingman' },
    { id: 'mg_ctf', displayName: 'CTF Maps' },
    { id: 'mg_scoutzknivez', displayName: 'ScoutzKnivez' },
    { id: 'mg_bhop', displayName: 'Bhop' },
    { id: 'mg_surf', displayName: 'Surf' },
    { id: 'mg_deathrun', displayName: 'Deathrun' },
    { id: 'mg_oitc', displayName: 'OITC' },
    { id: 'mg_1v1', displayName: '1v1 Arenas' },
    { id: 'mg_gungame', displayName: 'GunGame' },
  ],
  players: [
    { userid: '2', name: 'hampus', steamId64: '76561197960266729' },
    { userid: '4', name: 'Emilia', steamId64: '76561197960266730' },
    { userid: '7', name: 'nomad', steamId64: '76561197960266731' },
    { userid: '9', name: 'Kova', steamId64: '76561197960266732' },
  ],
  commandHistory: [
    { command: 'status', uses: 4 },
    { command: 'hostname', uses: 2 },
    { command: 'map de_ancient', uses: 1 },
  ],
};
