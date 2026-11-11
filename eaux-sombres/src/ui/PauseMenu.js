// Menu pause (Échap) : le temps est arrêté.
import { ListMenu, UI } from './ListMenu.js';

export class PauseMenu extends ListMenu {
  // actions : { resume, save, journal, hold, togglePS1, toggleSound, newGame, isPS1, isMuted }
  constructor(deps) {
    super(deps);
    this.actions = deps.actions;
    this.confirmNew = false;
  }

  get title() { return 'PAUSE'; }

  show(tab) {
    this.confirmNew = false;
    super.show(tab);
  }

  rows() {
    const A = this.actions;
    return [
      { label: 'REPRENDRE', act: 'resume' },
      { label: 'SAUVEGARDER', act: 'save' },
      { label: 'CARNET DE PÊCHE', value: this.input.label('journal'), act: 'journal' },
      { label: 'CALE', value: this.input.label('hold'), act: 'hold' },
      { label: 'EFFET PS1', value: A.isPS1() ? 'OUI' : 'NON', act: 'togglePS1' },
      { label: 'SON', value: A.isMuted() ? 'NON' : 'OUI', act: 'toggleSound' },
      A.isCreator()
        ? { label: 'QUITTER LE MODE CRÉATEUR', color: UI.gold, act: 'switchMode' }
        : { label: 'MODE CRÉATEUR', color: UI.gold, act: 'switchMode' },
      ...(A.isCreator()
        ? [{ header: true, label: 'TÉLÉPORTATION' }, ...A.teleports().map((t) => ({ label: t.label, act: 'teleport', t }))]
        : []),
      this.confirmNew
        ? { label: 'CONFIRMER : TOUT EFFACER ?', color: UI.red, act: 'newGame' }
        : { label: 'NOUVELLE PARTIE', act: 'newGame' },
    ];
  }

  details(row) {
    switch (row.act) {
      case 'save': return [['ENREGISTRE LA PARTIE DANS CE NAVIGATEUR.', UI.dim]];
      case 'newGame': return [['EFFACE LA SAUVEGARDE ET RECOMMENCE DE ZÉRO.', UI.red]];
      case 'togglePS1': return [['RENDU BASSE RÉSOLUTION, TRAMAGE, SOMMETS QUI TREMBLENT.', UI.dim]];
      case 'switchMode': return this.actions.isCreator()
        ? [['RETOUR À LA PARTIE NORMALE (SA PROPRE SAUVEGARDE).', UI.dim]]
        : [['TOUT DÉBLOQUÉ, ARGENT ILLIMITÉ, CARBURANT INFINI.', UI.gold], ['SAUVEGARDE SÉPARÉE : VOTRE PARTIE NORMALE EST CONSERVÉE.', UI.dim]];
      case 'teleport': return [[`ALLER DIRECTEMENT : ${row.t.label}`, UI.dim]];
      default: return [];
    }
  }

  activate(row) {
    const A = this.actions;
    if (row.act !== 'newGame') this.confirmNew = false;
    switch (row.act) {
      case 'resume': this.close(); break;
      case 'save': A.save(); this.flash('PARTIE SAUVEGARDÉE.', UI.green); break;
      case 'journal': this.open = false; A.journal(); break;
      case 'hold': this.open = false; A.hold(); break;
      case 'togglePS1': A.togglePS1(); break;
      case 'toggleSound': A.toggleSound(); break;
      case 'switchMode': A.switchMode(); break;
      case 'teleport': A.teleport(row.t); this.close(); break;
      case 'newGame':
        if (this.confirmNew) A.newGame();
        else this.confirmNew = true;
        break;
    }
  }
}
