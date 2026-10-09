export const SUPPORTED_GENERATOR_VERSIONS = [1, 2, 3] as const;

export type GeneratorVersion = (typeof SUPPORTED_GENERATOR_VERSIONS)[number];

export const CURRENT_GENERATOR_VERSION: GeneratorVersion = 2;

export function isGeneratorVersion(value: unknown): value is GeneratorVersion {
  return SUPPORTED_GENERATOR_VERSIONS.some((version) => version === value);
}

export function resolveGeneratorVersion(
  value: unknown = CURRENT_GENERATOR_VERSION,
): GeneratorVersion {
  if (isGeneratorVersion(value)) return value;
  throw new RangeError(`Unsupported generator version: ${String(value)}`);
}
