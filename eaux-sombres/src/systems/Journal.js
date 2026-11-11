// Carnet de pêche : espèces attrapées, record de taille, où et quand.
// (L'écran du carnet arrive en phase 3 ; les données sont déjà enregistrées.)

// Renvoie true si c'est une nouvelle espèce.
export function recordCatch(state, c) {
  const entry = state.journal[c.id];
  if (!entry) {
    state.journal[c.id] = {
      count: 1,
      maxSize: c.size,
      firstDay: c.day ?? state.time.day,
      zones: [c.zone],
      phases: [c.phase],
    };
    return true;
  }
  entry.count++;
  if (c.size > entry.maxSize) entry.maxSize = c.size;
  if (c.zone && !entry.zones.includes(c.zone)) entry.zones.push(c.zone);
  if (c.phase && !entry.phases.includes(c.phase)) entry.phases.push(c.phase);
  return false;
}

export function isRecord(state, c) {
  const entry = state.journal[c.id];
  return !!entry && c.size > entry.maxSize;
}
