export const REEF_MATERIAL_ATLAS_SIZE = 64;
export const REEF_MATERIAL_TILE_SIZE = 16;

export const REEF_MATERIAL_TILES = {
  biolum: 7,
  brainRidges: 2,
  coralPores: 0,
  limestone: 3,
  plateBands: 1,
  sand: 4,
  tissue: 5,
  tubeCavity: 6,
} as const;

function hash(column: number, row: number, salt: number): number {
  const value = Math.sin(column * 127.1 + row * 311.7 + salt * 53.3) * 43_758.5453;
  return value - Math.floor(value);
}

function tilePixel(
  tile: number,
  column: number,
  row: number,
): readonly [number, number, number, number] {
  const noise = hash(column, row, tile + 1);
  if (tile === REEF_MATERIAL_TILES.coralPores) {
    const dX = (column % 4) - 1.5;
    const dY = (row % 4) - 1.5;
    const isCupule = dX * dX + dY * dY < 1.8;
    const pore = isCupule ? -62 : 12;
    return [164 + pore, 132 + pore, 124 + pore, 186 + Math.round(noise * 42)];
  }
  if (tile === REEF_MATERIAL_TILES.plateBands) {
    const band = Math.sin((row + noise * 0.4) * 1.57) * 34;
    const radial = Math.cos(column * 0.785) * 12;
    return [
      177 + Math.round(band + radial),
      145 + Math.round(band * 0.9),
      128 + Math.round(band * 0.8),
      174 + Math.round(noise * 38),
    ];
  }
  if (tile === REEF_MATERIAL_TILES.brainRidges) {
    const warp = Math.sin(row * 0.6 + column * 0.2) * 2.8;
    const ridge = Math.sin(column * 0.9 + warp) > 0.15 ? 42 : -45;
    return [
      156 + ridge,
      128 + Math.round(ridge * 0.9),
      116 + Math.round(ridge * 0.8),
      160 + Math.round(noise * 44),
    ];
  }
  if (tile === REEF_MATERIAL_TILES.limestone) {
    const pitted = noise > 0.82 ? -65 : Math.round(noise * 24);
    const crag = Math.round(Math.sin((column + row) * 0.8) * 16);
    return [178 + pitted + crag, 169 + pitted + crag, 143 + pitted, 210 + Math.round(noise * 28)];
  }
  if (tile === REEF_MATERIAL_TILES.sand) {
    const ripple = Math.sin(row * 1.35 + column * 0.18 + noise * 0.2) * 20;
    const speckle = Math.round((noise - 0.5) * 32);
    return [
      202 + Math.round(ripple) + speckle,
      186 + Math.round(ripple * 0.9) + speckle,
      148 + Math.round(ripple * 0.7) + speckle,
      220 + Math.round(noise * 22),
    ];
  }
  if (tile === REEF_MATERIAL_TILES.tissue) {
    const vein = Math.sin(column * 0.6 + row * 0.35) * 22;
    const pulse = Math.cos(column * 0.3 - row * 0.5) * 14;
    return [
      188 + Math.round(vein + pulse),
      116 + Math.round(vein * 0.8),
      126 + Math.round(pulse),
      92 + Math.round(noise * 45),
    ];
  }
  if (tile === REEF_MATERIAL_TILES.tubeCavity) {
    const distance = Math.hypot(column - 7.5, row - 7.5);
    const rim = Math.abs(distance - 4.5) < 1.4 ? 58 : distance < 4.0 ? -82 : 6;
    return [
      152 + rim,
      112 + Math.round(rim * 0.85),
      100 + Math.round(rim * 0.75),
      168 + Math.round(noise * 36),
    ];
  }
  if (tile === REEF_MATERIAL_TILES.biolum) {
    const dist = Math.hypot((column % 8) - 3.5, (row % 8) - 3.5);
    const spot = dist < 2.0 ? Math.round((2.0 - dist) * 70) : 0;
    return [80 + spot, 210 + spot, 190 + spot, 220 + Math.round(noise * 25)];
  }
  const value = 110 + Math.round(noise * 55);
  return [value, value, value, 160];
}

export function createReefMaterialAtlas(): Uint8Array {
  const size = REEF_MATERIAL_ATLAS_SIZE;
  const tileSize = REEF_MATERIAL_TILE_SIZE;
  const tilesPerRow = size / tileSize;
  const pixels = new Uint8Array(size * size * 4);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const tileColumn = Math.floor(column / tileSize);
      const tileRow = Math.floor(row / tileSize);
      const tile = tileRow * tilesPerRow + tileColumn;
      const color = tilePixel(tile, column % tileSize, row % tileSize);
      const offset = (row * size + column) * 4;
      pixels.set(color, offset);
    }
  }
  return pixels;
}
