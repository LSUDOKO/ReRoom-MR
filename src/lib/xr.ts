// Pure maths for the Quest experience (src/components/xr/MRRoom.tsx), kept free of three.js and
// React so `pnpm test` can check it directly.

type V3 = { x: number; y: number; z: number };

/** Farthest a drag may reach, so a ray aimed near the horizon can't fling a piece across the room. */
export const MAX_DRAG_M = 6;

/**
 * Where a hand ray meets the floor (y = 0), as [x, z], or null when it doesn't: the ray points up or
 * runs parallel to the floor, or the hit is beyond MAX_DRAG_M from the room origin.
 */
export function floorPoint(origin: V3, dir: V3): [number, number] | null {
  if (dir.y >= -1e-6) return null;
  const t = -origin.y / dir.y;
  if (t < 0) return null;
  const x = origin.x + t * dir.x, z = origin.z + t * dir.z;
  return Math.hypot(x, z) > MAX_DRAG_M ? null : [x, z];
}

/** Where the nth placed piece lands: rows of three, 1.1 m apart, starting 2.1 m in front of a seated user. */
export const spawnSlot = (n: number) => ({ x: ((n % 3) - 1) * 1.1, z: -2.1 - Math.floor(n / 3) * 0.9 });

/** A joint's fully open value from its URDF limits: whichever limit moves further from closed. */
export function jointTarget(type: string, lower: number, upper: number): number {
  if (type === "continuous") return Math.PI / 2;
  return Math.abs(upper) >= Math.abs(lower) ? upper : lower;
}

/** Height of a piece's floating controls: above the piece and above the tray's line of sight. */
export const controlsHeight = (pieceHeight: number) => Math.max(pieceHeight + 0.25, 1.55);
