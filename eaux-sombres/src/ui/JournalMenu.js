// Carnet de pêche : espèces par zone, records, moments et lieux où les trouver.
import { FISH } from '../../config/fish.js';
import { ZONES } from '../../config/zones.js';
import { PHASE_NAMES } from '../core/Clock.js';
import { ListMenu, UI } from './ListMenu.js';

const HABITAT = { reef: 'PRÈS DES RÉCIFS ET DES ROCHERS', open: 'AU LARGE, LOIN DES CÔTES', any: 'UN PEU PARTOUT' };
const RARITY = { common: 'COMMUN', uncommon: 'PEU COMMUN', rare: 'RARE' };

export class JournalMenu extends ListMenu {
  constructor(deps) {
    super(deps);
    this.state = deps.state;
  }

  get title() {
    const all = Object.keys(FISH).length;
    const known = Object.keys(this.state.journal).length;
    return `CARNET DE PÊCHE · ${known}/${all} ESPÈCES`;
  }
  get toggleAction() { return 'journal'; }

  tabs() { return ZONES.map((z) => z.name.toUpperCase()); }

  rows() {
    const zone = ZONES[this.tab];
    const list = Object.entries(FISH).filter(([, f]) => f.zone === zone.id);
    if (!list.length) return [{ header: true, label: 'EAUX INCONNUES... (BIENTÔT)' }];
    return list.map(([id, f]) => {
      const e = this.state.journal[id];
      return e
        ? { label: f.name, value: `×${e.count} · ${e.maxSize} CM`, id }
        : { label: '???', value: RARITY[f.rarity], valueColor: UI.dim, color: UI.dim, id };
    });
  }

  details(row) {
    const f = FISH[row.id];
    const e = this.state.journal[row.id];
    const when = f.method === 'trap' ? 'AU CASIER' : f.times.map((t) => PHASE_NAMES[t]).join(', ').toUpperCase();
    if (!e) {
      return [
        ['ESPÈCE INCONNUE', UI.dim],
        [f.hint, UI.text],
      ];
    }
    return [
      [`${f.name} · ${RARITY[f.rarity]}`, UI.gold],
      [`RECORD ${e.maxSize} CM (MAX ${f.size[1]}) · PRIS ${e.count} FOIS`],
      [`MORD : ${when}`],
      [f.method === 'trap' ? 'CASIERS SEULEMENT'
        : f.ice ? `${f.habitat === 'ice' ? '' : (HABITAT[f.habitat] + ' · ')}SOUS LA GLACE ${f.ice[0]}-${f.ice[1]} M`
        : HABITAT[f.habitat], UI.dim],
    ];
  }

  footer() {
    return `${this.input.label('left')}/${this.input.label('right')} : ZONES · ÉCHAP : FERMER`;
  }
}
