// =====================================================================
//  ESPÈCES DE POISSONS — modifiez librement pour rééquilibrer.
// =====================================================================
//
//  zone      : zone où vit l'espèce (voir config/zones.js)
//  habitat   : 'reef' (près des îles et rochers), 'open' (au large), 'any'
//  rarity    : 'common' | 'uncommon' | 'rare'  (poids de tirage, voir RARITY)
//  times     : phases où il mord : 'dawn', 'day', 'dusk', 'night'
//  size      : taille en cm [min, max]
//  weight    : poids en kg [à la taille min, à la taille max]
//  price     : prix de vente pour un poisson de taille moyenne (pièces)
//  fight     : comportement pendant le combat
//     force       : force de traction (0.2 = faible, 1 = très fort)
//     endurance   : secondes d'effort avant épuisement (environ)
//     pattern     : 'steady' (régulier), 'erratic' (à-coups), 'diver' (plonge), 'jumper' (saute)
//     rushChance  : probabilité de rush par seconde
//     rushForce   : multiplicateur de traction pendant un rush
//     rushTime    : durée moyenne d'un rush (s)
//  bite      : window = temps pour ferrer (s), nibbles = [min, max] petites touches avant la vraie
//  look      : apparence du modèle 3D (bill = rostre d'espadon, glow = leurre lumineux)
//  hint      : indice affiché dans le carnet
//
//  Options :
//  method    : 'trap' = ne se prend qu'au casier (pas de combat)
//  net       : true = peut se prendre au filet
//  ice       : [prof. min, prof. max] en m = se pêche sous la glace à ces profondeurs
//  habitat 'ice' = uniquement sous la glace

export const RARITY = { common: 10, uncommon: 4, rare: 1 };

export const FISH = {
  perroquet: {
    name: 'Poisson-perroquet',
    zone: 'tropical', habitat: 'reef', rarity: 'common', net: true,
    times: ['dawn', 'day', 'dusk'],
    size: [25, 60], weight: [0.4, 3.5], price: 14,
    fight: { force: 0.35, endurance: 6, pattern: 'steady', rushChance: 0.08, rushForce: 1.6, rushTime: 1.0 },
    bite: { window: 0.9, nibbles: [0, 2] },
    look: { body: 0x40b0a0, belly: 0xe0d070, fin: 0xd06090, height: 0.42, tail: 'fan' },
    hint: 'Autour des récifs coralliens, le jour.',
  },
  chirurgien: {
    name: 'Chirurgien bleu',
    zone: 'tropical', habitat: 'reef', rarity: 'common', net: true,
    times: ['day'],
    size: [15, 35], weight: [0.15, 1.0], price: 8,
    fight: { force: 0.25, endurance: 4, pattern: 'erratic', rushChance: 0.15, rushForce: 1.4, rushTime: 0.6 },
    bite: { window: 0.7, nibbles: [1, 3] },
    look: { body: 0x2050d0, belly: 0x1a3a90, fin: 0xf0d020, height: 0.55, tail: 'fork' },
    hint: 'Nerveux, près des coraux, en pleine journée.',
  },
  vivaneau: {
    name: 'Vivaneau rouge',
    zone: 'tropical', habitat: 'any', rarity: 'common', net: true,
    times: ['dusk', 'night', 'dawn'],
    size: [30, 80], weight: [0.5, 6], price: 20,
    fight: { force: 0.45, endurance: 8, pattern: 'steady', rushChance: 0.1, rushForce: 1.7, rushTime: 1.2 },
    bite: { window: 0.85, nibbles: [0, 2] },
    look: { body: 0xd04030, belly: 0xf0a090, fin: 0xc03028, height: 0.4, tail: 'fork' },
    hint: "Mord du crépuscule jusqu'à l'aube.",
  },
  merou: {
    name: 'Mérou',
    zone: 'tropical', habitat: 'reef', rarity: 'uncommon',
    times: ['dawn', 'day', 'dusk', 'night'],
    size: [50, 130], weight: [2, 30], price: 38,
    fight: { force: 0.7, endurance: 12, pattern: 'diver', rushChance: 0.12, rushForce: 1.8, rushTime: 1.6 },
    bite: { window: 1.0, nibbles: [1, 3] },
    look: { body: 0x7a6a48, belly: 0xb0a078, fin: 0x5a4a30, height: 0.45, tail: 'round', spots: true },
    hint: 'Tapi près des rochers. Il plonge vers le fond.',
  },
  barracuda: {
    name: 'Barracuda',
    zone: 'tropical', habitat: 'open', rarity: 'uncommon',
    times: ['dawn', 'dusk'],
    size: [60, 150], weight: [1.5, 20], price: 42,
    fight: { force: 0.6, endurance: 9, pattern: 'jumper', rushChance: 0.3, rushForce: 2.0, rushTime: 0.8 },
    bite: { window: 0.55, nibbles: [0, 1] },
    look: { body: 0x8a9aa8, belly: 0xe0e8f0, fin: 0x4a5a68, height: 0.2, tail: 'fork', stripes: true },
    hint: "Chasse au large, à l'aube et au crépuscule.",
  },
  murene: {
    name: 'Murène tachetée',
    zone: 'tropical', habitat: 'reef', rarity: 'uncommon',
    times: ['night'],
    size: [60, 150], weight: [1, 12], price: 30,
    fight: { force: 0.5, endurance: 10, pattern: 'erratic', rushChance: 0.2, rushForce: 1.7, rushTime: 1.0 },
    bite: { window: 0.75, nibbles: [1, 2] },
    look: { body: 0x6a7a30, belly: 0xa0a860, fin: 0x4a5a20, height: 0.14, tail: 'eel', spots: true },
    hint: 'Sort des récifs une fois la nuit tombée.',
  },
  lanterne: {
    name: 'Poisson-lanterne',
    zone: 'tropical', habitat: 'open', rarity: 'rare',
    times: ['night'],
    size: [20, 45], weight: [0.2, 1.5], price: 120,
    fight: { force: 0.4, endurance: 6, pattern: 'erratic', rushChance: 0.25, rushForce: 1.9, rushTime: 0.7 },
    bite: { window: 0.6, nibbles: [0, 1] },
    look: { body: 0x202838, belly: 0x404858, fin: 0x303848, height: 0.5, tail: 'fork', glow: 0x60f0ff },
    hint: "On dit qu'il remonte des profondeurs les nuits calmes, loin des côtes.",
  },
  langouste: {
    name: 'Langouste',
    zone: 'tropical', method: 'trap', rarity: 'common',
    size: [25, 50], weight: [0.4, 2.5], price: 28,
    look: { body: 0xc8702a, belly: 0xe8b070, fin: 0x8a4a1a, height: 0.4 },
    hint: 'Se prend au casier près du récif.',
  },
  crabe_bleu: {
    name: 'Crabe bleu',
    zone: 'tropical', method: 'trap', rarity: 'common',
    size: [10, 22], weight: [0.2, 0.9], price: 10,
    look: { body: 0x3a6ab0, belly: 0xd8d0b0, fin: 0x2a4a80, height: 0.6 },
    hint: 'Tombe souvent dans les casiers du lagon.',
  },

  // ===================== FJORD GELÉ =====================
  morue: {
    name: 'Morue',
    zone: 'cold', habitat: 'any', rarity: 'common', net: true, ice: [6, 20],
    times: ['dawn', 'day', 'dusk', 'night'],
    size: [40, 120], weight: [0.8, 15], price: 18,
    fight: { force: 0.5, endurance: 9, pattern: 'steady', rushChance: 0.1, rushForce: 1.6, rushTime: 1.2 },
    bite: { window: 0.9, nibbles: [0, 2] },
    look: { body: 0x8a8460, belly: 0xd8d4c0, fin: 0x6a6448, height: 0.32, tail: 'round', spots: true },
    hint: 'Partout dans le fjord, à toute heure. Aussi sous la glace.',
  },
  hareng: {
    name: 'Hareng',
    zone: 'cold', habitat: 'open', rarity: 'common', net: true,
    times: ['dawn', 'day'],
    size: [18, 35], weight: [0.1, 0.6], price: 6,
    fight: { force: 0.2, endurance: 3, pattern: 'erratic', rushChance: 0.2, rushForce: 1.5, rushTime: 0.5 },
    bite: { window: 0.6, nibbles: [1, 3] },
    look: { body: 0x5a7a9a, belly: 0xd8e0e8, fin: 0x4a6a8a, height: 0.26, tail: 'fork' },
    hint: 'En bancs au large du fjord, le jour. Idéal pour les filets.',
  },
  omble: {
    name: 'Omble chevalier',
    zone: 'cold', habitat: 'ice', rarity: 'uncommon', ice: [3, 12],
    times: ['dawn', 'day', 'dusk'],
    size: [30, 80], weight: [0.4, 8], price: 36,
    fight: { force: 0.45, endurance: 8, pattern: 'erratic', rushChance: 0.15, rushForce: 1.7, rushTime: 0.9 },
    bite: { window: 0.75, nibbles: [1, 2] },
    look: { body: 0x4a6a5a, belly: 0xe07040, fin: 0xd06040, height: 0.3, tail: 'fork', spots: true },
    hint: "Sous la glace, entre 3 et 12 m, de l'aube au crépuscule.",
  },
  fletan: {
    name: 'Flétan',
    zone: 'cold', habitat: 'any', rarity: 'uncommon', ice: [18, 30],
    times: ['dawn', 'day', 'dusk', 'night'],
    size: [60, 220], weight: [3, 120], price: 58,
    fight: { force: 0.8, endurance: 14, pattern: 'diver', rushChance: 0.1, rushForce: 1.8, rushTime: 2.0 },
    bite: { window: 1.0, nibbles: [1, 3] },
    look: { body: 0x5a5040, belly: 0xe8e0d0, fin: 0x4a4030, height: 0.55, tail: 'round' },
    hint: 'Énorme poisson plat des grands fonds. Sous la glace, au-delà de 18 m.',
  },
  loup: {
    name: 'Loup de mer',
    zone: 'cold', habitat: 'reef', rarity: 'uncommon',
    times: ['dusk', 'night'],
    size: [40, 130], weight: [1, 20], price: 44,
    fight: { force: 0.65, endurance: 10, pattern: 'erratic', rushChance: 0.2, rushForce: 1.7, rushTime: 1.0 },
    bite: { window: 0.8, nibbles: [0, 2] },
    look: { body: 0x6a7078, belly: 0x9aa0a8, fin: 0x5a6068, height: 0.22, tail: 'round', stripes: true },
    hint: 'Près des falaises, à la tombée de la nuit. Mâchoire redoutable.',
  },
  lotte: {
    name: 'Lotte des glaces',
    zone: 'cold', habitat: 'ice', rarity: 'rare', ice: [20, 30],
    times: ['night'],
    size: [40, 100], weight: [1, 10], price: 95,
    fight: { force: 0.55, endurance: 10, pattern: 'diver', rushChance: 0.15, rushForce: 1.8, rushTime: 1.5 },
    bite: { window: 0.7, nibbles: [1, 2] },
    look: { body: 0x5a5030, belly: 0x8a8060, fin: 0x4a4020, height: 0.2, tail: 'eel', spots: true },
    hint: 'Ne mord que la nuit, tout au fond, sous la glace.',
  },
  crabe_royal: {
    name: 'Crabe royal',
    zone: 'cold', method: 'trap', rarity: 'uncommon',
    size: [15, 28], weight: [1, 6], price: 48,
    look: { body: 0xb04030, belly: 0xe09060, fin: 0x903020, height: 0.6 },
    hint: 'Se prend au casier dans le fjord. Très recherché.',
  },
  crevette_nordique: {
    name: 'Crevette nordique',
    zone: 'cold', method: 'trap', rarity: 'common',
    size: [8, 14], weight: [0.05, 0.1], price: 7,
    look: { body: 0xe08a8a, belly: 0xf0c0b0, fin: 0xc06a6a, height: 0.4 },
    hint: 'Remplit vite les casiers du fjord.',
  },

  // ===================== HAUTE MER =====================
  thon: {
    name: 'Thon rouge',
    zone: 'abyss', habitat: 'open', rarity: 'uncommon',
    times: ['dawn', 'day'],
    size: [100, 300], weight: [20, 400], price: 130,
    fight: { force: 0.95, endurance: 18, pattern: 'steady', rushChance: 0.25, rushForce: 1.7, rushTime: 2.5 },
    bite: { window: 0.7, nibbles: [0, 1] },
    look: { body: 0x203a6a, belly: 0xd8dce8, fin: 0xe0c040, height: 0.32, tail: 'fork' },
    hint: 'Puissant et infatigable. Chasse en plein jour au large.',
  },
  espadon: {
    name: 'Espadon',
    zone: 'abyss', habitat: 'open', rarity: 'rare',
    times: ['dusk', 'night'],
    size: [150, 450], weight: [30, 500], price: 240,
    fight: { force: 1.0, endurance: 16, pattern: 'jumper', rushChance: 0.3, rushForce: 1.9, rushTime: 1.2 },
    bite: { window: 0.6, nibbles: [0, 1] },
    look: { body: 0x3a3a5a, belly: 0xb8b8c8, fin: 0x2a2a4a, height: 0.22, tail: 'fork', bill: true },
    hint: "Saute hors de l'eau au crépuscule. Prudence avec le fil.",
  },
  hache: {
    name: 'Poisson-hache',
    zone: 'abyss', habitat: 'open', rarity: 'common', net: true,
    times: ['dusk', 'night'],
    size: [8, 18], weight: [0.05, 0.2], price: 22,
    fight: { force: 0.2, endurance: 3, pattern: 'erratic', rushChance: 0.2, rushForce: 1.5, rushTime: 0.5 },
    bite: { window: 0.7, nibbles: [1, 2] },
    look: { body: 0xa8b0c0, belly: 0xe0e8f0, fin: 0x606878, height: 0.85, tail: 'fork', glow: 0x80d0ff },
    hint: 'Remonte des profondeurs la nuit. Il brille faiblement.',
  },
  baudroie: {
    name: 'Baudroie abyssale',
    zone: 'abyss', habitat: 'any', rarity: 'uncommon',
    times: ['night'],
    size: [20, 100], weight: [0.5, 30], price: 95,
    fight: { force: 0.6, endurance: 11, pattern: 'diver', rushChance: 0.12, rushForce: 1.8, rushTime: 1.6 },
    bite: { window: 0.9, nibbles: [1, 3] },
    look: { body: 0x2a1e1a, belly: 0x3a2e28, fin: 0x1a1210, height: 0.7, tail: 'round', glow: 0xa0ff80 },
    hint: 'Sa lumière attire les imprudents. Ne mord que la nuit.',
  },
  requin_lezard: {
    name: 'Requin-lézard',
    zone: 'abyss', habitat: 'open', rarity: 'rare',
    times: ['night'],
    size: [100, 200], weight: [5, 20], price: 260,
    fight: { force: 0.85, endurance: 14, pattern: 'erratic', rushChance: 0.25, rushForce: 1.9, rushTime: 1.2 },
    bite: { window: 0.6, nibbles: [0, 1] },
    look: { body: 0x4a4038, belly: 0x6a6058, fin: 0x3a3028, height: 0.16, tail: 'eel' },
    hint: "Un fossile vivant. Personne ne l'a jamais vu de jour.",
  },
  coelacanthe: {
    name: 'Cœlacanthe',
    zone: 'abyss', habitat: 'any', rarity: 'rare',
    times: ['dawn', 'dusk'],
    size: [100, 200], weight: [30, 90], price: 320,
    fight: { force: 0.9, endurance: 15, pattern: 'diver', rushChance: 0.15, rushForce: 1.8, rushTime: 2.0 },
    bite: { window: 0.9, nibbles: [1, 2] },
    look: { body: 0x2a3a5a, belly: 0x4a5a7a, fin: 0x3a4a6a, height: 0.38, tail: 'fan', spots: true },
    hint: "On le croyait disparu depuis des millions d'années. Aube et crépuscule.",
  },
  isopode: {
    name: 'Isopode géant',
    zone: 'abyss', method: 'trap', rarity: 'uncommon',
    size: [20, 45], weight: [0.5, 1.7], price: 65,
    look: { body: 0x8a8098, belly: 0xb0a8c0, fin: 0x6a6078, height: 0.5 },
    hint: 'Remonte dans les casiers posés en haute mer. Plutôt dérangeant.',
  },
};
