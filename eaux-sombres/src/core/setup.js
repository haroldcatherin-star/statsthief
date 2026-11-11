// Doit être importé en premier : on travaille directement en couleurs « écran »,
// sans conversion sRGB/linéaire (la PS1 ne connaissait pas le gamma).
import * as THREE from 'three';

THREE.ColorManagement.enabled = false;
