// Le port : vente (cours du marché), boutique de matériel, chantier naval, services.
import { FISH } from '../../config/fish.js';
import { WORLD } from '../../config/zones.js';
import { UPGRADES, UNLOCK_NOTES, SERVICES } from '../../config/upgrades.js';
import { GEAR } from '../systems/Economy.js';
import { UPGRADE_TYPES, currentLevel, nextLevel, boatStats } from '../systems/Upgrades.js';
import { ListMenu, UI } from './ListMenu.js';
import { ICON } from './PixelFont.js';

const CAT_NAMES = { rod: 'CANNES', reel: 'MOULINETS', line: 'FILS', bait: 'APPÂTS' };
const coin = (n) => `${n} ${ICON.coin}`;

function gearStats(cat, it) {
  if (cat === 'rod') return `PORTÉE ${it.maxCast} M · PUISSANCE ×${it.power}`;
  if (cat === 'reel') return `MOULINAGE ${it.reelSpeed} M/S`;
  if (cat === 'line') return `RÉSISTANCE ×${it.strength} · ${it.maxLength} M DE FIL`;
  const attract = Object.keys(it.attract).map((id) => FISH[id].name).join(', ');
  return `TOUCHES ×${it.biteSpeed}${attract ? ' · ATTIRE : ' + attract : ''}`;
}

function upgradeStats(type, lv) {
  if (type === 'engine') return `${lv.maxSpeed} M/S · RÉSERVOIR ${lv.tank} L`;
  if (type === 'hull') return `${lv.hp} PV · PROTECTION ${Math.round(lv.armor * 100)} %`;
  if (type === 'lights') return `PORTÉE ${lv.range} M · TOUCHES DE NUIT ×${lv.nightBite}`;
  if (type === 'traps' || type === 'nets') return `${lv.count} À POSER EN MER`;
  return `${lv.cols}×${lv.rows} = ${lv.cols * lv.rows} CASES`;
}

export class PortMenu extends ListMenu {
  constructor(deps) {
    super(deps);
    Object.assign(this, { economy: deps.economy, inventory: deps.inventory, state: deps.state, onChange: deps.onChange });
    this.place = WORLD.homePort;
  }

  // place : WORLD.homePort ou l'outpost d'une zone (onglets et prix propres)
  show(tab, place = WORLD.homePort) {
    this.place = place;
    this.economy.place = place;
    super.show(tab);
  }

  close() {
    super.close();
    this.economy.place = WORLD.homePort;
  }

  get title() { return `${this.place.name} · ${coin(this.state.money)}`; }
  tabs() { return this.place.tabs; }

  rows() {
    const E = this.economy, S = this.state;
    switch (this.tabs()[this.tab]) {
      case 'VENDRE': {
        if (!this.inventory.count) return [{ header: true, label: 'VOTRE CALE EST VIDE.' }];
        const total = this.inventory.items.reduce((s, f) => s + E.priceOf(f), 0);
        const rows = [{ label: 'TOUT VENDRE', value: coin(total), valueColor: UI.gold, act: 'sellAll' }];
        this.inventory.items.forEach((f, i) => {
          const m = E.marketMultiplier(f.id);
          rows.push({
            label: `${FISH[f.id].name} ${f.size} CM`,
            value: coin(E.priceOf(f)),
            valueColor: m > 1.05 ? UI.green : m < 0.95 ? UI.red : UI.text,
            act: 'sell', i, fish: f,
          });
        });
        return rows;
      }
      case 'MATÉRIEL': {
        const rows = [];
        for (const cat of ['rod', 'reel', 'line', 'bait']) {
          rows.push({ header: true, label: CAT_NAMES[cat] });
          for (const [id, it] of Object.entries(GEAR[cat])) {
            const equipped = S.gear[cat] === id;
            const owned = E.owns(cat, id);
            const consumable = cat === 'bait' && !it.infinite && !it.reusable;
            let value, valueColor;
            if (consumable) {
              const pack = it.price * SERVICES.baitPack;
              value = `${equipped ? '[ÉQ] ' : ''}${coin(pack)}`;
              valueColor = S.money >= pack ? (equipped ? UI.green : UI.text) : UI.red;
            } else if (equipped) { value = 'ÉQUIPÉ'; valueColor = UI.green; }
            else if (owned) { value = 'POSSÉDÉ'; valueColor = UI.text; }
            else { value = coin(it.price); valueColor = S.money >= it.price ? UI.text : UI.red; }
            const count = consumable ? ` (${S.baits[id] || 0})` : '';
            rows.push({ label: it.name + count, value, valueColor, act: 'gear', cat, id });
          }
        }
        return rows;
      }
      case 'BATEAU':
        return UPGRADE_TYPES.map((type) => {
          const next = nextLevel(S, type);
          return {
            label: `${UPGRADES[type].name} NV ${S.boatLevels[type] + 1}`,
            value: next ? coin(next.price) : 'MAX',
            valueColor: !next ? UI.green : S.money >= next.price ? UI.text : UI.red,
            act: 'upgrade', type,
          };
        });
      default: {
        const st = boatStats(S);
        return [
          { label: `FAIRE LE PLEIN (${S.fuel.toFixed(0)}/${st.tank} L)`, value: coin(E.refuelCost()), act: 'refuel' },
          { label: `RÉPARER LA COQUE (${Math.round(S.hull)}/${st.maxHull})`, value: coin(E.repairCost()), act: 'repair' },
          { label: 'SAUVEGARDER LA PARTIE', value: '', act: 'save' },
        ];
      }
    }
  }

  details(row) {
    const E = this.economy, S = this.state;
    switch (row.act) {
      case 'sellAll': return [['VEND TOUTE LA CARGAISON AU COURS DU JOUR.', UI.dim]];
      case 'sell': {
        const f = row.fish;
        const pct = Math.round((E.marketMultiplier(f.id) - 1) * 100);
        return [
          [FISH[f.id].name, UI.gold],
          [`${f.size} CM · ${f.weight.toFixed(1)} KG · BASE ${coin(f.value)}`],
          [`COURS DU JOUR : ${pct >= 0 ? '+' : ''}${pct} %`, pct >= 0 ? UI.green : UI.red],
          ['PLUS VOUS EN VENDEZ, PLUS LE PRIX BAISSE.', UI.dim],
        ];
      }
      case 'gear': {
        const it = GEAR[row.cat][row.id];
        const cur = GEAR[row.cat][S.gear[row.cat]];
        const lines = [[it.name, UI.gold], [gearStats(row.cat, it)]];
        if (cur !== it && row.cat !== 'bait') lines.push([`ACTUEL : ${gearStats(row.cat, cur)}`, UI.dim]);
        if (row.cat === 'bait' && !it.infinite && !it.reusable) lines.push([`PAQUET DE ${SERVICES.baitPack} · CONSOMMÉ À CHAQUE FERRAGE`, UI.dim]);
        return lines;
      }
      case 'upgrade': {
        const cur = currentLevel(S, row.type), next = nextLevel(S, row.type);
        const lines = [[`ACTUEL : ${cur.name}`, UI.text], [upgradeStats(row.type, cur), UI.dim]];
        if (next) {
          lines.push([`SUIVANT : ${next.name}`, UI.gold], [upgradeStats(row.type, next), UI.green]);
          const note = UNLOCK_NOTES[`${row.type}_${S.boatLevels[row.type] + 2}`];
          if (note) lines[3] = [`${upgradeStats(row.type, next)} · ${note}`, UI.green];
        } else lines.push(['NIVEAU MAXIMUM ATTEINT.', UI.green]);
        return lines;
      }
      case 'refuel': return [[`CARBURANT : ${(SERVICES.fuelPrice * this.place.serviceFactor).toFixed(1)} ${ICON.coin} PAR LITRE.`], ['SANS CARBURANT, LE BATEAU AVANCE À LA RAME.', UI.dim]];
      case 'repair': return [[`RÉPARATION : ${(SERVICES.repairPrice * this.place.serviceFactor).toFixed(1)} ${ICON.coin} PAR POINT.`], ['UNE COQUE À ZÉRO = REMORQUAGE ET CARGAISON PERDUE.', UI.dim]];
      case 'save': return [['ENREGISTRE LA PARTIE DANS CE NAVIGATEUR.'], ['(SAUVEGARDE AUTOMATIQUE AU PORT ET TOUTES LES MINUTES)', UI.dim]];
      default: return [];
    }
  }

  result(res) {
    this.flash(res.msg, res.ok ? UI.green : UI.red);
    this.audio.play(res.ok ? (res.bought ? 'coin' : 'stow') : 'escape');
    if (res.ok) this.onChange?.();
  }

  activate(row) {
    const E = this.economy;
    switch (row.act) {
      case 'sellAll': {
        const r = E.sellAll();
        this.result({ ok: true, bought: true, msg: `${r.count} POISSON(S) VENDU(S) : +${r.total} PIÈCES` });
        break;
      }
      case 'sell': {
        const p = E.sellOne(row.i);
        this.result({ ok: true, bought: true, msg: `VENDU : +${p} PIÈCES` });
        break;
      }
      case 'gear': this.result(E.buyOrEquipGear(row.cat, row.id)); break;
      case 'upgrade': this.result(E.buyUpgrade(row.type)); break;
      case 'refuel': this.result(E.refuel()); break;
      case 'repair': this.result(E.repair()); break;
      case 'save': this.result({ ok: true, msg: 'PARTIE SAUVEGARDÉE.' }); break;
    }
  }

  footer() {
    return `${this.input.label('left')}/${this.input.label('right')} : ONGLETS · ${this.input.label('interact')} : CHOISIR · ÉCHAP`;
  }
}
