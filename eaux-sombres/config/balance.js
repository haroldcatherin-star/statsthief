// =====================================================================
//  RÉGLAGES GLOBAUX — modifiez librement pour rééquilibrer le jeu.
// =====================================================================

export const BALANCE = {
  render: {
    lowResHeight: 240,   // résolution verticale interne (la PS1 tournait en ~240)
    uiPixelHeight: 270,  // hauteur visée de l'interface, en « gros pixels »
    colorLevels: 32,     // niveaux par canal : 32 = couleurs 15 bits comme la PS1
    dither: 1.0,         // intensité du tramage (0 = aucun)
    snap: 1.0,           // jitter des sommets (0 = désactivé, 2 = plus grossier)
    affine: 1.0,         // déformation affine des textures (0 = désactivée)
    fov: 60,
    far: 1000,
  },

  time: {
    dayLengthSeconds: 1200,         // une journée complète = 20 minutes réelles
    startHour: 5.6,                 // on commence juste avant l'aube
    startDay: 1,
    debugScales: [1, 20, 120],      // vitesses du temps (touche T)
    phases: {                       // le reste de la journée = nuit
      dawn: [5, 7],
      day: [7, 18],
      dusk: [18, 20.5],
    },
  },

  start: {
    money: 50,            // argent de départ
  },

  // Mode créateur : ouvrez http://localhost:8000/?createur
  // Tout est débloqué dès le départ, avec une sauvegarde séparée de la partie normale.
  creator: {
    money: 999999,
    infiniteFuel: true,
    invincible: true,       // la coque ne s'abîme pas
    revealJournal: true,    // toutes les espèces visibles dans le carnet
    boatModel: 'center_console',
    boatName: 'EAUX SOMBRES', // nom peint sur la coque (en majuscules, '' = aucun)
  },

  boat: {
    // vitesse max, accélération, réservoir : voir config/upgrades.js (moteur)
    model: 'trawler',     // 'trawler' (chalutier) ou 'center_console' (sport-fishing)
    name: '',             // nom peint sur la coque ('' = aucun)
    reverseSpeed: 2.5,
    brake: 5,
    drag: 0.35,
    turnRate: 1.0,        // rad/s à bonne vitesse
    minTurnFactor: 0.3,   // capacité à pivoter presque à l'arrêt
    radius: 2.3,          // rayon de collision
    length: 6.2,
    width: 2.4,
    floatOffset: 0.05,
    bobSmoothing: 3.5,    // inertie du tangage/roulis
    idleFuel: 0.03,       // part de la consommation au ralenti
    noFuelSpeed: 1.2,     // vitesse « à la rame » quand le réservoir est vide
    bumpDamage: 4,        // dégâts de coque par m/s d'impact
    minBumpImpact: 1.5,   // en dessous : pas de dégâts
  },

  // Place des poissons dans la cale selon leur taille : [taille max en cm, [largeur, hauteur]]
  hold: {
    shapes: [[35, [1, 1]], [70, [2, 1]], [110, [3, 1]], [9999, [3, 2]]],
    eelShapes: [[90, [3, 1]], [9999, [4, 1]]],
  },

  market: {
    minDaily: 0.8,           // fourchette du cours du jour par espèce
    maxDaily: 1.25,
    saturationPerFish: 0.04, // chaque poisson vendu le même jour baisse le prix de 4 %
    minSaturation: 0.6,
  },

  // Casiers et filets : ils se remplissent avec le temps de jeu (pas hors ligne).
  traps: {
    hoursPerRoll: 1,       // un tirage par heure de jeu
    chancePerRoll: 0.4,    // chance d'une prise par tirage
    capacity: 4,           // prises max dans un casier
    minSpacing: 15,        // distance min entre deux casiers/filets (m)
    pickupRange: 8,        // distance pour relever (m)
  },
  nets: {
    hoursPerRoll: 0.5,
    chancePerRoll: 0.55,
    capacity: 6,
    lifetimeHours: 30,     // au-delà, le filet est déchiré et les prises perdues
  },

  cold: {
    hullWearPerMinute: 3,  // points de coque perdus par minute réelle dans le froid (× (1 - coldResist))
  },

  ice: {
    drillTime: 2.5,        // secondes de clic maintenu pour percer la glace
    startDepth: 8,
    minDepth: 2,
    maxDepth: 30,
    depthSpeed: 5,         // m/s quand on monte/descend l'appât
    catchDepth: 1,         // le poisson est sorti à cette profondeur
    edgeRange: 9,          // distance max du bord de la banquise pour descendre sur la glace
  },

  save: {
    key: 'eaux-sombres.save',
    autosaveSeconds: 60,
  },

  fishing: {
    maxBoatSpeed: 1.0,     // vitesse max (m/s) pour pouvoir lancer
    minCast: 4,            // distance minimale du lancer (m)
    aimSpeed: 1.1,         // vitesse d'oscillation de la jauge de puissance
    waitMin: 3,            // attente avant une touche (s)
    waitMax: 9,
    slackThreshold: 0.12,  // en dessous : fil détendu
    slackTime: 1.6,        // secondes de fil détendu avant que le poisson se décroche
    catchDistance: 2.2,    // distance à laquelle le poisson est sorti de l'eau
    reelTensionBase: 0.3,  // tension quand on mouline (base)...
    reelTensionPull: 1.25, // ... + traction du poisson × ce facteur
    idleTensionPull: 0.32, // tension quand on ne mouline pas = traction × ce facteur
    habitatRange: 30,      // distance (m) à une île/rocher pour être « sur le récif »
  },

  audio: {
    master: 0.7,
    ambience: 0.8,
    sfx: 1.0,
  },

  camera: {
    distance: 12,
    minDistance: 5,
    maxDistance: 30,
    pitch: 0.32,
    minPitch: 0.04,
    maxPitch: 1.25,
    recenterDelay: 2.5,   // secondes avant que la caméra revienne derrière le bateau
    height: 1.4,
  },

  world: {
    seed: 1337,
    oceanSize: 360,
    oceanSegments: 90,
    seabedDepth: -14,
    boundaryMargin: 80,   // marge au-delà de la zone de départ avant les « courants »
  },
};
