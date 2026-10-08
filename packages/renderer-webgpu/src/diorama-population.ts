import type { SeedForm } from "./seed-model.js";

export const SCULPTURE_VERTICES = 384;
export const SCULPTURE_PARTS = 4;
export const SCULPTURE_AMBIENT_INSTANCES = 384 * 4;

type Count = readonly [base: number, gene: number, spread: number];
type Population = {
  form: SeedForm;
  width?: readonly [name: string, count: Count];
  extra?: readonly [name: string, count: Count];
  primary: number | "square" | "extra" | "panels";
  ambient: Count;
};
const POPULATIONS: readonly Population[] = [
  { form: "colony", width: ["colonyWidth", [4, 5, 3]], primary: "square", ambient: [342, 6, 14] },
  { form: "dungeon", primary: 384, ambient: [288, 0, 0] },
  {
    form: "origami",
    width: ["paperWidth", [10, 6, 5]],
    extra: ["craneCount", [3, 5, 3]],
    primary: "square",
    ambient: [303, 7, 4],
  },
  {
    form: "stained-glass",
    width: ["glassPanels", [5, 5, 4]],
    primary: "panels",
    ambient: [384, 0, 0],
  },
  { form: "mycelium", width: ["fungusWidth", [8, 5, 4]], primary: "square", ambient: [360, 0, 0] },
  {
    form: "constellation",
    extra: ["planetCount", [5, 5, 5]],
    primary: "extra",
    ambient: [384, 0, 0],
  },
  { form: "toy-block", primary: 136, ambient: [384, 0, 0] },
  { form: "waves", primary: 12, ambient: [136, 0, 0] },
  { form: "crystalline", primary: 64, ambient: [184, 0, 0] },
  { form: "mechanical", primary: 64, ambient: [68, 0, 0] },
];
function countWgsl([base, gene, spread]: Count): string {
  return spread ? `${base}u+u32(worldDNA(${gene}u).w*${spread}.0)` : `${base}u`;
}
export const SCULPTURAL_POPULATION_WGSL = POPULATIONS.map((spec) => {
  const width = spec.width?.[0];
  const extra = spec.extra?.[0];
  const primary =
    typeof spec.primary === "number"
      ? `${spec.primary}u`
      : spec.primary === "square"
        ? `${width}()*${width}()${extra ? `+${extra}()` : ""}`
        : spec.primary === "panels"
          ? `${width}()*24u+64u`
          : `${extra}()+1u`;
  return `${spec.width ? `fn ${width}()->u32 {return ${countWgsl(spec.width[1])};}` : ""}
 ${spec.extra ? `fn ${extra}()->u32 {return ${countWgsl(spec.extra[1])};}` : ""}
 fn worldCount()->u32 {return ${primary};}
 fn worldAmbientCount()->u32 {return ${countWgsl(spec.ambient)};}`;
});
export function getSculpturalPopulation(
  data: Float32Array,
  form: SeedForm,
): { primary: number; ambient: number } {
  const spec = POPULATIONS.find((value) => value.form === form);
  if (!spec) return { primary: 0, ambient: 0 };
  const count = ([base, gene, spread]: Count) =>
    base + Math.floor(Math.fround((data[(700 + gene) * 4 + 3] ?? 0) * spread));
  const width = spec.width ? count(spec.width[1]) : 0;
  const extra = spec.extra ? count(spec.extra[1]) : 0;
  const primary =
    typeof spec.primary === "number"
      ? spec.primary
      : spec.primary === "square"
        ? width * width + extra
        : spec.primary === "panels"
          ? width * 24 + 64
          : extra + 1;
  return { primary, ambient: count(spec.ambient) };
}
