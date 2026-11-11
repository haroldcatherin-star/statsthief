// Niveaux d'amélioration du bateau et statistiques qui en découlent.
import { UPGRADES } from '../../config/upgrades.js';

export const UPGRADE_TYPES = Object.keys(UPGRADES);

export function currentLevel(state, type) {
  return UPGRADES[type].levels[state.boatLevels[type]];
}

export function nextLevel(state, type) {
  return UPGRADES[type].levels[state.boatLevels[type] + 1] || null;
}

// Statistiques effectives du bateau.
export function boatStats(state) {
  const e = currentLevel(state, 'engine');
  const h = currentLevel(state, 'hull');
  const l = currentLevel(state, 'lights');
  const c = currentLevel(state, 'hold');
  return {
    maxSpeed: e.maxSpeed,
    acceleration: e.accel,
    tank: e.tank,
    consumption: e.consumption,
    maxHull: h.hp,
    armor: h.armor,
    lampRange: l.range,
    lampIntensity: l.intensity,
    nightBite: l.nightBite,
    holdCols: c.cols,
    holdRows: c.rows,
    coldResist: h.coldResist || 0,
    traps: currentLevel(state, 'traps').count,
    nets: currentLevel(state, 'nets').count,
  };
}

// Déblocages « type_N » pour chaque niveau atteint (utilisés par les zones).
export function refreshUnlocks(state) {
  state.unlocks = [];
  for (const type of UPGRADE_TYPES) {
    for (let i = 0; i <= state.boatLevels[type]; i++) state.unlocks.push(`${type}_${i + 1}`);
  }
}
