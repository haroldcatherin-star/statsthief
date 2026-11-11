// Mode créateur : tout est débloqué, argent illimité, carburant infini, coque invincible.
// Activé avec ?createur dans l'adresse ; utilise sa propre sauvegarde.
import { BALANCE } from '../../config/balance.js';
import { UPGRADES } from '../../config/upgrades.js';
import { FISH } from '../../config/fish.js';
import { GEAR } from './Economy.js';
import { boatStats, refreshUnlocks } from './Upgrades.js';

// Activé par ?createur (serveur local) ou #createur (page publiée).
export const CREATOR = new URLSearchParams(location.search).has('createur') || location.hash === '#createur';

export function applyCreator(state) {
  const C = BALANCE.creator;
  for (const type of Object.keys(UPGRADES)) state.boatLevels[type] = UPGRADES[type].levels.length - 1;
  for (const cat of Object.keys(GEAR)) state.owned[cat] = Object.keys(GEAR[cat]);
  for (const [id, b] of Object.entries(GEAR.bait)) if (!b.infinite && !b.reusable) state.baits[id] = 999;
  // Équipe le meilleur matériel (le dernier de chaque liste).
  for (const cat of ['rod', 'reel', 'line']) {
    const ids = Object.keys(GEAR[cat]);
    if (!state.creatorInit) state.gear[cat] = ids[ids.length - 1];
  }
  refreshUnlocks(state);
  const st = boatStats(state);
  state.money = C.money;
  state.fuel = st.tank;
  state.hull = st.maxHull;
  if (C.revealJournal) {
    for (const id of Object.keys(FISH)) {
      if (!state.journal[id]) state.journal[id] = { count: 0, maxSize: 0, firstDay: state.time.day, zones: [], phases: [] };
    }
  }
  state.creator = true;
  state.creatorInit = true;
}

// Appelé à chaque image : on garde les réserves pleines.
export function creatorTick(state) {
  const C = BALANCE.creator;
  const st = boatStats(state);
  if (C.infiniteFuel) state.fuel = st.tank;
  if (C.invincible) state.hull = st.maxHull;
  if (state.money < C.money * 0.5) state.money = C.money;
  for (const [id, b] of Object.entries(GEAR.bait)) {
    if (!b.infinite && !b.reusable && (state.baits[id] || 0) < 100) state.baits[id] = 999;
  }
}
