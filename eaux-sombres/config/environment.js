// =====================================================================
//  ENVIRONNEMENT — couleurs du cycle jour/nuit, brouillard, vagues.
// =====================================================================

// Distances de brouillard de base (multipliées par l'heure, la zone, la météo).
export const FOG = { near: 22, far: 165 };

// Images clés du cycle jour/nuit (heures 0 → 24, interpolées).
//  skyTop / skyHorizon : dégradé du ciel
//  fog       : couleur du brouillard (et de l'horizon)
//  light     : couleur de la lumière principale (soleil ou lune)
//  ambient   : lumière d'ambiance
//  sunTint   : teinte du disque solaire
//  fogDist   : multiplicateur de distance du brouillard
//  night     : 0 = plein jour, 1 = pleine nuit (fenêtres, lanternes, étoiles)
const NIGHT = {
  skyTop: 0x03040c, skyHorizon: 0x0c1226, fog: 0x0a0f1e,
  light: 0x34405e, ambient: 0x141c30, sunTint: 0xff6030,
  fogDist: 0.55, night: 1, stars: 1,
};

export const TIME_KEYFRAMES = [
  { hour: 0, ...NIGHT },
  { hour: 4.6, ...NIGHT },
  { hour: 5.5, skyTop: 0x1a2040, skyHorizon: 0x6a4a6a, fog: 0x4a3a55, light: 0x6a5070, ambient: 0x2a2840, sunTint: 0xff7040, fogDist: 0.7, night: 0.8, stars: 0.4 },
  { hour: 6.5, skyTop: 0x4a6a9a, skyHorizon: 0xf0a070, fog: 0xc89080, light: 0xffb080, ambient: 0x5a5070, sunTint: 0xffa060, fogDist: 0.85, night: 0.2, stars: 0 },
  { hour: 8, skyTop: 0x4a90d0, skyHorizon: 0xa8d0e8, fog: 0x9cc4d8, light: 0xfff0d8, ambient: 0x6a8098, sunTint: 0xfff0c0, fogDist: 1, night: 0, stars: 0 },
  { hour: 13, skyTop: 0x3a88d8, skyHorizon: 0xb0daf0, fog: 0xa8d4ea, light: 0xffffff, ambient: 0x7890a8, sunTint: 0xffffe0, fogDist: 1, night: 0, stars: 0 },
  { hour: 17, skyTop: 0x4a80c0, skyHorizon: 0xd8c8a0, fog: 0xc8c0a8, light: 0xffe8c0, ambient: 0x707888, sunTint: 0xffe0a0, fogDist: 0.95, night: 0, stars: 0 },
  { hour: 18.8, skyTop: 0x3a3a70, skyHorizon: 0xf07040, fog: 0xb06050, light: 0xff8040, ambient: 0x504060, sunTint: 0xff8030, fogDist: 0.8, night: 0.3, stars: 0.1 },
  { hour: 19.8, skyTop: 0x161a3a, skyHorizon: 0x6a3048, fog: 0x3a2238, light: 0x804050, ambient: 0x2a2038, sunTint: 0xff5020, fogDist: 0.65, night: 0.8, stars: 0.6 },
  { hour: 21, ...NIGHT },
  { hour: 24, ...NIGHT },
];

// Houle : somme de 4 vagues sinusoïdales (même formule en GLSL et en JS).
//  angle : direction (radians), length : longueur d'onde (m),
//  amplitude : hauteur (m), speed : multiplicateur de vitesse
export const WAVES = [
  { angle: 0.4, length: 26, amplitude: 0.32, speed: 1.0 },
  { angle: 2.1, length: 15, amplitude: 0.16, speed: 1.15 },
  { angle: -0.9, length: 38, amplitude: 0.42, speed: 0.85 },
  { angle: 1.2, length: 11, amplitude: 0.06, speed: 1.3 },
];
