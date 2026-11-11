// =====================================================================
//  ZONES — position, ambiance et conditions de déblocage.
//  Le monde est continu : le nord est vers -Z, l'est vers +X.
// =====================================================================

export const WORLD = {
  radius: 4500,                               // limite absolue du monde
  port: { x: 0, z: 70, radius: 34 },          // île du port (centre)
  start: { x: 9.8, z: 7, heading: Math.PI },  // bateau amarré au bout du ponton
  homePort: {
    name: 'Port du Lagon',
    tabs: ['VENDRE', 'MATÉRIEL', 'BATEAU', 'SERVICES'], sellFactor: 1, serviceFactor: 1,
  },
};

// env :
//  water / waterDeep / foam : couleurs de l'eau (crêtes / creux / écume)
//  seabed      : couleur du fond
//  fogTint     : teinte appliquée au brouillard
//  fogScale    : multiplicateur de distance du brouillard (< 1 = plus épais)
//  waveScale   : multiplicateur de houle
//  waterOpacity: transparence de l'eau (1 = opaque)
export const ZONES = [
  {
    id: 'tropical',
    name: 'Récif des Lagons',
    subtitle: 'Eaux calmes et poissons colorés',
    center: [0, 0],
    radius: 650,
    blend: 120,
    requires: null,
    env: {
      water: 0x1a8a96, waterDeep: 0x0d4a6a, foam: 0xbfeee8, seabed: 0x3a8a80,
      fogTint: 0xffffff, fogScale: 1.0, waveScale: 0.8, waterOpacity: 0.78,
    },
    layout: { seed: 7, islands: 14, rockClusters: 26, coralPatches: 22 },
  },
  {
    id: 'cold',
    name: 'Fjord Gelé',
    subtitle: 'Le froid mord la coque',
    center: [0, -2400],
    radius: 900,
    blend: 200,
    requires: 'hull_2',     // coque renforcée
    cold: true,             // use la coque (voir balance.cold)
    env: {
      water: 0x2a4a5a, waterDeep: 0x101c28, foam: 0xdfe8f0, seabed: 0x1a2a30,
      fogTint: 0xc8d8e8, fogScale: 0.7, waveScale: 0.6, waterOpacity: 0.88,
    },
    layout: { seed: 21, cliffs: 12, icebergs: 34, iceSheets: 5 },
    // Petit comptoir au sud du fjord : vente (moins chère) et services (plus chers).
    outpost: {
      name: 'Comptoir du Fjord', x: 40, z: -1590,
      tabs: ['VENDRE', 'SERVICES'], sellFactor: 0.85, serviceFactor: 1.6,
    },
  },
  {
    id: 'abyss',
    name: 'Haute Mer',
    subtitle: 'Personne ne sait ce qui vit en dessous',
    center: [-2800, 600],
    radius: 1400,
    blend: 300,
    requires: 'engine_3',   // moteur diesel (autonomie)
    env: {
      water: 0x123a5a, waterDeep: 0x04101e, foam: 0xa0b8c8, seabed: 0x020408,
      fogTint: 0xa0a8b8, fogScale: 0.85, waveScale: 1.8, waterOpacity: 0.92,
    },
    layout: { seed: 77, stacks: 10, wrecks: 3 },
  },
];

// Ambiance entre les zones.
export const OPEN_SEA = {
  id: 'open',
  name: 'Pleine Mer',
  subtitle: '',
  env: {
    water: 0x18607a, waterDeep: 0x082840, foam: 0xb0d0d8, seabed: 0x0a2030,
    fogTint: 0xe0e8f0, fogScale: 0.9, waveScale: 1.2, waterOpacity: 0.88,
  },
};
