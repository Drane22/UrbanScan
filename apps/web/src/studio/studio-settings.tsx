import { APPEARANCES, type Appearance } from "../studio-preferences";
export function StudioSettings({
  appearance,
  onAppearance,
}: {
  appearance: Appearance;
  onAppearance: (value: Appearance) => void;
}): React.JSX.Element {
  return (
    <details className="studio-settings">
      <summary>Settings</summary>
      <div className="settings-content">
        <label>
          Appearance
          <select
            aria-label="App appearance"
            value={appearance}
            onChange={(event) =>
              onAppearance(APPEARANCES.find((value) => value === event.target.value) ?? "paper")
            }
          >
            {APPEARANCES.map((value) => (
              <option key={value} value={value}>
                {value[0]!.toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <p>Motion follows your device’s reduced-motion setting.</p>
      </div>
    </details>
  );
}
