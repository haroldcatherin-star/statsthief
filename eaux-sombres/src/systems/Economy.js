// Économie : cours du marché, vente, achats de matériel et d'améliorations, services du port.
import { BALANCE } from '../../config/balance.js';
import { RODS, REELS, LINES, BAITS } from '../../config/gear.js';
import { UPGRADES, SERVICES } from '../../config/upgrades.js';
import { bus } from '../core/EventBus.js';
import { hash3 } from '../core/Random.js';
import { boatStats, nextLevel, refreshUnlocks } from './Upgrades.js';

export const GEAR = { rod: RODS, reel: REELS, line: LINES, bait: BAITS };

const idHash = (id) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7);

export class Economy {
  constructor(state, inventory) {
    this.state = state;
    this.inventory = inventory;
    // Lieu de vente actuel (port principal ou comptoir) : multiplicateurs de prix.
    this.place = { sellFactor: 1, serviceFactor: 1 };
    bus.on('time:newday', (day) => this.newDay(day));
  }

  get money() { return this.state.money; }

  newDay(day) {
    this.state.market = { day, sold: {} };
  }

  // Cours du jour d'une espèce × saturation (plus on en vend, moins c'est cher).
  marketMultiplier(id) {
    const M = BALANCE.market;
    const daily = M.minDaily + hash3(this.state.market.day * 7.13, idHash(id), 3.7) * (M.maxDaily - M.minDaily);
    const sold = this.state.market.sold[id] || 0;
    const sat = Math.max(M.minSaturation, 1 - M.saturationPerFish * sold);
    return daily * sat;
  }

  priceOf(fish) {
    return Math.max(1, Math.round(fish.value * this.marketMultiplier(fish.id) * this.place.sellFactor));
  }

  earn(amount) {
    this.state.money += amount;
    this.state.stats.earned += amount;
    bus.emit('money:changed', this.state.money);
  }

  spend(amount) {
    if (this.state.money < amount) return false;
    this.state.money -= amount;
    bus.emit('money:changed', this.state.money);
    return true;
  }

  sellOne(index) {
    const fish = this.inventory.items[index];
    if (!fish) return 0;
    const price = this.priceOf(fish);
    this.inventory.remove(index);
    this.state.market.sold[fish.id] = (this.state.market.sold[fish.id] || 0) + 1;
    this.earn(price);
    return price;
  }

  sellAll() {
    let total = 0, count = 0;
    while (this.inventory.count) {
      total += this.sellOne(0);
      count++;
    }
    return { count, total };
  }

  // --- Matériel ---
  owns(cat, id) { return this.state.owned[cat].includes(id); }

  // Renvoie un message de résultat.
  buyOrEquipGear(cat, id) {
    const item = GEAR[cat][id];
    if (cat === 'bait' && !item.infinite && !item.reusable) {
      const qty = SERVICES.baitPack;
      if (!this.spend(item.price * qty)) return { ok: false, msg: 'Pas assez d\'argent.' };
      this.state.baits[id] = (this.state.baits[id] || 0) + qty;
      if (!this.owns(cat, id)) this.state.owned[cat].push(id);
      this.state.gear.bait = id;
      return { ok: true, msg: `${item.name} ×${qty} achetés et équipés.`, bought: true };
    }
    if (!this.owns(cat, id)) {
      if (!this.spend(item.price)) return { ok: false, msg: 'Pas assez d\'argent.' };
      this.state.owned[cat].push(id);
      this.state.gear[cat] = id;
      return { ok: true, msg: `${item.name} acheté et équipé.`, bought: true };
    }
    this.state.gear[cat] = id;
    return { ok: true, msg: `${item.name} équipé.` };
  }

  baitCount(id) {
    const b = BAITS[id];
    if (b.infinite || b.reusable) return Infinity;
    return this.state.baits[id] || 0;
  }

  // --- Bateau ---
  buyUpgrade(type) {
    const next = nextLevel(this.state, type);
    if (!next) return { ok: false, msg: 'Déjà au niveau maximum.' };
    if (!this.spend(next.price)) return { ok: false, msg: 'Pas assez d\'argent.' };
    const before = boatStats(this.state);
    this.state.boatLevels[type]++;
    refreshUnlocks(this.state);
    const after = boatStats(this.state);
    // Coque neuve : on garde les dégâts subis ; réservoir plus grand : vide en plus.
    this.state.hull = Math.min(after.maxHull, this.state.hull + (after.maxHull - before.maxHull));
    bus.emit('boat:upgraded', type);
    return { ok: true, msg: `${UPGRADES[type].name} : ${next.name} installé !`, bought: true };
  }

  // --- Services ---
  refuelCost() {
    const s = boatStats(this.state);
    return Math.ceil((s.tank - this.state.fuel) * (SERVICES.fuelPrice * this.place.serviceFactor));
  }

  refuel() {
    const s = boatStats(this.state);
    const missing = s.tank - this.state.fuel;
    if (missing < 0.5) return { ok: false, msg: 'Le réservoir est déjà plein.' };
    const liters = Math.min(missing, this.state.money / (SERVICES.fuelPrice * this.place.serviceFactor));
    if (liters < 0.5) return { ok: false, msg: 'Pas assez d\'argent.' };
    const cost = Math.ceil(liters * (SERVICES.fuelPrice * this.place.serviceFactor));
    this.spend(Math.min(cost, this.state.money));
    this.state.fuel = Math.min(s.tank, this.state.fuel + liters);
    return { ok: true, msg: `Plein fait : ${liters.toFixed(0)} L pour ${cost} pièces.`, bought: true };
  }

  repairCost() {
    const s = boatStats(this.state);
    return Math.ceil((s.maxHull - this.state.hull) * (SERVICES.repairPrice * this.place.serviceFactor));
  }

  repair() {
    const s = boatStats(this.state);
    const missing = s.maxHull - this.state.hull;
    if (missing < 0.5) return { ok: false, msg: 'La coque est en parfait état.' };
    const pts = Math.min(missing, this.state.money / (SERVICES.repairPrice * this.place.serviceFactor));
    if (pts < 0.5) return { ok: false, msg: 'Pas assez d\'argent.' };
    const cost = Math.ceil(pts * (SERVICES.repairPrice * this.place.serviceFactor));
    this.spend(Math.min(cost, this.state.money));
    this.state.hull = Math.min(s.maxHull, this.state.hull + pts);
    return { ok: true, msg: `Coque réparée pour ${cost} pièces.`, bought: true };
  }

  towFee() {
    return Math.max(SERVICES.towMinFee, Math.round(this.state.money * SERVICES.towFeeRatio));
  }
}
