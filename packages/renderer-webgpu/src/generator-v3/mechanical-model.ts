import type { SeedModel } from "../seed-model.js";
import {
  box,
  face,
  triangle,
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
  const segments = teeth > 0 ? teeth * 4 : 16;
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
    const bevel = Math.min(0.0035, thickness * 0.15, (radius - hole) * 0.15);
    const inset = (p: Vec3, amount: number): Vec3 => {
      const radial = Math.hypot(p[0] - center[0], p[1] - center[1]);
      return [
        center[0] + ((p[0] - center[0]) * (radial + amount)) / radial,
        center[1] + ((p[1] - center[1]) * (radial + amount)) / radial,
        p[2] - bevel,
      ];
    };
    const af = inset(a, -bevel),
      bf = inset(b, -bevel);
    face(mesh, af, d, c, bf, material);
    face(mesh, a, af, bf, b, material);
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

function tube(mesh: Mesh, a: Vec3, b: Vec3, radius: number, material: number, sides = 8) {
  const delta = b.map((value, i) => value - a[i]!) as unknown as Vec3;
  const length = Math.hypot(...delta);
  const axis = delta.map((value) => value / length) as unknown as Vec3;
  const cross = (u: Vec3, v: Vec3): Vec3 => [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const perpendicular = cross(axis, Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
  const size = Math.hypot(...perpendicular);
  const u = perpendicular.map((value) => value / size) as unknown as Vec3;
  const v = cross(axis, u);
  const point = (center: Vec3, i: number): Vec3 =>
    center.map(
      (value, n) =>
        value +
        radius *
          (Math.cos((i * Math.PI * 2) / sides) * u[n]! +
            Math.sin((i * Math.PI * 2) / sides) * v[n]!),
    ) as unknown as Vec3;
  for (let i = 0; i < sides; i++) {
    const p = point(a, i),
      q = point(a, i + 1),
      r = point(b, i + 1),
      s = point(b, i);
    face(mesh, p, q, r, s, material);
    triangle(mesh, a, q, p, material);
    triangle(mesh, b, s, r, material);
  }
}

export function createMechanicalLayout(model: SeedModel) {
  const next = worldRandom(model, 0x4d454333);
  // Site identity selects the machine architecture as well as its working parts.
  const architecture = ["boiler", "gantry", "turbine", "open-drive"][Math.floor(next() * 4)]!;
  const attachments = 2 + Math.floor(next() * 3);
  const driverTeeth = architecture === "open-drive" ? [12, 16, 20] : [16, 20, 24];
  const followerTeeth = architecture === "turbine" ? [12, 12, 16] : [12, 16, 20];
  const pair = createGearPair(
    driverTeeth[Math.floor(next() * 3)]!,
    followerTeeth[Math.floor(next() * 3)]!,
  );
  const shift = (next() - 0.5) * 0.12;
  const bedHeight = architecture === "open-drive" ? 0.18 : 0.23;
  const driver: Vec3 = [-0.2 + shift, bedHeight + next() * (0.235 - pair.driverRadius), -0.075];
  const follower: Vec3 = [driver[0] + pair.centerDistance, driver[1], driver[2]];
  const crank: Vec3 = [driver[0], driver[1], -0.285];
  const linkage = createSliderLinkage(0.034 + next() * 0.027, 0.3 + next() * 0.09);
  const spokeCount = 3 + Math.floor(next() * 4);
  const flySpokes = 4 + Math.floor(next() * 5);
  const pumpCount = 1 + Math.floor(next() * 3);
  const towerHeight = 0.24 + next() * 0.22;
  const phase = next() * Math.PI * 2;
  const parts: FacetedPart[] = [];
  const base: Mesh = [];
  box(base, [0, -0.027, 0.01], [0.94, 0.053, 0.8], 0);
  parts.push({ mesh: base });
  const frame: Mesh = [];
  // A common raised bed ties the two bearing towers and slider rails together.
  for (const z of [-0.355, 0.335]) box(frame, [0, 0.018, z], [0.85, 0.035, 0.04], 2);
  for (const x of [-0.405, 0.405]) box(frame, [x, 0.018, -0.01], [0.04, 0.035, 0.65], 1);
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
  const spokedGear = (center: Vec3, radius: number, teeth: number, opening: number) => {
    const mesh = gearMesh(center, radius, teeth, opening, 0.04);
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i * Math.PI * 2) / spokeCount;
      beam(
        mesh,
        center,
        [center[0] + Math.cos(angle) * opening, center[1] + Math.sin(angle) * opening, center[2]],
        0.018,
        0.04,
        1,
      );
    }
    return mesh;
  };
  rotating(spokedGear(driver, pair.driverRadius, pair.driverTeeth, 0.065), driver);
  rotating(
    spokedGear(follower, pair.followerRadius, pair.followerTeeth, 0.044),
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
  for (let i = 0; i < flySpokes; i++) {
    const angle = (i * Math.PI * 2) / flySpokes;
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
  const motor: Vec3 = [0.27 + shift, 0.1 + next() * 0.09, 0.18];
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
  // A lower reduction train fills the engine bed and drives the auxiliary pumps.
  for (let i = 0; i < (architecture === "open-drive" ? 0 : 2); i++) {
    const center: Vec3 = [-0.34 + i * 0.168, 0.11, -0.19];
    rotating(
      spokedGear(center, 0.084, 12, 0.033),
      center,
      i === 0 ? 0.5 : -0.5,
      i === 0 ? phase : -phase + Math.PI - Math.PI / 12,
    );
  }
  const plumbing: Mesh = [];
  const pumpXs = Array.from({ length: pumpCount }, (_, i) => 0.09 + i * 0.12);
  for (const [i, x] of pumpXs.entries()) {
    const z = 0.045;
    tube(plumbing, [x, 0.04, z], [x, 0.195, z], 0.046, 2, 8);
    tube(plumbing, [x, 0.045, z], [x, 0.061, z], 0.055, 1, 8);
    tube(plumbing, [x, 0.18, z], [x, 0.197, z], 0.055, 1, 8);
    const piston: Mesh = [];
    tube(piston, [x, 0.15, z], [x, 0.31, z], 0.016, 1);
    box(piston, [x, 0.3, z], [0.07, 0.025, 0.055], 3);
    parts.push({
      mesh: piston,
      motion: 4,
      phase: phase + i * Math.PI,
      parameters: [0.034, 0, 0, 0],
    });
    tube(plumbing, [x, 0.1, z + 0.045], [x, 0.1, 0.33], 0.014, 3);
    tube(plumbing, [x, 0.1, 0.33], [x, 0.04, 0.33], 0.014, 3);
  }
  if (architecture === "gantry") {
    for (const x of [-0.38, 0.13]) {
      box(plumbing, [x, towerHeight / 2, 0.29], [0.045, towerHeight, 0.075], 1);
      beam(plumbing, [x, 0.06, 0.29], [x + 0.07, towerHeight * 0.78, 0.29], 0.018, 0.03, 3);
    }
    box(plumbing, [-0.125, towerHeight, 0.29], [0.62, 0.06, 0.08], 2);
    for (let i = 0; i < attachments; i++)
      box(plumbing, [-0.32 + i * 0.12, towerHeight - 0.055, 0.24], [0.04, 0.045, 0.03], 5);
  } else if (architecture === "boiler") {
    for (let i = 0; i < attachments; i++) {
      const x = -0.36 + i * 0.115;
      const height = 0.24 + next() * 0.19;
      tube(plumbing, [x, 0.025, 0.28], [x, height, 0.28], 0.045, 2, 6);
      tube(plumbing, [x, height - 0.025, 0.28], [x, height, 0.28], 0.056, 1, 6);
      box(plumbing, [x, height * 0.6, 0.233], [0.025, 0.065, 0.012], 5);
    }
  } else if (architecture === "turbine") {
    // A row of independently sized generator drums makes a low, broad silhouette.
    for (let i = 0; i < attachments; i++) {
      const x = -0.34 + i * 0.115;
      const radius = 0.058 + next() * 0.023;
      tube(plumbing, [x, radius + 0.04, 0.18], [x, radius + 0.04, 0.36], radius, 1, 10);
      box(plumbing, [x, 0.035, 0.27], [0.095, 0.05, 0.22], 2);
      box(plumbing, [x, radius + 0.04, 0.169], [0.04, 0.025, 0.012], 5);
    }
  } else {
    // Open drive leaves the rear frame empty and exposes a tall auxiliary flywheel.
    const center: Vec3 = [-0.27, 0.23, 0.29];
    rotating(spokedGear(center, 0.145, 20, 0.095), center, -0.5);
    box(plumbing, [center[0], 0.115, 0.32], [0.04, 0.23, 0.04], 2);
    tube(plumbing, [-0.4, 0.04, 0.33], [-0.4, towerHeight, 0.33], 0.024, 3);
  }
  // The boiler architecture owns the pressure vessels; other layouts stay open.
  const vessel = architecture === "boiler";
  const details: Mesh = [];
  for (const x of [-0.41, 0.41])
    for (const z of [-0.33, 0.32]) {
      box(details, [x, 0.045, z], [0.024, 0.014, 0.024], 1);
      box(details, [x, 0.053, z], [0.017, 0.003, 0.004], 4);
    }
  for (let i = 0; i < 8; i++)
    box(details, [-0.04 + i * 0.032, 0.025, 0.31], [0.014, 0.014, 0.12], 1);
  box(details, [-0.365, 0.075, -0.3], [0.11, 0.1, 0.055], 2);
  box(details, [-0.365, 0.095, -0.331], [0.071, 0.032, 0.009], 5);
  for (let i = 0; i < 3; i++)
    box(details, [-0.39 + i * 0.025, 0.055, -0.332], [0.012, 0.012, 0.008], 3);
  parts.push({ mesh: plumbing }, { mesh: details });
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
    composition: {
      architecture,
      attachments,
      spokeCount,
      flySpokes,
      pumpCount,
      towerHeight,
      vessel,
    },
  };
}
