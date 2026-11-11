// Point d'entrée : assemble les systèmes et fait tourner la boucle de jeu.
import './core/setup.js';
import * as THREE from 'three';
import { BALANCE } from '../config/balance.js';
import { WORLD, ZONES } from '../config/zones.js';
import { bus } from './core/EventBus.js';
import { Input } from './core/Input.js';
import { Clock } from './core/Clock.js';
import { createNewState } from './core/GameState.js';
import { Renderer } from './render/Renderer.js';
import { GLOBAL } from './render/PS1Material.js';
import { PointSprites } from './render/PointSprites.js';
import { CameraRig } from './render/CameraRig.js';
import { Ocean } from './world/Ocean.js';
import { Sky } from './world/Sky.js';
import { Zones } from './world/Zones.js';
import { Port } from './world/Port.js';
import { Props } from './world/Props.js';
import { buildCold, buildAbyss } from './world/ZoneProps.js';
import { Boat, LAMP_LABELS } from './entities/Boat.js';
import { FishSpawner } from './systems/FishSpawner.js';
import { Fishing, S as FISHING } from './systems/Fishing.js';
import { Inventory } from './systems/Inventory.js';
import { Economy } from './systems/Economy.js';
import { Traps } from './systems/Traps.js';
import { boatStats, refreshUnlocks } from './systems/Upgrades.js';
import { saveGame, loadGame, clearSave, useSlot } from './systems/Save.js';
import { CREATOR, applyCreator, creatorTick } from './systems/Creator.js';
import { Audio } from './audio/Audio.js';
import { HUD } from './ui/HUD.js';
import { drawFishingUI } from './ui/FishingUI.js';
import { CatchShowcase } from './ui/CatchShowcase.js';
import { PortMenu } from './ui/PortMenu.js';
import { HoldMenu } from './ui/HoldMenu.js';
import { JournalMenu } from './ui/JournalMenu.js';
import { PauseMenu } from './ui/PauseMenu.js';

const PHASE_MESSAGES = {
  dawn: "L'aube se lève sur le lagon.",
  day: 'Le soleil est haut.',
  dusk: 'Le soleil se couche...',
  night: 'La nuit tombe sur la mer.',
};

// Entrée « vide » : utilisée quand le bateau ne doit pas réagir (pêche, menu).
const NO_INPUT = { down: () => false, pressed: () => false };

async function boot() {
  if (CREATOR) useSlot('.createur'); // le mode créateur a sa propre sauvegarde
  const loaded = loadGame();
  const state = loaded || createNewState();
  refreshUnlocks(state);
  if (CREATOR) applyCreator(state);

  const input = new Input();
  await input.loadLayout();

  const renderer = new Renderer(document.getElementById('game'), BALANCE.render);
  if (!state.settings.ps1) renderer.setPS1(false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(BALANCE.render.fov, window.innerWidth / window.innerHeight, 0.1, BALANCE.render.far);

  const audio = new Audio(BALANCE.audio);
  audio.muted = !!state.settings.muted;
  const clock = new Clock(state, BALANCE.time);
  const glows = new PointSprites(scene, 256, { additive: true, soft: true, fogAmount: 0.3, renderOrder: 3 });
  const sky = new Sky(scene);
  const ocean = new Ocean(scene);
  const zones = new Zones(state);
  const port = new Port(scene, glows);
  const props = new Props(scene, glows, ocean);
  const cold = buildCold(scene, glows);
  const abyss = buildAbyss(scene, glows);
  const boat = CREATOR
    ? new Boat(scene, state, ocean, glows, BALANCE.creator.boatModel, BALANCE.creator.boatName)
    : new Boat(scene, state, ocean, glows);
  const rig = new CameraRig(camera, BALANCE.camera);
  const hud = new HUD(document.getElementById('ui'), input, BALANCE.render);

  const world = { zones, cold: false, colliders: [...port.colliders, ...props.colliders, ...cold.colliders, ...abyss.colliders] };
  const inventory = new Inventory(state);
  const economy = new Economy(state, inventory);
  const spawner = new FishSpawner(world.colliders, [...props.reefSpots, ...cold.reefSpots, ...abyss.reefSpots]);
  const fishing = new Fishing(scene, { state, ocean, boat, rig, world, audio, spawner, inventory, hud, zones, clock });
  const showcase = new CatchShowcase({ audio });
  const traps = new Traps({ scene, state, ocean, glows, zones, spawner, inventory, clock, hud, audio });

  // Lieux où l'on peut accoster pour vendre : port principal + comptoir du fjord.
  const coldZone = ZONES.find((z) => z.id === 'cold');
  const docks = [
    { ...port.dock, place: WORLD.homePort, label: 'PORT (VENDRE, BOUTIQUE)', home: true },
    { ...cold.outpost.dock, place: cold.outpost.place, label: 'COMPTOIR (VENDRE, SERVICES)', zone: coldZone },
  ];

  // Ancienne sauvegarde (phase 2) : on range les poissons dans la nouvelle cale en grille.
  if (state.repack) {
    const items = inventory.clear();
    items.forEach((f) => inventory.add(f));
    delete state.repack;
  }

  const save = (announce = false) => {
    const ok = saveGame(state);
    if (announce) hud.toast(ok ? 'Partie sauvegardée.' : 'Sauvegarde impossible !', 2);
    return ok;
  };

  const menuDeps = { hud, input, audio, state, economy, inventory };
  const portMenu = new PortMenu({ ...menuDeps, onChange: () => save() });
  const holdMenu = new HoldMenu(menuDeps);
  const journalMenu = new JournalMenu(menuDeps);
  const togglePS1 = () => {
    state.settings.ps1 = !state.settings.ps1;
    renderer.setPS1(state.settings.ps1);
    onResize();
    return state.settings.ps1;
  };
  const toggleSound = () => {
    state.settings.muted = audio.toggleMute();
    return state.settings.muted;
  };
  const pauseMenu = new PauseMenu({
    ...menuDeps,
    actions: {
      save: () => save(),
      journal: () => journalMenu.show(),
      hold: () => holdMenu.show(),
      togglePS1, toggleSound,
      isPS1: () => state.settings.ps1,
      isMuted: () => audio.muted,
      isCreator: () => CREATOR,
      // Bascule entre partie normale et mode créateur (sauvegardes séparées).
      switchMode: () => {
        save();
        window.removeEventListener('beforeunload', onUnload);
        // Le hash fonctionne partout (serveur local et page publiée).
        if (location.search) { location.href = location.pathname + (CREATOR ? '' : '#createur'); return; }
        location.hash = CREATOR ? '' : 'createur';
        location.reload();
      },
      teleports: () => [
        { label: 'PORT DU LAGON', go: () => boat.teleport(WORLD.start.x, WORLD.start.z, WORLD.start.heading) },
        { label: 'COMPTOIR DU FJORD', go: () => boat.teleport(cold.outpost.dock.x, cold.outpost.dock.z, Math.PI) },
        { label: 'BANQUISE', go: () => { const s = cold.iceSheets[0]; boat.teleport(s.x + s.r + 4, s.z, -Math.PI / 2); } },
        { label: 'HAUTE MER', go: () => boat.teleport(-2500, 500, 0) },
      ],
      teleport: (t) => { if (fishing.ice) fishing.leaveIce(); t.go(); rig.ready = false; },
      newGame: () => {
        clearSave();
        window.removeEventListener('beforeunload', onUnload);
        location.reload();
      },
    },
  });
  const menus = [pauseMenu, portMenu, holdMenu, journalMenu];

  // Le son ne peut démarrer qu'après une action du joueur.
  const unlockAudio = () => audio.unlock();
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  // Sauvegarde en quittant la page.
  const onUnload = () => save();
  window.addEventListener('beforeunload', onUnload);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  // --- Événements ---
  let elapsed = 0;
  let lastBlocked = -99;
  bus.on('zone:enter', ({ zone, prev }) => {
    if (prev || zone.subtitle) hud.banner(zone.name, zone.subtitle);
    if (zone.cold) {
      const resist = boatStats(state).coldResist;
      hud.toast(resist >= 1 ? 'Votre coque en acier ne craint pas le froid.' : 'Le froid ronge lentement la coque...', 4);
    }
  });
  bus.on('boat:lowhull', () => hud.toast('La coque souffre ! Réparez-la au comptoir ou au port.', 4));
  bus.on('time:phase', ({ phase }) => hud.toast(PHASE_MESSAGES[phase], 4));
  bus.on('time:newday', (d) => hud.toast(`Jour ${d} · nouveaux cours au marché`, 3));
  bus.on('boat:blocked', () => {
    if (elapsed - lastBlocked > 5) {
      hud.toast('Les courants sont trop forts. Il faudra un meilleur bateau.', 4);
      lastBlocked = elapsed;
    }
  });
  bus.on('boat:bump', ({ damage, hull, maxHull }) => {
    audio.play('bump');
    if (damage > 0) hud.toast(`Choc ! Coque : ${Math.round((hull / maxHull) * 100)} %`, 2);
  });
  bus.on('boat:lowfuel', () => hud.toast('Réservoir presque vide ! Rentrez au port.', 4));
  bus.on('boat:nofuel', () => hud.toast('Panne sèche ! Vous avancez à la rame...', 5));
  bus.on('boat:sunk', () => {
    // Remorquage : retour au port, cargaison perdue, frais.
    if (fishing.ice) fishing.leaveIce();
    const fee = Math.min(state.money, economy.towFee());
    state.money -= fee;
    const lost = inventory.clear().length;
    const st = boatStats(state);
    state.hull = Math.round(st.maxHull * 0.25);
    state.fuel = Math.max(state.fuel, st.tank * 0.25);
    boat.teleport(WORLD.start.x, WORLD.start.z, WORLD.start.heading);
    hud.banner('Remorqué au port', `La coque a cédé. -${fee} pièces${lost ? `, ${lost} poisson(s) perdu(s)` : ''}.`);
    save();
  });

  const onResize = () => {
    camera.aspect = renderer.resize();
    camera.updateProjectionMatrix();
    hud.resize();
  };
  window.addEventListener('resize', onResize);
  onResize();

  document.getElementById('boot').style.display = 'none';
  if (loaded) hud.toast(`Partie chargée : jour ${state.time.day}, ${state.money} pièces.`, 4);
  else hud.toast('Bienvenue au port. Larguez les amarres !', 5);

  let last = performance.now();
  let fps = 60;
  let autosave = 0;
  let wasDocked = true;
  let helpTouched = false; // l'aide se masque seule après 45 s (H la rappelle)

  // Lieu d'accostage actuel (port ou comptoir d'une zone débloquée), sinon null.
  const currentDock = () => {
    if (Math.abs(boat.speed) >= 1.5) return null;
    return docks.find((d) => (!d.zone || zones.isUnlocked(d.zone)) && Math.hypot(boat.x - d.x, boat.z - d.z) < d.r) || null;
  };
  // Plaque de banquise au bord de laquelle le bateau est arrêté.
  const iceSheetNear = () => {
    if (Math.abs(boat.speed) >= 1.5) return null;
    return cold.iceSheets.find((s) => Math.hypot(boat.x - s.x, boat.z - s.z) - s.r < BALANCE.ice.edgeRange) || null;
  };
  // Port accessible le plus proche (pour la boussole).
  const nearestPort = () => {
    let best = null, bd = Infinity;
    for (const d of docks) {
      if (d.zone && !zones.isUnlocked(d.zone)) continue;
      const dd = Math.hypot(boat.x - d.x, boat.z - d.z);
      if (dd < bd) { bd = dd; best = d; }
    }
    return best;
  };

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!window.game?.paused) step(dt);
    requestAnimationFrame(frame);
  }

  function step(dt) {
    fps += (1 / Math.max(dt, 1e-4) - fps) * 0.05;

    // --- Menus ouverts : ils captent les entrées ---
    let consumed = false;
    for (const m of menus) {
      if (m.open) { m.update(input); consumed = true; break; }
    }
    const dock = currentDock();
    const docked = !!dock;
    const nearTrap = fishing.active ? null : traps.nearest(boat);
    const sheet = fishing.active || dock ? null : iceSheetNear();
    let prompt = null;
    if (!consumed) {
      if (input.pressed('menu')) pauseMenu.show();
      else if (input.pressed('togglePS1')) hud.toast(`Effet PS1 : ${togglePS1() ? 'oui' : 'non'}`, 2);
      else if (input.pressed('mute')) hud.toast(toggleSound() ? 'Son coupé' : 'Son activé', 2);
      else if (input.pressed('timeScale')) hud.toast(`Vitesse du temps : x${clock.cycleScale()}`, 2);
      else if (input.pressed('help')) { hud.showHelp = !hud.showHelp; helpTouched = true; }
      else if (input.pressed('debug')) hud.showDebug = !hud.showDebug;
      else if (input.pressed('lamp')) hud.toast(`Lanterne : ${boat.cycleLamp()}`, 2);
      else if (!fishing.active) {
        if (input.pressed('hold')) holdMenu.show();
        else if (input.pressed('journal')) journalMenu.show();
        else if (input.pressed('trap')) { if (traps.place('trap', boat)) save(); }
        else if (input.pressed('net')) { if (traps.place('net', boat)) save(); }
        else if (input.pressed('interact')) {
          if (nearTrap) { traps.retrieve(nearTrap); save(); }
          else if (dock) portMenu.show(inventory.count ? 0 : 1, dock.place);
          else if (sheet) fishing.startIce(sheet);
        }
      }
      if (!fishing.active && !portMenu.open) {
        const E = input.label('interact');
        if (nearTrap) prompt = `${E} : RELEVER · ${traps.describe(nearTrap)}`;
        else if (dock) prompt = `${E} : ${dock.label}`;
        else if (sheet) prompt = `${E} : DESCENDRE SUR LA GLACE`;
      }
    }
    const inMenu = consumed || menus.some((m) => m.open);
    const paused = pauseMenu.open;

    // Arrivée au port : sauvegarde automatique.
    if (docked && !wasDocked) save(true);
    wasDocked = docked;

    // --- Simulation (arrêtée en pause ; le temps ne passe pas dans les menus) ---
    if (!paused) {
      elapsed += dt;
      GLOBAL.uTime.value = elapsed;
      if (!helpTouched && elapsed > 45) { hud.showHelp = false; helpTouched = true; }
      if (CREATOR) creatorTick(state);
      if (!inMenu) clock.update(dt);
      zones.update(boat.x, boat.z);
      world.cold = !!zones.current?.cold;
      boat.update(dt, fishing.active || inMenu ? NO_INPUT : input, world);
      fishing.update(dt, inMenu ? NO_INPUT_FISH : input, !inMenu);
      port.update(dt, GLOBAL.uNight.value);
      props.update(elapsed);
      traps.update(elapsed);
      showcase.update(dt, fishing);
      autosave += dt;
      if (autosave > BALANCE.save.autosaveSeconds && !fishing.active) {
        autosave = 0;
        save();
      }
    }
    rig.update(dt, inMenu ? NO_INPUT_CAM : input, fishing.cameraTarget(), ocean);
    sky.update(clock.hour, camera, zones.env);
    ocean.update(camera.position.x, camera.position.z, zones.env.seabed);
    glows.update();
    audio.update(dt, {
      speed: paused ? 0 : boat.speed,
      maxSpeed: boat.stats ? boat.stats.maxSpeed : 9,
      waveScale: GLOBAL.uWaveScale.value,
      boundary: zones.boundary,
      reeling: !inMenu && fishing.mode === FISHING.FIGHT && fishing.fight?.reeling,
      tension: fishing.fight && !paused ? fishing.fight.T : 0,
    });

    // --- Rendu ---
    renderer.render(scene, camera, showcase);
    hud.update(dt);
    hud.draw({
      clock,
      state,
      creator: CREATOR,
      zoneName: zones.current ? zones.current.name : '',
      boat,
      inventory,
      money: state.money,
      lampLabel: LAMP_LABELS[boat.lampMode],
      bearing: rig.bearing,
      port: nearestPort() || { x: WORLD.port.x, z: WORLD.port.z - WORLD.port.radius },
      markers: traps.markers(),
      ps1: state.settings.ps1,
      muted: audio.muted,
      timeScale: clock.timeScale,
      fps,
      res: [renderer.width, renderer.height],
      busy: fishing.active || inMenu,
      hideHud: showcase.active && !inMenu,
      prompt: inMenu ? null : prompt,
      overlays: [
        (h) => { if (!inMenu) drawFishingUI(h, fishing, inventory, input); },
        (h) => { if (!inMenu) showcase.draw(h, inventory); },
        ...menus.map((m) => (h) => m.draw(h)),
      ],
    });

    input.endFrame();
  }
  requestAnimationFrame(frame);

  // Accès console pour le debug : window.game.state, game.step(1/60)...
  window.game = {
    state, clock, boat, zones, renderer, scene, camera, rig, fishing, inventory, economy, spawner, audio, step,
    menus: { portMenu, holdMenu, journalMenu, pauseMenu }, save, hud, traps, cold, abyss,
  };
}

// Entrées neutres pour la pêche et la caméra pendant un menu.
const NO_INPUT_FISH = {
  down: () => false, pressed: () => false, leftHeld: false, leftClicked: false,
  mouse: { dx: 0, dy: 0, wheel: 0, buttons: 0, clicked: new Set() },
};
const NO_INPUT_CAM = { cameraDrag: false, mouse: { dx: 0, dy: 0, wheel: 0 } };

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById('boot');
  el.style.display = 'flex';
  el.textContent = 'Erreur au démarrage : ' + err.message;
});
