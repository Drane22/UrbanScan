import { useEffect, useState } from "react";
import type { EveryQRCodeModel } from "@every-qrcode/react";
import { WORLD_CATALOG, getWorldThumbnail } from "../world-catalog";

/** Paginated, always-visible choices replace the category dropdown and scrollable gallery. */
const PAGE_SIZE = 4;
const pageForWorld = (world: EveryQRCodeModel): number =>
  Math.max(0, Math.floor(WORLD_CATALOG.findIndex((choice) => choice.id === world) / PAGE_SIZE));

export function WorldPicker({
  selected,
  onSelect,
  dark = false,
}: {
  selected: EveryQRCodeModel;
  onSelect: (model: EveryQRCodeModel) => void;
  dark?: boolean;
}): React.JSX.Element {
  const [page, setPage] = useState(() => pageForWorld(selected));
  const pages = Math.ceil(WORLD_CATALOG.length / PAGE_SIZE);
  useEffect(() => setPage(pageForWorld(selected)), [selected]);
  const worlds = WORLD_CATALOG.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  return (
    <div className="world-controls">
      <div className="world-picker-label">
        <strong>Worlds</strong>
        <span aria-live="polite">
          {page + 1} / {pages} · {WORLD_CATALOG.length} styles
        </span>
      </div>
      <button
        className="world-page-button world-page-prev"
        type="button"
        aria-label="Previous worlds"
        disabled={page === 0}
        onClick={() => setPage((current) => Math.max(0, current - 1))}
      >
        <span aria-hidden="true">←</span>
      </button>
      <div className="world-picker" role="group" aria-label="Choose a world">
        {worlds.map((world) => (
          <button
            type="button"
            className="world-card"
            key={world.id}
            aria-pressed={selected === world.id}
            aria-label={`Use ${world.name} world`}
            title={world.description}
            onClick={() => onSelect(world.id)}
          >
            <span className="world-thumbnail">
              <img
                src={getWorldThumbnail(world.id, dark)}
                alt=""
                width={240}
                height={240}
                decoding="async"
                loading="lazy"
              />
            </span>
            <span className="choice-label">
              <span>{world.name}</span>
              <span aria-hidden="true">{selected === world.id ? "✓" : ""}</span>
            </span>
          </button>
        ))}
      </div>
      <button
        className="world-page-button world-page-next"
        type="button"
        aria-label="Next worlds"
        disabled={page + 1 >= pages}
        onClick={() => setPage((current) => Math.min(pages - 1, current + 1))}
      >
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
