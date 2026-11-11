// Le pêcheur (low-poly) : n'apparaît que sur la banquise, près du trou de pêche.
// Il regarde vers +Z local ; ses mains sont en (0.25, 1.15, 0.35).
import { MeshBuilder } from '../render/MeshBuilder.js';

export const HAND = [0.25, 1.15, 0.35];

export function buildFisher() {
  const b = new MeshBuilder({ jitter: 0.02 });
  for (const x of [-0.13, 0.13]) {
    b.box('paint', [x, 0.4, 0], [0.17, 0.8, 0.2], 0x2a3040);          // jambes
    b.box('paint', [x, 0.05, 0.04], [0.19, 0.12, 0.28], 0x1a1a1a);    // bottes
  }
  b.box('paint', [0, 1.15, 0], [0.56, 0.78, 0.36], 0xd86a20);         // parka
  b.box('paint', [0, 1.5, -0.12], [0.4, 0.2, 0.14], 0xb85a18);        // capuche
  for (const x of [-0.32, 0.32]) b.box('paint', [x, 1.15, 0.16], [0.14, 0.16, 0.5], 0xd86a20); // bras
  b.box('paint', [0, 1.72, 0], [0.3, 0.32, 0.3], 0xe8c0a0);           // tête
  b.box('paint', [0, 1.93, 0], [0.34, 0.14, 0.34], 0x8a2a2a);         // bonnet
  b.box('flat', [-0.07, 1.75, 0.16], [0.05, 0.05, 0.02], 0x101010);   // yeux
  b.box('flat', [0.07, 1.75, 0.16], [0.05, 0.05, 0.02], 0x101010);
  b.cylinder('metal', [-0.65, 0.22, 0.2], 0.2, 0.17, 0.44, 7, 0x6a7a8a); // seau
  b.box('wood', [0.6, 0.6, -0.1], [0.08, 1.2, 0.08], 0x7a5a3a);       // tarière plantée dans la glace
  b.box('metal', [0.6, 1.22, -0.1], [0.4, 0.06, 0.06], 0x404040);
  return b.build();
}
