/**
 * iso.mjs — Home World v0.2 canonical isometric primitive library.
 *
 * The ONLY projection allowed in the world:
 *
 *      screen(u, v) = ( ORIGIN.x + u - v ,  ORIGIN.y + (u + v) * 0.5 )
 *
 * Consequences (enforced by tools/validate-home-world.mjs):
 *   - every ground-plane edge has slope +0.5 or -0.5  (26.565 deg)
 *   - a plan axis-aligned square of half-size `a` projects to a diamond
 *     with screen half-width 2a and screen half-height a
 *   - height (Z) projects straight down on screen (+y)
 *
 * No element may use 0deg / 90deg rotation as a ground-plane transform.
 */

export const ORIGIN = { x: 800, y: 505 };

/** plan -> screen */
export function S(u, v, elev = 0) {
  return [ORIGIN.x + u - v, ORIGIN.y + (u + v) * 0.5 + elev];
}

const r2 = (n) => Math.round(n * 100) / 100;

/** [[x,y],...] -> "x,y x,y" */
export function poly(points) {
  return points.map(([x, y]) => `${r2(x)},${r2(y)}`).join(' ');
}

/** plan square (half-size a) -> screen diamond, ordered [top, right, bottom, left] */
export function diamond(u, v, a, elev = 0) {
  return [
    S(u - a, v - a, elev),
    S(u + a, v - a, elev),
    S(u + a, v + a, elev),
    S(u - a, v + a, elev),
  ];
}

/**
 * Ground plank. `axis` is the plan axis the plank runs along.
 *   axis "u": from/to are u values, `fixed` is v
 *   axis "v": from/to are v values, `fixed` is u
 * halfWidth is in plan units; halfWidth 10 == 18px visual thickness.
 */
export function plank(axis, from, to, fixed, elev = 0, halfWidth = 10) {
  if (axis === 'u') {
    return [
      S(from, fixed - halfWidth, elev),
      S(to, fixed - halfWidth, elev),
      S(to, fixed + halfWidth, elev),
      S(from, fixed + halfWidth, elev),
    ];
  }
  return [
    S(fixed - halfWidth, from, elev),
    S(fixed + halfWidth, from, elev),
    S(fixed + halfWidth, to, elev),
    S(fixed - halfWidth, to, elev),
  ];
}

/** Iso block: top face + left/right side faces (side faces are NOT ground-plane). */
export function block(u, v, a, h, elev = 0) {
  const [T, R, B, L] = diamond(u, v, a, elev);
  const down = (p) => [p[0], p[1] + h];
  return {
    top: [T, R, B, L],
    left: [L, B, down(B), down(L)],
    right: [B, R, down(R), down(B)],
  };
}

/** Portal arch, screen space, standing on (x, y). Width 46, height 66 by default. */
export function portalArch(x, y, scale = 1) {
  const w = 46 * scale;
  const h = 66 * scale;
  const hw = w / 2;
  const x0 = x - hw;
  const x1 = x + hw;
  const yb = y;              // base
  const ys = y - h + hw;     // spring line of the arch
  const frame = `M ${r2(x0)} ${r2(yb)} L ${r2(x0)} ${r2(ys)} ` +
    `A ${r2(hw)} ${r2(hw)} 0 0 1 ${r2(x1)} ${r2(ys)} L ${r2(x1)} ${r2(yb)} Z`;
  const i = 7 * scale;
  const ix0 = x0 + i;
  const ix1 = x1 - i;
  const iys = ys + i * 0.4;
  const inner = `M ${r2(ix0)} ${r2(yb - 1)} L ${r2(ix0)} ${r2(iys)} ` +
    `A ${r2((ix1 - ix0) / 2)} ${r2((ix1 - ix0) / 2)} 0 0 1 ${r2(ix1)} ${r2(iys)} ` +
    `L ${r2(ix1)} ${r2(yb - 1)} Z`;
  return {
    shadow: { cx: x, cy: yb + 3, rx: hw * 0.92, ry: hw * 0.34 },
    frame,
    inner,
    core: { cx: x, cy: yb - h * 0.52, r: 4.6 * scale },
    width: w,
    height: h,
    x, y: yb,
  };
}

/** Mechanism pad: small iso disc + stem + ring. */
export function mechanism(u, v, elev = 0) {
  const pad = diamond(u, v, 14, elev);
  const base = pad.map(([x, y]) => [x, y + 7]);
  const [c] = [S(u, v, elev)];
  const cx = c[0];
  const cy = c[1] + 2;
  return {
    pad,
    base,
    ring: { cx, cy, r: 7.5 },
    stem: { x: cx, y: cy - 15, w: 5, h: 13 },
    core: { cx, cy: cy - 16, r: 4 },
    screen: { x: cx, y: cy },
  };
}

/** Simple iso tree: two stacked cones as screen triangles on a trunk. */
export function tree(u, v, scale = 1, elev = 0) {
  const [x, y] = S(u, v, elev);
  const s = scale;
  return {
    x, y,
    trunk: { x: x - 1.5 * s, y: y - 14 * s, w: 3 * s, h: 14 * s },
    crown: [
      [x, y - 44 * s], [x + 11 * s, y - 20 * s], [x - 11 * s, y - 20 * s],
    ],
    crown2: [
      [x, y - 34 * s], [x + 8 * s, y - 14 * s], [x - 8 * s, y - 14 * s],
    ],
  };
}
