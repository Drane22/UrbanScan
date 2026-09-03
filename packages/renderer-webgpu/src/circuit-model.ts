import { analyzeQRTopology, type QRTopologyAnalysis } from "@every-qrcode/core";
import type { SeedModel } from "./seed-model.js";
import {
  circuitSegmentLength,
  routeCircuitTrace,
  type CircuitKeepOut,
  type CircuitRoutePoint,
} from "./circuit-routing.js";
import { createBaseWorldDNA, seededRandom, type WorldDNA } from "./world-dna.js";

export const CIRCUIT_COMPONENT_TYPES = {
  capacitor: 3,
  connector: 6,
  daughterboard: 7,
  heatsink: 2,
  microchip: 1,
  processor: 0,
  resistor: 4,
  shield: 5,
  viaCluster: 8,
} as const;

export type CircuitComponentType =
  (typeof CIRCUIT_COMPONENT_TYPES)[keyof typeof CIRCUIT_COMPONENT_TYPES];

export const CIRCUIT_COMPONENT_STRIDE = 12;
export const CIRCUIT_TRACE_STRIDE = 12;

export interface CircuitDNA extends WorldDNA {
  readonly componentDensityClass: number;
  readonly signalCadence: number;
  readonly templateIndex: number;
  readonly traceDensityClass: number;
}

export interface CircuitBoard {
  readonly bevel: number;
  readonly size: number;
  readonly thickness: number;
}

export interface CircuitZone {
  readonly column: number;
  readonly id: number;
  readonly kind: "connectivity" | "memory" | "power" | "processing";
  readonly row: number;
}

export interface CircuitComponent {
  readonly column: number;
  readonly depth: number;
  readonly height: number;
  readonly id: number;
  readonly rotation: number;
  readonly row: number;
  readonly seed: number;
  readonly targetColumn: number;
  readonly targetRow: number;
  readonly type: CircuitComponentType;
  readonly variant: number;
  readonly width: number;
  readonly zoneId: number;
}

export interface CircuitProcessor extends CircuitComponent {
  readonly finder: 0 | 1 | 2;
  readonly type: typeof CIRCUIT_COMPONENT_TYPES.processor;
}

export interface CircuitTraceSegment {
  readonly distanceStart: number;
  readonly endColumn: number;
  readonly endRow: number;
  readonly level: number;
  readonly routeId: number;
  readonly routeLength: number;
  readonly seed: number;
  readonly startColumn: number;
  readonly startRow: number;
  readonly targetColumn: number;
  readonly targetRow: number;
  readonly width: number;
}

export interface CircuitSignalRoute {
  readonly fromZoneId: number;
  readonly id: number;
  readonly length: number;
  readonly segmentCount: number;
  readonly toZoneId: number;
}

export interface CircuitLayout {
  readonly board: CircuitBoard;
  readonly componentData: Float32Array;
  readonly components: readonly CircuitComponent[];
  readonly dna: CircuitDNA;
  readonly fallbackUsed: boolean;
  readonly processors: readonly CircuitProcessor[];
  readonly qrSize: number;
  readonly signalRoutes: readonly CircuitSignalRoute[];
  readonly topology: QRTopologyAnalysis;
  readonly traceData: Float32Array;
  readonly traces: readonly CircuitTraceSegment[];
  readonly zones: readonly CircuitZone[];
}

export interface CreateCircuitLayoutOptions {
  readonly maxPlacementAttempts?: number;
}

interface PlacementRect {
  readonly maxColumn: number;
  readonly maxRow: number;
  readonly minColumn: number;
  readonly minRow: number;
}

const TEMPLATE_ZONES = [
  [
    [0.54, 0.31, "memory"],
    [0.48, 0.72, "power"],
    [0.77, 0.7, "connectivity"],
  ],
  [
    [0.68, 0.42, "memory"],
    [0.42, 0.66, "power"],
    [0.76, 0.78, "connectivity"],
  ],
  [
    [0.5, 0.46, "memory"],
    [0.67, 0.67, "power"],
    [0.42, 0.79, "connectivity"],
  ],
] as const;

export function createCircuitDNA(model: SeedModel): CircuitDNA {
  const seed = model.morphSeed;
  const base = createBaseWorldDNA(seed);
  return {
    ...base,
    componentDensityClass: Math.floor(seededRandom(seed, 24, 0, 400) * 3),
    signalCadence: 7 + seededRandom(seed, 25, 0, 500) * 5,
    templateIndex: Math.floor(seededRandom(seed, 23, 0, 300) * TEMPLATE_ZONES.length),
    traceDensityClass: Math.floor(seededRandom(seed, 26, 0, 600) * 3),
  };
}

function overlaps(left: PlacementRect, right: PlacementRect, padding = 0): boolean {
  return !(
    left.maxColumn + padding < right.minColumn ||
    left.minColumn - padding > right.maxColumn ||
    left.maxRow + padding < right.minRow ||
    left.minRow - padding > right.maxRow
  );
}

function componentRect(component: CircuitComponent): PlacementRect {
  return {
    maxColumn: component.column + component.width * 0.5,
    maxRow: component.row + component.depth * 0.5,
    minColumn: component.column - component.width * 0.5,
    minRow: component.row - component.depth * 0.5,
  };
}

function createProcessors(size: number, seed: number): readonly CircuitProcessor[] {
  const centers = [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ] as const;
  return centers.map(([column, row], finder) => ({
    column,
    depth: 6.3,
    finder: finder as 0 | 1 | 2,
    height: 1.35 + finder * 0.12,
    id: finder,
    rotation: finder,
    row,
    seed: seededRandom(seed, column, row, 910),
    targetColumn: column,
    targetRow: row,
    type: CIRCUIT_COMPONENT_TYPES.processor,
    variant: finder,
    width: 6.3,
    zoneId: finder,
  }));
}

function createZones(size: number, dna: CircuitDNA): readonly CircuitZone[] {
  const template = TEMPLATE_ZONES[dna.templateIndex] ?? TEMPLATE_ZONES[0];
  const processors: CircuitZone[] = [
    { column: 7, id: 0, kind: "processing", row: 3 },
    { column: size - 8, id: 1, kind: "processing", row: 3 },
    { column: 3, id: 2, kind: "processing", row: size - 8 },
  ];
  return processors.concat(
    template.map(([column, row, kind], index) => ({
      column: Math.max(8, Math.min(size - 3, Math.round(column * (size - 1)))),
      id: index + 3,
      kind,
      row: Math.max(8, Math.min(size - 3, Math.round(row * (size - 1)))),
    })),
  );
}

function processorKeepOuts(processors: readonly CircuitProcessor[]): readonly CircuitKeepOut[] {
  return processors.map((processor) => {
    const rect = componentRect(processor);
    return {
      maxColumn: Math.ceil(rect.maxColumn + 0.5),
      maxRow: Math.ceil(rect.maxRow + 0.5),
      minColumn: Math.floor(rect.minColumn - 0.5),
      minRow: Math.floor(rect.minRow - 0.5),
    };
  });
}

function routePairs(
  zones: readonly CircuitZone[],
  traceClass: number,
): readonly [number, number][] {
  const pairs: [number, number][] = [
    [0, 3],
    [1, 4],
    [2, 5],
    [0, 1],
    [0, 2],
  ];
  if (traceClass > 0) pairs.push([3, 4], [4, 5]);
  if (traceClass > 1) pairs.push([3, 5], [1, 3]);
  return pairs.filter(([from, to]) => zones[from] && zones[to]);
}

function createRoutes(
  size: number,
  zones: readonly CircuitZone[],
  keepOuts: readonly CircuitKeepOut[],
  dna: CircuitDNA,
): {
  readonly routes: readonly CircuitSignalRoute[];
  readonly traces: readonly CircuitTraceSegment[];
} {
  const traces: CircuitTraceSegment[] = [];
  const routes: CircuitSignalRoute[] = [];
  for (const [fromId, toId] of routePairs(zones, dna.traceDensityClass)) {
    const from = zones[fromId]!;
    const to = zones[toId]!;
    const start: CircuitRoutePoint = { column: from.column, row: from.row };
    const end: CircuitRoutePoint = { column: to.column, row: to.row };
    const routed = routeCircuitTrace({ bounds: size, end, keepOuts, start });
    if (routed.length === 0) continue;
    const routeId = routes.length;
    const routeLength = routed.reduce((total, segment) => total + circuitSegmentLength(segment), 0);
    let distanceStart = 0;
    for (const segment of routed) {
      const length = circuitSegmentLength(segment);
      traces.push({
        distanceStart,
        endColumn: segment.endColumn,
        endRow: segment.endRow,
        level: routeId % 3,
        routeId,
        routeLength,
        seed: seededRandom(dna.seed, routeId, traces.length, 1800),
        startColumn: segment.startColumn,
        startRow: segment.startRow,
        targetColumn: Math.round((segment.startColumn + segment.endColumn) * 0.5),
        targetRow: Math.round((segment.startRow + segment.endRow) * 0.5),
        width: routeId < 3 ? 0.28 : 0.16,
      });
      distanceStart += length;
    }
    routes.push({
      fromZoneId: from.id,
      id: routeId,
      length: routeLength,
      segmentCount: routed.length,
      toZoneId: to.id,
    });
  }
  return { routes, traces };
}

function selectComponentType(seed: number, density: number): CircuitComponentType {
  if (density > 0.72 && seed < 0.18) return CIRCUIT_COMPONENT_TYPES.heatsink;
  if (seed < 0.42) return CIRCUIT_COMPONENT_TYPES.microchip;
  if (seed < 0.58) return CIRCUIT_COMPONENT_TYPES.capacitor;
  if (seed < 0.75) return CIRCUIT_COMPONENT_TYPES.resistor;
  if (seed < 0.86) return CIRCUIT_COMPONENT_TYPES.shield;
  if (seed < 0.94) return CIRCUIT_COMPONENT_TYPES.viaCluster;
  return CIRCUIT_COMPONENT_TYPES.daughterboard;
}

function dimensionsFor(
  type: CircuitComponentType,
  seed: number,
): readonly [number, number, number] {
  if (type === CIRCUIT_COMPONENT_TYPES.heatsink) return [2.8, 2.5, 1.25];
  if (type === CIRCUIT_COMPONENT_TYPES.microchip) return [2.2 + seed, 1.5, 0.5];
  if (type === CIRCUIT_COMPONENT_TYPES.capacitor) return [0.8, 0.8, 1.05];
  if (type === CIRCUIT_COMPONENT_TYPES.resistor) return [1.4, 0.65, 0.28];
  if (type === CIRCUIT_COMPONENT_TYPES.shield) return [2.5, 2.1, 0.45];
  if (type === CIRCUIT_COMPONENT_TYPES.daughterboard) return [3.2, 1.5, 0.7];
  if (type === CIRCUIT_COMPONENT_TYPES.connector) return [2.6, 0.8, 0.65];
  return [0.75, 0.75, 0.18];
}

function createSupportingComponents(
  size: number,
  activeCells: Uint8Array,
  topology: QRTopologyAnalysis,
  zones: readonly CircuitZone[],
  processors: readonly CircuitProcessor[],
  dna: CircuitDNA,
  maxAttempts: number,
): { readonly components: readonly CircuitComponent[]; readonly fallbackUsed: boolean } {
  const components: CircuitComponent[] = [...processors];
  const occupied: PlacementRect[] = processors.map(componentRect);
  const targetCount = Math.min(34, 14 + dna.componentDensityClass * 6 + Math.floor(size / 8));
  let attempts = 0;
  for (let row = 8; row < size - 2 && components.length < targetCount; row += 2) {
    for (let column = 8; column < size - 2 && components.length < targetCount; column += 2) {
      if (attempts >= maxAttempts) break;
      attempts += 1;
      const seed = seededRandom(dna.seed, column, row, 1200);
      if (seed < 0.24) continue;
      const index = row * size + column;
      const density = topology.density3x3[index] ?? 0;
      const type = selectComponentType(seed, density);
      const [width, depth, height] = dimensionsFor(type, seed);
      const zone = zones.slice(3).reduce((best, candidate) => {
        const candidateDistance =
          Math.abs(candidate.column - column) + Math.abs(candidate.row - row);
        const bestDistance = Math.abs(best.column - column) + Math.abs(best.row - row);
        return candidateDistance < bestDistance ? candidate : best;
      }, zones[3]!);
      const component: CircuitComponent = {
        column,
        depth,
        height,
        id: components.length,
        rotation: Math.floor(seed * 4),
        row,
        seed,
        targetColumn: column,
        targetRow: row,
        type,
        variant: Math.floor(seededRandom(dna.seed, column, row, 1300) * 3),
        width,
        zoneId: zone.id,
      };
      const rect = componentRect(component);
      if (occupied.some((other) => overlaps(rect, other, 0.45))) continue;
      if (activeCells[index] === 0 && seed < 0.56) continue;
      occupied.push(rect);
      components.push(component);
    }
  }
  components.push({
    column: size - 1.2,
    depth: 0.8,
    height: 0.65,
    id: components.length,
    rotation: 1,
    row: size * 0.52,
    seed: seededRandom(dna.seed, 1, 1, 1700),
    targetColumn: size - 1,
    targetRow: Math.round(size * 0.52),
    type: CIRCUIT_COMPONENT_TYPES.connector,
    variant: 0,
    width: 2.6,
    zoneId: 5,
  });
  return { components, fallbackUsed: attempts >= maxAttempts && components.length < targetCount };
}

function packComponents(components: readonly CircuitComponent[]): Float32Array {
  const data = new Float32Array(components.length * CIRCUIT_COMPONENT_STRIDE);
  components.forEach((component, index) => {
    data.set(
      [
        component.column,
        component.row,
        component.width,
        component.depth,
        component.height,
        component.rotation,
        component.type,
        component.variant,
        component.seed,
        component.targetColumn,
        component.targetRow,
        component.zoneId,
      ],
      index * CIRCUIT_COMPONENT_STRIDE,
    );
  });
  return data;
}

function packTraces(traces: readonly CircuitTraceSegment[]): Float32Array {
  const data = new Float32Array(traces.length * CIRCUIT_TRACE_STRIDE);
  traces.forEach((trace, index) => {
    data.set(
      [
        trace.startColumn,
        trace.startRow,
        trace.endColumn,
        trace.endRow,
        trace.width,
        trace.level,
        trace.routeId,
        trace.distanceStart,
        trace.routeLength,
        trace.seed,
        trace.targetColumn,
        trace.targetRow,
      ],
      index * CIRCUIT_TRACE_STRIDE,
    );
  });
  return data;
}

export function createCircuitLayout(
  model: SeedModel,
  options: CreateCircuitLayoutOptions = {},
): CircuitLayout {
  const size = model.qrSize;
  const activeCells = new Uint8Array(size * size);
  for (const module of model.modules) activeCells[module.index] = 1;
  const topology = analyzeQRTopology({ cells: activeCells, size });
  const dna = createCircuitDNA(model);
  const processors = createProcessors(size, model.morphSeed);
  const zones = createZones(size, dna);
  const keepOuts = processorKeepOuts(processors);
  const { routes, traces } = createRoutes(size, zones, keepOuts, dna);
  const placement = createSupportingComponents(
    size,
    activeCells,
    topology,
    zones,
    processors,
    dna,
    options.maxPlacementAttempts ?? size * size,
  );
  return {
    board: { bevel: 0.12, size, thickness: 0.28 },
    componentData: packComponents(placement.components),
    components: placement.components,
    dna,
    fallbackUsed: placement.fallbackUsed,
    processors,
    qrSize: size,
    signalRoutes: routes,
    topology,
    traceData: packTraces(traces),
    traces,
    zones,
  };
}
