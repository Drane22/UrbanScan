import { useState } from "react";
import type { EveryQRCodeModel } from "@every-qrcode/react";
import { WORLD_CATALOG, WORLD_CATEGORIES, getWorldOption } from "../world-catalog";

export const FEATURED_WORLDS: readonly EveryQRCodeModel[] = [
  "waves",
  "crystalline",
  "mechanical",
  "tree",
  "city",
  "circuit",
];
export function WorldPicker({
  selected,
  onSelect,
}: {
  selected: EveryQRCodeModel;
  onSelect: (model: EveryQRCodeModel) => void;
}): React.JSX.Element {
  const [category, setCategory] = useState("Featured");
  const choices = WORLD_CATALOG.filter((world) =>
    category === "Featured"
      ? FEATURED_WORLDS.includes(world.id)
      : category === "All" || world.category === category,
  );
  const selectedWorld = getWorldOption(selected);
  return (
    <div className="world-controls">
      <label className="filter-label">
        Browse
        <select
          aria-label="World category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {["Featured", ...WORLD_CATEGORIES].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      {!choices.some((world) => world.id === selected) && (
        <button
          className="selected-world"
          type="button"
          aria-pressed="true"
          onClick={() => setCategory("All")}
        >
          <span aria-hidden="true">✓</span> {selectedWorld.name}
        </button>
      )}
      <div className="world-picker" aria-label="World choices">
        {choices.map((world) => (
          <button
            type="button"
            className="world-card"
            key={world.id}
            aria-pressed={selected === world.id}
            onClick={() => onSelect(world.id)}
          >
            <span className={"world-thumbnail world-thumbnail--" + world.category.toLowerCase()}>
              <img
                src={"/worlds/" + world.id + ".webp"}
                alt=""
                width={240}
                height={240}
                loading="lazy"
                decoding="async"
              />
            </span>
            <span className="choice-label">
              {world.name}
              <span aria-hidden="true">{selected === world.id ? "✓" : ""}</span>
            </span>
          </button>
        ))}
      </div>
      <details className="choice-info" key={selected}>
        <summary>About {selectedWorld.name}</summary>
        <p>{selectedWorld.description}</p>
      </details>
    </div>
  );
}
