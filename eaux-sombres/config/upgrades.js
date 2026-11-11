// =====================================================================
//  AMÉLIORATIONS DU BATEAU ET SERVICES DU PORT
//  Chaque type a une liste de niveaux ; le niveau 1 (index 0) est celui de départ.
//  Atteindre un niveau ajoute le déblocage « type_N » (ex. hull_2) utilisé par config/zones.js.
// =====================================================================

export const UPGRADES = {
  engine: {
    name: 'Moteur',
    levels: [
      { name: 'Hors-bord 15 ch', maxSpeed: 9, accel: 3.2, tank: 40, consumption: 0.12, price: 0 },
      { name: 'Hors-bord 30 ch', maxSpeed: 11, accel: 3.8, tank: 60, consumption: 0.13, price: 600 },
      { name: 'Diesel 60 ch', maxSpeed: 13, accel: 4.4, tank: 100, consumption: 0.14, price: 1800 },
      { name: 'In-bord 120 ch', maxSpeed: 15, accel: 5.0, tank: 160, consumption: 0.15, price: 4500 },
    ],
  },
  hull: {
    name: 'Coque',
    levels: [
      // coldResist : réduit l'usure due au froid (1 = insensible)
      { name: 'Coque en bois', hp: 100, armor: 0, coldResist: 0, price: 0 },
      { name: 'Coque renforcée', hp: 160, armor: 0.25, coldResist: 0.6, price: 900 },
      { name: 'Coque en acier', hp: 250, armor: 0.5, coldResist: 1, price: 3000 },
    ],
  },
  lights: {
    name: 'Éclairage',
    // nightBite : vitesse des touches la nuit (1 = comme le jour)
    levels: [
      { name: 'Lanterne à pétrole', range: 14, intensity: 1.0, nightBite: 0.6, price: 0 },
      { name: 'Projecteur de pont', range: 22, intensity: 1.4, nightBite: 0.85, price: 400 },
      { name: 'Phares halogènes', range: 32, intensity: 1.8, nightBite: 1.0, price: 1400 },
    ],
  },
  hold: {
    name: 'Cale',
    levels: [
      { name: 'Caisse 4×3', cols: 4, rows: 3, price: 0 },
      { name: 'Cale 5×4', cols: 5, rows: 4, price: 500 },
      { name: 'Grande cale 6×5', cols: 6, rows: 5, price: 1600 },
      { name: 'Cale réfrigérée 7×6', cols: 7, rows: 6, price: 4000 },
    ],
  },
  traps: {
    name: 'Casiers',
    levels: [
      { name: 'Aucun casier', count: 0, price: 0 },
      { name: '2 casiers', count: 2, price: 250 },
      { name: '4 casiers', count: 4, price: 800 },
      { name: '6 casiers', count: 6, price: 2000 },
    ],
  },
  nets: {
    name: 'Filets',
    levels: [
      { name: 'Aucun filet', count: 0, price: 0 },
      { name: '1 filet', count: 1, price: 500 },
      { name: '2 filets', count: 2, price: 1500 },
    ],
  },
};

// Ce que débloquent certains niveaux (affiché dans la boutique).
export const UNLOCK_NOTES = {
  hull_2: 'Débloque le Fjord Gelé',
  engine_3: 'Débloque la Haute Mer',
};

export const SERVICES = {
  fuelPrice: 1.5,      // pièces par litre
  repairPrice: 2,      // pièces par point de coque
  towFeeRatio: 0.2,    // remorquage : part de l'argent perdue...
  towMinFee: 30,       // ... au minimum
  baitPack: 10,        // nombre d'appâts par achat
};
