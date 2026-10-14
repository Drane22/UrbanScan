import { APPEARANCES, type Appearance } from "../studio-preferences";

/** Visible, single-tap appearance controls; no settings dropdown or nested select. */
export function StudioSettings({
  appearance,
  onAppearance,
}: {
  appearance: Appearance;
  onAppearance: (value: Appearance) => void;
}): React.JSX.Element {
  const labels: Record<Appearance, string> = {
    paper: "Paper",
    midnight: "Night",
    lavender: "Lilac",
  };
  return (
    <div className="studio-settings appearance-switch" role="group" aria-label="Appearance">
      {APPEARANCES.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={appearance === value}
          onClick={() => onAppearance(value)}
          title={`${labels[value]} appearance`}
        >
          {labels[value]}
        </button>
      ))}
    </div>
  );
}
