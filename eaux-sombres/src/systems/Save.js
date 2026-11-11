// Sauvegarde dans localStorage, avec numéro de version et migration des anciennes sauvegardes.
import { BALANCE } from '../../config/balance.js';
import { createNewState, SAVE_VERSION } from '../core/GameState.js';
import { shapeFor } from './Inventory.js';
import { refreshUnlocks } from './Upgrades.js';

let KEY = BALANCE.save.key;

// Emplacement de sauvegarde séparé (ex. '.createur' pour le mode créateur).
export function useSlot(suffix) {
  KEY = BALANCE.save.key + suffix;
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function saveGame(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
    return true;
  } catch (e) {
    console.warn('Sauvegarde impossible', e);
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignoré */ }
}

// Fusion récursive : les clés manquantes reprennent la valeur par défaut.
function merge(defaults, data) {
  if (Array.isArray(defaults) || typeof defaults !== 'object' || defaults === null) {
    return data === undefined ? defaults : data;
  }
  const out = { ...defaults };
  for (const k of Object.keys(data || {})) {
    out[k] = k in defaults ? merge(defaults[k], data[k]) : data[k];
  }
  return out;
}

function migrate(data) {
  // v1 (phase 2) : cale sans grille -> on repositionnera les poissons.
  if (!data.version || data.version < 2) {
    data.hold = (data.hold || []).map((f) => {
      const [w, h] = shapeFor(f);
      return { ...f, w, h };
    });
    data.repack = true;
    data.version = 2;
  }
  return data;
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = migrate(JSON.parse(raw));
    const state = merge(createNewState(), data);
    state.version = SAVE_VERSION;
    refreshUnlocks(state);
    return state;
  } catch (e) {
    console.warn('Sauvegarde illisible, nouvelle partie', e);
    return null;
  }
}
