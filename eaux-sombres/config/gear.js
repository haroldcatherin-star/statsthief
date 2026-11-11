// =====================================================================
//  MATÉRIEL DE PÊCHE — la boutique arrive en phase 3, les prix sont déjà là.
// =====================================================================

// Cannes : maxCast = portée max du lancer (m), power = multiplie la résistance du fil.
export const RODS = {
  bamboo: { name: 'Canne en bambou', maxCast: 22, power: 1.0, price: 0 },
  fiber: { name: 'Canne en fibre de verre', maxCast: 30, power: 1.2, price: 350 },
  carbon: { name: 'Canne carbone', maxCast: 40, power: 1.45, price: 1200 },
};

// Moulinets : reelSpeed = mètres de fil récupérés par seconde.
export const REELS = {
  rusty: { name: 'Moulinet rouillé', reelSpeed: 2.2, price: 0 },
  steel: { name: 'Moulinet en acier', reelSpeed: 3.0, price: 280 },
  pro: { name: 'Moulinet de compétition', reelSpeed: 4.0, price: 900 },
};

// Fils : strength = tension supportée (1 = référence), maxLength = longueur sur la bobine (m).
export const LINES = {
  nylon: { name: 'Fil nylon fin', strength: 1.0, maxLength: 45, price: 0 },
  braid: { name: 'Tresse 30 lb', strength: 1.3, maxLength: 70, price: 220 },
  steel: { name: 'Bas de ligne acier', strength: 1.7, maxLength: 90, price: 750 },
};

// Appâts : biteSpeed accélère les touches, attract multiplie le poids de certaines espèces.
//  infinite : jamais épuisé ; reusable : acheté une fois (leurre) ; sinon prix par appât, vendu par paquet.
export const BAITS = {
  worm: { name: 'Vers de sable', biteSpeed: 1.0, attract: {}, price: 0, infinite: true },
  shrimp: { name: 'Crevettes', biteSpeed: 1.2, attract: { merou: 2, vivaneau: 1.5 }, price: 4 },
  lure: { name: 'Leurre argenté', biteSpeed: 1.1, attract: { barracuda: 3 }, price: 60, reusable: true },
  glowbait: { name: 'Appât luminescent', biteSpeed: 1.0, attract: { lanterne: 4, murene: 1.5 }, price: 25 },
};

export const STARTING_GEAR = { rod: 'bamboo', reel: 'rusty', line: 'nylon', bait: 'worm' };
