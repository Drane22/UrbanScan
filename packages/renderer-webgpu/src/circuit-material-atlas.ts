export const CIRCUIT_MATERIAL_ATLAS_SIZE = 64;
export const CIRCUIT_MATERIAL_TILE_SIZE = 16;

export const CIRCUIT_MATERIAL_TILES = {
  brushedHorizontal: 2,
  brushedVertical: 3,
  ceramic: 4,
  fiberglass: 0,
  goldPlating: 7,
  moldedPlastic: 1,
  silkscreen: 6,
  solder: 5,
} as const;

function hash(column: number, row: number, salt: number): number {
  const value = Math.sin(column * 127.1 + row * 311.7 + salt * 74.7) * 43_758.5453;
  return value - Math.floor(value);
}

function tileValue(
  tile: number,
  column: number,
  row: number,
): readonly [number, number, number, number] {
  const noise = hash(column, row, tile + 1);
  if (tile === CIRCUIT_MATERIAL_TILES.fiberglass) {
    const weaveX = Math.sin(column * 0.785) * 18;
    const weaveY = Math.cos(row * 0.785) * 18;
    const weave = ((column >> 1) + (row >> 1)) % 2 === 0 ? 14 : -12;
    const val = Math.round(112 + weave + (weaveX + weaveY) * 0.5);
    return [val, Math.round(val * 1.05), Math.round(val * 0.95), 145 + Math.round(noise * 55)];
  }
  if (tile === CIRCUIT_MATERIAL_TILES.moldedPlastic) {
    const grain = Math.round(noise * 28);
    const bevel = (column === 0 || column === 15 || row === 0 || row === 15) ? -24 : 0;
    return [76 + grain + bevel, 78 + grain + bevel, 82 + grain + bevel, 188 + Math.round(noise * 36)];
  }
  if (tile === CIRCUIT_MATERIAL_TILES.brushedHorizontal) {
    const line = Math.round(hash(row, 0, 12) * 58 + Math.sin(row * 1.5) * 16);
    return [150 + line, 145 + line, 138 + line, 92 + Math.round(noise * 30)];
  }
  if (tile === CIRCUIT_MATERIAL_TILES.brushedVertical) {
    const line = Math.round(hash(column, 0, 14) * 58 + Math.sin(column * 1.5) * 16);
    return [150 + line, 145 + line, 138 + line, 92 + Math.round(noise * 30)];
  }
  if (tile === CIRCUIT_MATERIAL_TILES.ceramic) {
    const fleck = noise > 0.92 ? -28 : Math.round(noise * 12);
    return [234 + fleck, 228 + fleck, 214 + fleck, 205 + Math.round(noise * 24)];
  }
  if (tile === CIRCUIT_MATERIAL_TILES.solder) {
    const mottling = Math.round(noise * 64);
    const shine = Math.round(Math.sin((column + row) * 0.4) * 20);
    return [155 + mottling + shine, 160 + mottling + shine, 165 + mottling + shine, 62 + Math.round(noise * 42)];
  }
  if (tile === CIRCUIT_MATERIAL_TILES.silkscreen) {
    const isLetter =
      (column === 3 && row >= 3 && row <= 12) ||
      (column === 8 && row >= 3 && row <= 12) ||
      (row === 7 && column >= 3 && column <= 8) ||
      (row === 12 && column >= 3 && column <= 8) ||
      (column === 13 && row === 4);
    const value = isLetter ? 245 : 22 + Math.round(noise * 16);
    return [value, value, Math.round(value * 0.96), isLetter ? 245 : 28];
  }
  if (tile === CIRCUIT_MATERIAL_TILES.goldPlating) {
    const glint = Math.round(Math.sin((column - row) * 0.5) * 25);
    return [245 + Math.round(noise * 10), 205 + glint, 65 + glint, 230 + Math.round(noise * 25)];
  }
  const value = 96 + Math.round(noise * 64);
  return [value, value, value, 128];
}

export function createCircuitMaterialAtlas(): Uint8Array {
  const size = CIRCUIT_MATERIAL_ATLAS_SIZE;
  const tileSize = CIRCUIT_MATERIAL_TILE_SIZE;
  const tilesPerRow = size / tileSize;
  const pixels = new Uint8Array(size * size * 4);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const tileColumn = Math.floor(column / tileSize);
      const tileRow = Math.floor(row / tileSize);
      const tile = tileRow * tilesPerRow + tileColumn;
      const localColumn = column % tileSize;
      const localRow = row % tileSize;
      const rgba = tileValue(tile, localColumn, localRow);
      const offset = (row * size + column) * 4;
      pixels[offset] = rgba[0];
      pixels[offset + 1] = rgba[1];
      pixels[offset + 2] = rgba[2];
      pixels[offset + 3] = rgba[3];
    }
  }
  return pixels;
}
