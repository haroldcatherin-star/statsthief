// Entrées clavier/souris. On lit les touches par position physique (event.code),
// donc ZQSD sur AZERTY et WASD sur QWERTY fonctionnent sans réglage.

export const BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  interact: ['KeyE'],
  cancel: ['Space'],
  menu: ['Escape'],
  confirm: ['Enter', 'NumpadEnter'],
  mute: ['KeyM'],
  journal: ['KeyJ'],
  hold: ['KeyI', 'Tab'],
  discard: ['KeyX', 'Delete'],
  trap: ['KeyC'],
  net: ['KeyN'],
  lamp: ['KeyL'],
  help: ['KeyH'],
  togglePS1: ['KeyP'],
  timeScale: ['KeyT'],
  debug: ['F3'],
};

const KEY_NAMES = {
  ArrowUp: 'HAUT', ArrowDown: 'BAS', ArrowLeft: 'GAUCHE', ArrowRight: 'DROITE',
  Space: 'ESPACE', Escape: 'ÉCHAP', Enter: 'ENTRÉE', Tab: 'TAB',
  ShiftLeft: 'MAJ', ShiftRight: 'MAJ', F3: 'F3',
};

// Repli si le navigateur ne donne pas la disposition clavier.
const AZERTY = { KeyW: 'Z', KeyA: 'Q', KeyQ: 'A', KeyZ: 'W', KeyM: ',', Semicolon: 'M' };

export class Input {
  constructor() {
    this.held = new Set();
    this.justPressed = new Set();
    this.layout = null;
    this.guessAzerty = (navigator.language || '').toLowerCase().startsWith('fr');
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, wheel: 0, buttons: 0, clicked: new Set(), released: new Set() };

    const gameKeys = new Set(Object.values(BINDINGS).flat().concat(['Space', 'Tab']));

    window.addEventListener('keydown', (e) => {
      if (gameKeys.has(e.code)) e.preventDefault();
      if (!e.repeat) this.justPressed.add(e.code);
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => {
      this.held.clear();
      this.mouse.buttons = 0;
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.dx += e.movementX || 0;
      this.mouse.dy += e.movementY || 0;
      this.mouse.buttons = e.buttons;
    });
    window.addEventListener('mousedown', (e) => {
      this.mouse.buttons = e.buttons;
      this.mouse.clicked.add(e.button);
    });
    window.addEventListener('mouseup', (e) => {
      this.mouse.buttons = e.buttons;
      this.mouse.released.add(e.button);
    });
    window.addEventListener('wheel', (e) => {
      this.mouse.wheel += e.deltaY;
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  async loadLayout() {
    try {
      if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
        this.layout = await navigator.keyboard.getLayoutMap();
      }
    } catch { /* pas grave : on devine */ }
  }

  down(action) {
    return BINDINGS[action].some((c) => this.held.has(c));
  }

  pressed(action) {
    return BINDINGS[action].some((c) => this.justPressed.has(c));
  }

  get leftHeld() {
    return (this.mouse.buttons & 1) !== 0;
  }

  get leftClicked() {
    return this.mouse.clicked.has(0);
  }

  get cameraDrag() {
    return (this.mouse.buttons & 2) !== 0 || (this.mouse.buttons & 4) !== 0;
  }

  keyLabel(code) {
    if (KEY_NAMES[code]) return KEY_NAMES[code];
    const l = this.layout?.get(code);
    if (l) return l.toUpperCase();
    if (!this.layout && this.guessAzerty && AZERTY[code]) return AZERTY[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
  }

  label(action) {
    return this.keyLabel(BINDINGS[action][0]);
  }

  endFrame() {
    this.justPressed.clear();
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.mouse.wheel = 0;
    this.mouse.clicked.clear();
    this.mouse.released.clear();
  }
}
