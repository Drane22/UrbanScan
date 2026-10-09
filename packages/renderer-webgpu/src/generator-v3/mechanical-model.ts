import type { SeedModel } from "../seed-model.js";
import {
  box,
  face,
  packFacetedWorld,
  worldRandom,
  type Mesh,
  type Vec3,
  type FacetedPart,
} from "./faceted-mesh.js";
import { createGearPair, createSliderLinkage, GEAR_MODULE } from "./mechanical-motion.js";

/** Extruded annulus with a real opening and four root/flank/top samples per tooth. */
export function gearMesh(
  center: Vec3,
  radius: number,
  teeth: number,
  hole: number,
  thickness: number,
  material = 1,
): Mesh {
  const mesh: Mesh = [];
  const segments = teeth > 0 ? teeth * 4 : 24;
  const point = (i: number, outer: boolean, front: boolean): Vec3 => {
    const a = ((i - (teeth > 0 ? 0.5 : 0)) * Math.PI * 2) / segments;
    const r = outer ? radius + (teeth > 0 ? [1, 1, -1, -1][i % 4]! * GEAR_MODULE * 0.43 : 0) : hole;
    return [
      center[0] + Math.cos(a) * r,
      center[1] + Math.sin(a) * r,
      center[2] + ((front ? -1 : 1) * thickness) / 2,
    ];
  };
  for (let i = 0; i < segments; i++) {
    const a = point(i, true, true),
      b = point(i + 1, true, true),
      c = point(i + 1, false, true),
      d = point(i, false, true);
    const e = point(i, true, false),
      f = point(i + 1, true, false),
      g = point(i + 1, false, false),
      h = point(i, false, false);
    face(mesh, a, d, c, b, material);
    face(mesh, e, f, g, h, material);
    face(mesh, a, b, f, e, material);
    face(mesh, d, h, g, c, material);
  }
  return mesh;
}

function beam(mesh: Mesh, a: Vec3, b: Vec3, width: number, depth: number, material: number) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    length = Math.hypot(dx, dy);
  if (length < 1e-8 || Math.abs(a[2] - b[2]) > 1e-8)
    throw new RangeError("Invalid planar beam endpoints");
  const local: Mesh = [];
  box(local, [length / 2, 0, 0], [length, width, depth], material);
  for (let i = 0; i < local.length; i += 8) {
    const x = local[i]!,
      y = local[i + 1]!,
      nx = local[i + 4]!,
      ny = local[i + 5]!;
    local[i] = a[0] + (x * dx) / length - (y * dy) / length;
    local[i + 1] = a[1] + (x * dy) / length + (y * dx) / length;
    local[i + 2] = a[2] + local[i + 2]!;
    local[i + 4] = (nx * dx) / length - (ny * dy) / length;
    local[i + 5] = (nx * dy) / length + (ny * dx) / length;
  }
  mesh.push(...local);
}

export function createMechanicalLayout(model: SeedModel) {
  const next = worldRandom(model, 0x4d454333);
  const pair = createGearPair(next() < 0.5 ? 20 : 24, next() < 0.5 ? 12 : 16);
  const shift = (next() - 0.5) * 0.055;
  const driver: Vec3 = [-0.22 + shift, 0.265 + next() * 0.025, -0.075];
  const follower: Vec3 = [driver[0] + pair.centerDistance, driver[1], driver[2]];
  const crank: Vec3 = [driver[0], driver[1], -0.285];
  const linkage = createSliderLinkage(0.045 + next() * 0.012, 0.39 + next() * 0.018);
  const phase = next() * Math.PI * 2;
  const parts: FacetedPart[] = [];
  const base: Mesh = [];
  box(base, [0, -0.033, 0], [0.98, 0.065, 0.9], 0);
  parts.push({ mesh: base });
  const frame: Mesh = [];
  for (const axle of [driver, follower]) {
    box(frame, [axle[0], 0.035, 0.07], [0.115, 0.045, 0.22], 2);
    box(frame, [axle[0], axle[1] / 2, 0.07], [0.047, axle[1], 0.06], 2);
    box(frame, [axle[0], axle[1], -0.015], [0.026, 0.026, 0.29], 1);
  }
  box(
    frame,
    [(driver[0] + follower[0]) / 2, 0.065, 0.12],
    [pair.centerDistance + 0.11, 0.045, 0.04],
    2,
  );
  parts.push({ mesh: frame });
  const rotating = (mesh: Mesh, pivot: Vec3, ratio = 1, offset = phase) =>
    parts.push({ mesh, pivot, motion: 1, ratio, phase: offset });
  rotating(gearMesh(driver, pair.driverRadius, pair.driverTeeth, 0.035, 0.04), driver);
  rotating(
    gearMesh(follower, pair.followerRadius, pair.followerTeeth, 0.027, 0.04),
    follower,
    -pair.driverTeeth / pair.followerTeeth,
    (-phase * pair.driverTeeth) / pair.followerTeeth + pair.engagementPhase,
  );
  // An open flywheel behind the large gear shares its shaft and angular motion.
  const flyCenter: Vec3 = [driver[0], driver[1], 0.09];
  const flywheel = gearMesh(
    flyCenter,
    pair.driverRadius + 0.038,
    0,
    pair.driverRadius + 0.012,
    0.035,
    2,
  );
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    beam(
      flywheel,
      flyCenter,
      [
        flyCenter[0] + Math.cos(angle) * (pair.driverRadius + 0.013),
        flyCenter[1] + Math.sin(angle) * (pair.driverRadius + 0.013),
        flyCenter[2],
      ],
      0.019,
      0.022,
      2,
    );
  }
  rotating(flywheel, flyCenter);
  const crankArm: Mesh = [];
  beam(crankArm, crank, [crank[0] + linkage.radius, crank[1], crank[2]], 0.024, 0.025, 3);
  box(crankArm, [crank[0] + linkage.radius, crank[1], crank[2] - 0.012], [0.024, 0.024, 0.025], 1);
  rotating(crankArm, crank);
  // Main axle extends to the crank face; crank, rod and piston use the same phase.
  const shaft: Mesh = [];
  box(shaft, [driver[0], driver[1], -0.16], [0.023, 0.023, 0.27], 1);
  parts.push({ mesh: shaft });
  const rod: Mesh = [];
  beam(rod, crank, [crank[0] + linkage.rodLength, crank[1], crank[2]], 0.019, 0.024, 1);
  const parameters = [linkage.radius, linkage.rodLength, 0, 0] as const;
  parts.push({ mesh: rod, pivot: crank, motion: 3, phase, parameters });
  const slider: Mesh = [];
  box(slider, [crank[0] + linkage.rodLength, crank[1], crank[2]], [0.095, 0.065, 0.075], 3);
  box(slider, [crank[0] + linkage.rodLength + 0.07, crank[1], crank[2]], [0.14, 0.019, 0.019], 1);
  parts.push({ mesh: slider, pivot: crank, motion: 2, phase, parameters });
  const rail: Mesh = [];
  for (const z of [-0.34, -0.23]) box(rail, [0.2, crank[1] - 0.05, z], [0.39, 0.024, 0.025], 1);
  for (const x of [0.07, 0.35])
    box(rail, [x, (crank[1] - 0.055) / 2, -0.285], [0.035, crank[1] - 0.055, 0.15], 2);
  parts.push({ mesh: rail });
  // A secondary motor connects to the follower via two equal-radius pulleys.
  const motor: Vec3 = [0.3 + shift, 0.145, 0.18];
  const housing: Mesh = [];
  box(housing, [motor[0], 0.08, 0.28], [0.2, 0.16, 0.21], 2);
  for (let i = 0; i < 4; i++)
    box(housing, [motor[0] - 0.072 + i * 0.048, 0.166, 0.28], [0.014, 0.014, 0.17], 1);
  parts.push({ mesh: housing });
  const pulleyA: Vec3 = [follower[0], follower[1], motor[2]];
  const ratio = -pair.driverTeeth / pair.followerTeeth;
  for (const center of [pulleyA, motor]) {
    const wheel = gearMesh(center, 0.049, 0, 0.021, 0.02, 1);
    beam(wheel, center, [center[0] + 0.045, center[1], center[2]], 0.014, 0.021, 3);
    rotating(
      wheel,
      center,
      ratio,
      (-phase * pair.driverTeeth) / pair.followerTeeth + pair.engagementPhase,
    );
  }
  const belt: Mesh = [];
  const dx = motor[0] - pulleyA[0],
    dy = motor[1] - pulleyA[1],
    length = Math.hypot(dx, dy);
  const nx = -dy / length,
    ny = dx / length;
  const beltEndpoints: Vec3[][] = [];
  for (const sign of [-1, 1]) {
    const a: Vec3 = [pulleyA[0] + nx * 0.051 * sign, pulleyA[1] + ny * 0.051 * sign, motor[2]];
    const b: Vec3 = [motor[0] + nx * 0.051 * sign, motor[1] + ny * 0.051 * sign, motor[2]];
    beam(belt, a, b, 0.01, 0.026, 4);
    beltEndpoints.push([a, b]);
  }
  // Semicircular returns close the belt around the outside of each pulley.
  const heading = Math.atan2(dy, dx);
  for (const [index, center] of [pulleyA, motor].entries()) {
    const start = heading + Math.PI / 2 + (index === 0 ? 0 : Math.PI);
    for (let i = 0; i < 12; i++) {
      const point = (a: number): Vec3 => [
        center[0] + Math.cos(a) * 0.051,
        center[1] + Math.sin(a) * 0.051,
        center[2],
      ];
      beam(
        belt,
        point(start + (i * Math.PI) / 12),
        point(start + ((i + 1) * Math.PI) / 12),
        0.01,
        0.026,
        4,
      );
    }
  }
  parts.push({ mesh: belt });
  const rearShaft: Mesh = [];
  box(rearShaft, [follower[0], follower[1], 0.07], [0.024, 0.024, 0.24], 1);
  parts.push({ mesh: rearShaft });
  return {
    ...packFacetedWorld(model, "mechanical", parts),
    pair,
    linkage,
    driver,
    follower,
    crank,
    phase,
    beltEndpoints,
    pulleys: [pulleyA, motor],
    parts,
  };
}
