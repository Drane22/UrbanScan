import { createEveryQRCodeIdentity } from "@every-qrcode/core";
import { expect, it } from "vitest";
import { createSeedModel } from "../seed-model";
import { createMechanicalLayout, gearMesh } from "./mechanical-model";
import {
  createGearPair,
  createSliderLinkage,
  followerAngle,
  sliderPosition,
  GEAR_MODULE,
  GEAR_TOOTH_COUNTS,
} from "./mechanical-motion";
import { FACET_HEADER_FLOATS } from "./faceted-mesh";
import { validateWorldDrawPlan } from "./world-draw";

it("packs coupled drive, crank, rod and slider descriptors for the GPU", async () => {
  const model = await createSeedModel(
    await createEveryQRCodeIdentity("https://example.com/motion"),
    { generatorVersion: 3 },
  );
  const scene = createMechanicalLayout(model);
  const descriptor = (index: number) => {
    const d = scene.modelData.slice(index * 12, index * 12 + 12);
    return {
      motion: d[2]!,
      phase: d[3]!,
      pivot: d.slice(4, 7),
      ratio: d[7]!,
      radius: d[8]!,
      rodLength: d[9]!,
    };
  };
  const drive = descriptor(2),
    follower = descriptor(3);
  const rod = descriptor(scene.parts.findIndex((p) => p.motion === 3));
  const slider = descriptor(scene.parts.findIndex((p) => p.motion === 2));
  const crank = descriptor(scene.parts.findIndex((p) => p.motion === 1 && p.pivot === scene.crank));
  expect(rod.motion).toBe(3);
  expect(slider.motion).toBe(2);
  for (const d of [crank, rod, slider]) {
    expect(d.pivot).toEqual(crank.pivot);
    expect(d.phase).toBe(drive.phase);
    expect(d.ratio).toBe(drive.ratio);
  }
  expect(slider.radius).toBe(rod.radius);
  expect(slider.rodLength).toBe(rod.rodLength);
  expect(rod.radius).toBeCloseTo(scene.linkage.radius, 7);
  expect(rod.rodLength).toBeCloseTo(scene.linkage.rodLength, 7);
  for (const time of [0, 0.5, 2, 6, 30]) {
    const angle = (d: typeof drive) => time * 0.48 * d.ratio + d.phase;
    expect(angle(follower)).toBeCloseTo(followerAngle(scene.pair, angle(drive)), 5);
    const a = angle(crank);
    const pin = [
      crank.pivot[0]! + rod.radius * Math.cos(a),
      crank.pivot[1]! + rod.radius * Math.sin(a),
    ];
    const slide = sliderPosition(
      { radius: slider.radius, rodLength: slider.rodLength },
      angle(slider),
    );
    const end = [slider.pivot[0]! + slide, slider.pivot[1]!];
    expect(Math.hypot(end[0]! - pin[0]!, end[1]! - pin[1]!)).toBeCloseTo(rod.rodLength, 7);
    expect(end[0]).toBeCloseTo(scene.crank[0] + sliderPosition(scene.linkage, angle(drive)), 6);
  }
});

it("couples all supported tooth pairs with opposite speed and engagement phase", () => {
  for (const a of GEAR_TOOTH_COUNTS)
    for (const b of GEAR_TOOTH_COUNTS) {
      const pair = createGearPair(a, b);
      expect(pair.centerDistance).toBeCloseTo(((a + b) * GEAR_MODULE) / 2, 12);
      for (const theta of [-100, -Math.PI, 0, 0.3, 10]) {
        expect(followerAngle(pair, theta + 0.1) - followerAngle(pair, theta)).toBeCloseTo(
          (-0.1 * a) / b,
          12,
        );
        expect(theta * a + (followerAngle(pair, theta) - Math.PI) * b).toBeCloseTo(-Math.PI, 10);
      }
    }
  expect(() => createGearPair(13, 12)).toThrow();
  expect(() => followerAngle(createGearPair(24, 12), Infinity)).toThrow();
});
it("keeps the rod length exact and the piston stroke bounded throughout rotations", () => {
  for (const r of [0.045, 0.057])
    for (const l of [0.39, 0.408]) {
      const link = createSliderLinkage(r, l);
      for (let i = -720; i <= 720; i++) {
        const theta = (i * Math.PI) / 180,
          s = sliderPosition(link, theta);
        expect(s).toBeGreaterThanOrEqual(l - r - 1e-12);
        expect(s).toBeLessThanOrEqual(l + r + 1e-12);
        expect(Math.hypot(s - r * Math.cos(theta), r * Math.sin(theta))).toBeCloseTo(l, 12);
      }
    }
  for (const values of [
    [0, 1],
    [1, 1],
    [2, 1],
    [NaN, 2],
    [1, Infinity],
  ])
    expect(() => createSliderLinkage(values[0]!, values[1]!)).toThrow();
  expect(() => sliderPosition({ radius: 1, rodLength: 0.5 }, 0)).toThrow();
});
it("extrudes aligned tooth faces with a genuine hub opening", () => {
  for (const teeth of GEAR_TOOTH_COUNTS) {
    const radius = (teeth * GEAR_MODULE) / 2,
      hole = 0.025;
    const mesh = gearMesh([0, 0, 0], radius, teeth, hole, 0.04);
    expect(mesh.length / 8).toBe(teeth * 4 * 30);
    let min = Infinity,
      max = 0;
    for (let i = 0; i < mesh.length; i += 8) {
      const r = Math.hypot(mesh[i]!, mesh[i + 1]!);
      min = Math.min(min, r);
      max = Math.max(max, r);
      expect(Math.hypot(...mesh.slice(i + 4, i + 7))).toBeCloseTo(1, 10);
    }
    expect(min).toBeCloseTo(hole, 12);
    expect(max).toBeCloseTo(radius + GEAR_MODULE * 0.43, 12);
  }
});
it.each(["https://a.co", "https://example.com/" + "bounded-world-".repeat(6)])(
  "bounds seeded machine geometry and real belt endpoints for %s",
  async (url) => {
    const model = await createSeedModel(await createEveryQRCodeIdentity(url), {
      generatorVersion: 3,
    });
    const original = createMechanicalLayout(model);
    expect(createMechanicalLayout(model).modelData).toEqual(original.modelData);
    expect(createMechanicalLayout({ ...model, morphSeed: 0.123 }).modelData).not.toEqual(
      original.modelData,
    );
    for (let seed = 0; seed < 32; seed++) {
      const scene = createMechanicalLayout({ ...model, morphSeed: seed / 32 });
      const { modelData, drawPlan, driver, follower, pair, linkage, crank } = scene;
      expect(modelData.byteLength, `seed ${seed} upload`).toBeLessThanOrEqual(512 * 1024);
      validateWorldDrawPlan(drawPlan, modelData, model.qrSize ** 2);
      expect(Math.hypot(...driver.map((n, i) => n - follower[i]!))).toBeCloseTo(
        pair.centerDistance,
        12,
      );
      expect(drawPlan.batches.every((b) => b.verticesPerInstance % 3 === 0)).toBe(true);
      let extent = 0,
        low = Infinity,
        high = -Infinity,
        normalError = 0;
      for (let i = FACET_HEADER_FLOATS; i < modelData.length; i += 8) {
        extent = Math.max(extent, Math.abs(modelData[i]!), Math.abs(modelData[i + 2]!));
        low = Math.min(low, modelData[i + 1]!);
        high = Math.max(high, modelData[i + 1]!);
        normalError = Math.max(
          normalError,
          Math.abs(Math.hypot(...modelData.slice(i + 4, i + 7)) - 1),
        );
      }
      expect(extent).toBeLessThanOrEqual(0.5);
      expect(low).toBeGreaterThan(-0.08);
      expect(high).toBeLessThan(0.51);
      expect(normalError).toBeLessThan(1e-6);
      for (const endpoints of scene.beltEndpoints)
        endpoints.forEach((p, i) => {
          const center = scene.pulleys[i]!;
          expect(Math.hypot(p[0] - center[0], p[1] - center[1])).toBeCloseTo(0.051, 12);
          expect(p[2]).toBe(center[2]);
        });
      const driven = scene.parts[3]!;
      expect(driven.ratio).toBe(-pair.driverTeeth / pair.followerTeeth);
      expect(driven.phase).toBeCloseTo(followerAngle(pair, scene.phase), 12);
      expect(modelData[3 * 12 + 7]).toBeCloseTo(driven.ratio!, 6);
      expect(modelData[3 * 12 + 3]).toBeCloseTo(driven.phase!, 6);
      for (const part of scene.parts) {
        if (part.motion === 2 || part.motion === 3)
          expect(part.parameters?.slice(0, 2)).toEqual([linkage.radius, linkage.rodLength]);
        if (part.motion === 1) {
          const pivot = part.pivot!;
          let radial = 0;
          for (let i = 0; i < part.mesh.length; i += 8)
            radial = Math.max(
              radial,
              Math.hypot(part.mesh[i]! - pivot[0], part.mesh[i + 1]! - pivot[1]),
            );
          expect(Math.abs(pivot[0]) + radial).toBeLessThan(0.5);
          expect(pivot[1] + radial).toBeLessThan(0.51);
          expect(pivot[1] - radial).toBeGreaterThan(0);
        }
      }
      expect(crank[0] + linkage.rodLength + linkage.radius + 0.14).toBeLessThan(0.49);
    }
  },
);
