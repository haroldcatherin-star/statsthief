// Choix de l'espèce : zone × heure × habitat × appât × rareté (canne),
// profondeur (pêche sur glace), ou tables dédiées pour les casiers et les filets.
import { FISH, RARITY } from '../../config/fish.js';
import { BALANCE } from '../../config/balance.js';

function weightedPick(list) {
  const total = list.reduce((s, c) => s + c.w, 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const c of list) {
    r -= c.w;
    if (r <= 0) return c.id;
  }
  return list[list.length - 1].id;
}

export class FishSpawner {
  constructor(colliders, reefSpots = []) {
    // Îles, rochers et récifs immergés comptent comme « récif ».
    this.landmarks = colliders.filter((c) => c.kind === 'island' || c.kind === 'rock').concat(reefSpots);
  }

  habitatAt(x, z) {
    let min = Infinity;
    for (const c of this.landmarks) {
      const d = Math.hypot(x - c.x, z - c.z) - c.r;
      if (d < min) min = d;
    }
    return min < BALANCE.fishing.habitatRange ? 'reef' : 'open';
  }

  // Pêche à la canne depuis le bateau.
  candidates(zoneId, phase, habitat, bait) {
    const out = [];
    for (const [id, f] of Object.entries(FISH)) {
      if (f.zone !== zoneId || f.method === 'trap' || f.habitat === 'ice') continue;
      if (!f.times.includes(phase)) continue;
      let w = RARITY[f.rarity];
      if (f.habitat !== 'any' && f.habitat !== habitat) w *= 0.12;
      w *= bait?.attract?.[id] ?? 1;
      if (w > 0) out.push({ id, w });
    }
    return out;
  }

  pick(zoneId, phase, x, z, bait) {
    return weightedPick(this.candidates(zoneId, phase, this.habitatAt(x, z), bait));
  }

  // Pêche sur glace : seules les espèces avec une plage « ice » à cette profondeur.
  pickIce(zoneId, phase, depth, bait) {
    const out = [];
    for (const [id, f] of Object.entries(FISH)) {
      if (f.zone !== zoneId || !f.ice || !f.times.includes(phase)) continue;
      if (depth < f.ice[0] - 1 || depth > f.ice[1] + 1) continue;
      out.push({ id, w: RARITY[f.rarity] * (bait?.attract?.[id] ?? 1) });
    }
    return weightedPick(out);
  }

  // Casiers : espèces « trap » de la zone ; filets : espèces marquées net.
  pickPassive(zoneId, kind) {
    const out = [];
    for (const [id, f] of Object.entries(FISH)) {
      if (f.zone !== zoneId) continue;
      if (kind === 'trap' ? f.method === 'trap' : f.net) out.push({ id, w: RARITY[f.rarity] });
    }
    return weightedPick(out);
  }

  // Les petits sont plus fréquents que les gros (les records sont rares).
  createCatch(id, context = {}) {
    const f = FISH[id];
    const ratio = Math.pow(Math.random(), 1.6);
    const size = f.size[0] + (f.size[1] - f.size[0]) * ratio;
    const weight = f.weight[0] + (f.weight[1] - f.weight[0]) * Math.pow(ratio, 1.5);
    return {
      id,
      size: Math.round(size),
      weight: Math.round(weight * 10) / 10,
      value: Math.max(1, Math.round(f.price * (0.55 + ratio * 0.9))),
      sizeRatio: ratio,
      ...context,
    };
  }
}
