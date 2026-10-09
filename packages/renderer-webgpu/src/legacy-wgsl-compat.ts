// Current WGSL compilers require parentheses when mixing || and &&. These four
// known v1 expressions use the historical && precedence. Apply the equivalent
// grouping only to compilation copies, preserving the published raw snapshots.
const VERSION_ONE_EXPRESSIONS = [
  [
    "if (!isDark || (flags & 4u) == 0u && compType != 5u)",
    "if (!isDark || ((flags & 4u) == 0u && compType != 5u))",
  ],
  ["if (!isDark || cType != 2u && cType != 5u)", "if (!isDark || (cType != 2u && cType != 5u))"],
  [
    "if (!isDark || modType != 3u && modType != 5u)",
    "if (!isDark || (modType != 3u && modType != 5u))",
  ],
  [
    "if (!isDark || featType != 2u && featType != 5u)",
    "if (!isDark || (featType != 2u && featType != 5u))",
  ],
] as const;

export function prepareVersionOneShaderCompilation(code: string): string {
  for (const [historical, grouped] of VERSION_ONE_EXPRESSIONS)
    code = code.replace(historical, grouped);
  return code;
}
