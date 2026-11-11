// Interface de pêche : jauge de puissance, alerte de touche, barre de tension, fiche de prise.
import { FISH } from '../../config/fish.js';
import { BALANCE } from '../../config/balance.js';
import { S } from '../systems/Fishing.js';
import { LINE_H, ICON } from './PixelFont.js';

const C = {
  text: '#e8e0c8', dim: '#8a94a8', gold: '#ffd060', red: '#ff6a50', green: '#7ae08a',
  slack: '#5a6070', good: '#3a8a4a', danger: '#b03a2a', frame: '#e8e0c8',
};

function bar(hud, x, y, w, h, segments) {
  const c = hud.ctx;
  c.fillStyle = '#000';
  c.fillRect(x - 1, y - 1, w + 2, h + 2);
  for (const [from, to, color] of segments) {
    c.fillStyle = color;
    c.fillRect(x + Math.round(from * w), y, Math.max(1, Math.round((to - from) * w)), h);
  }
  c.fillStyle = C.frame;
  c.fillRect(x - 1, y - 2, w + 2, 1);
  c.fillRect(x - 1, y + h + 1, w + 2, 1);
}

export function drawFishingUI(hud, fishing, inventory, input) {
  const m = fishing.mode;
  if (m === S.IDLE) return;
  const cx = Math.round(hud.w / 2);
  const y0 = Math.round(hud.h - 52);
  const blink = Math.floor(performance.now() / 180) % 2 === 0;

  if (m === S.AIMING) {
    hud.text('PUISSANCE', cx, y0 - 14, C.gold, { align: 'center' });
    const p = fishing.power;
    bar(hud, cx - 50, y0, 100, 7, [[0, 1, '#20242c'], [0, p, p > 0.85 ? C.gold : C.green]]);
    hud.text('RELÂCHEZ POUR LANCER · ESPACE : ANNULER', cx, y0 + 12, C.dim, { align: 'center' });
  } else if (m === S.DRILL) {
    hud.text('PERCER LA GLACE', cx, y0 - 14, C.gold, { align: 'center' });
    const p = fishing.ice ? fishing.ice.progress : 0;
    bar(hud, cx - 50, y0, 100, 7, [[0, 1, '#20242c'], [0, p, '#a8d0f0']]);
    hud.text('MAINTENIR CLIC GAUCHE · ESPACE : REMONTER À BORD', cx, y0 + 12, C.dim, { align: 'center' });
  } else if (m === S.WAITING && fishing.ice) {
    const I = fishing.ice, max = BALANCE.ice.maxDepth;
    hud.text(`PROFONDEUR ${Math.round(I.depth)} M`, cx, y0 - 14, C.gold, { align: 'center' });
    bar(hud, cx - 60, y0, 120, 6, [[0, 1, '#10202c'], [0, I.depth / max, '#4a8ab0']]);
    const k = input ? `${input.label('forward')}/${input.label('back')}` : 'Z/S';
    hud.text(`${k} : MONTER/DESCENDRE · CLIC : FERRER · ESPACE : À BORD`, cx, y0 + 12, C.dim, { align: 'center' });
  } else if (m === S.CASTING || m === S.WAITING) {
    hud.text("EN ATTENTE D'UNE TOUCHE...", cx, y0, C.dim, { align: 'center' });
    hud.text('CLIC : FERRER · ESPACE : REMONTER', cx, y0 + LINE_H, C.dim, { align: 'center' });
  } else if (m === S.BITE) {
    if (blink) hud.text('!!', cx, y0 - 34, C.red, { align: 'center', scale: 3 });
    hud.text('ÇA MORD ! CLIQUEZ !', cx, y0, C.gold, { align: 'center' });
  } else if (m === S.FIGHT) {
    drawFight(hud, fishing, cx, y0, blink, input);
  }
  // La prise (S.CAUGHT) est présentée par CatchShowcase.
}

function drawFight(hud, fishing, cx, y0, blink) {
  const F = fishing.fight;
  if (!F) return;
  const w = 140, x = cx - w / 2;
  const slackT = BALANCE.fishing.slackThreshold;
  hud.text('TENSION', x, y0 - 13, C.text);
  hud.text(`${Math.max(0, F.dist).toFixed(0)} M`, x + w, y0 - 13, C.text, { align: 'right' });
  bar(hud, x, y0, w, 8, [[0, slackT, C.slack], [slackT, 0.8, C.good], [0.8, 1, C.danger]]);
  const mx = x + Math.round(Math.min(1, F.T) * (w - 2));
  const c = hud.ctx;
  c.fillStyle = F.T > 0.8 && blink ? C.red : '#ffffff';
  c.fillRect(mx, y0 - 3, 2, 14);

  // Énergie du poisson
  hud.text('ÉNERGIE', x, y0 + 13, C.dim);
  bar(hud, x + 46, y0 + 16, w - 46, 3, [[0, 1, '#20242c'], [0, F.stamina, '#e0a040']]);

  let msg = null;
  if (F.T > 0.85) msg = [blink ? 'ATTENTION AU FIL !' : '', C.red];
  else if (F.rush > 0) msg = ['IL TIRE !', C.red];
  else if (F.slack > 0.3) msg = ['FIL DÉTENDU !', C.gold];
  else if (F.jump >= 0) msg = ['IL SAUTE !', C.gold];
  if (msg) hud.text(msg[0], cx, y0 - 28, msg[1], { align: 'center' });

  hud.text('CLIC MAINTENU : MOULINER · RELÂCHER : DONNER DU FIL', cx, y0 + 28, C.dim, { align: 'center' });
}

function drawCatchCard(hud, c, inventory, cx) {
  if (!c) return;
  const f = FISH[c.id];
  const w = 210, h = 70;
  const x = cx - w / 2;
  const y = hud.h - h - 8;
  hud.panel(x, y, w, h);
  hud.text(f.name, cx, y + 4, C.gold, { align: 'center' });
  if (c.isNew) hud.text('NOUVELLE ESPÈCE !', cx, y + 4 + LINE_H, C.green, { align: 'center' });
  else if (c.isRecord) hud.text('NOUVEAU RECORD !', cx, y + 4 + LINE_H, C.green, { align: 'center' });
  hud.text(`${c.size} CM · ${c.weight.toFixed(1)} KG`, cx, y + 4 + LINE_H * 2, C.text, { align: 'center' });
  hud.text(`VALEUR ${c.value} ${ICON.coin}`, cx, y + 4 + LINE_H * 3, C.gold, { align: 'center' });
  if (!inventory.canFit(c)) hud.text('PAS DE PLACE ! ESPACE : RELÂCHER', cx, y + 4 + LINE_H * 4 + 2, C.red, { align: 'center' });
  else hud.text('CLIC / E : GARDER · ESPACE : RELÂCHER', cx, y + 4 + LINE_H * 4 + 2, C.dim, { align: 'center' });
}
