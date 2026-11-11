// État central du jeu : un seul objet sérialisable, sauvegardé tel quel (voir systems/Save.js).
import { BALANCE } from '../../config/balance.js';
import { WORLD } from '../../config/zones.js';
import { STARTING_GEAR } from '../../config/gear.js';
import { UPGRADES } from '../../config/upgrades.js';

// v3 (phase 4) : casiers/filets posés et niveaux traps/nets (ajoutés automatiquement au chargement).
export const SAVE_VERSION = 3;

export function createNewState() {
  return {
    version: SAVE_VERSION,
    time: { day: BALANCE.time.startDay, hour: BALANCE.time.startHour },
    boat: { x: WORLD.start.x, z: WORLD.start.z, heading: WORLD.start.heading },
    money: BALANCE.start.money,
    fuel: UPGRADES.engine.levels[0].tank,
    hull: UPGRADES.hull.levels[0].hp,
    boatLevels: { engine: 0, hull: 0, lights: 0, hold: 0, traps: 0, nets: 0 },
    traps: [],              // casiers et filets posés (phase 4)
    hold: [],               // poissons : { id, size, weight, value, w, h, x, y }
    gear: { ...STARTING_GEAR },
    owned: { rod: ['bamboo'], reel: ['rusty'], line: ['nylon'], bait: ['worm'] },
    baits: {},              // appâts consommables : { [id]: quantité }
    market: { day: BALANCE.time.startDay, sold: {} },
    journal: {},            // carnet : { [espèce]: { count, maxSize, firstDay, zones, phases } }
    stats: { caught: 0, lost: 0, earned: 0 },
    unlocks: [],            // déblocages dérivés des niveaux (ex. hull_2)
    settings: { ps1: true, help: true, muted: false },
  };
}
