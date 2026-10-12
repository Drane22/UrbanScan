import { APPEARANCES, type Appearance } from "../studio-preferences";
import { useEffect, useRef } from "react";
export function StudioSettings({
  appearance,
  onAppearance,
}: {
  appearance: Appearance;
  onAppearance: (value: Appearance) => void;
}): React.JSX.Element {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(event.target as Node))
        menu.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <details className="studio-settings" ref={menu}>
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
