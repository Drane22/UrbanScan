const PATHS: Record<string, string> = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  qr: "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM21 15v6h-6m6-3h-3",
  replay: "M3 10a9 9 0 1 1 2 8M3 4v6h6",
  minus: "M5 12h14",
  plus: "M5 12h14M12 5v14",
  tree: "M12 3 5 11h4l-5 6h16l-5-6h4zM12 17v4",
  mountain: "m2 20 8-15 4 7 3-5 5 13zM7 11l3 2 3-2",
  city: "M3 21V9h5v12M8 21V3h8v18M16 21v-8h5v8M11 7h2m-2 4h2m-2 4h2M2 21h20",
  circuit: "M7 7h10v10H7zM10 10h4v4h-4M3 8h4m-4 8h4m10-8h4m-4 8h4M8 3v4m8-4v4M8 17v4m8-4v4",
  reef: "M12 21V7M12 15 6 9V5m0 4L3 7M12 17l6-6V6m0 5 3-3M9 4l3 3 3-3",
  colony: "M3 5h18M4 5v15h16V5M6 10h5v4H6zM14 14h4v4h-4zM11 12h5v2M8 14v4h6",
  dungeon: "M4 21V8h4V4h3v4h2V4h3v4h4v13M9 21v-7a3 3 0 0 1 6 0v7M2 21h20",
  origami: "m3 4 18 8-9 9-2-9zM3 4l9 8 9 0M12 12v9",
  glass: "M12 3 3 8v8l9 5 9-5V8zM3 8l9 4 9-4M12 3v18M3 16l9-4 9 4",
  mushroom: "M3 13a9 9 0 0 1 18 0H3zM9 13v6a3 3 0 0 0 6 0v-6M7 9h.01M14 7h.01M17 10h.01",
  orbit: "M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0M3 19c-3-3 13-21 18-14s-13 20-18 14",
  blocks: "M3 10h10v10H3zM13 6h8v14h-8M5 10V7h6v3M15 6V3h4v3M3 15h10m0-3h8",
  waves: "M2 8c4-8 8 8 12 0s8 0 8 0M2 14c4-6 8 6 12 0s8 0 8 0M2 20c4-4 8 4 12 0s8 0 8 0",
  crystal: "m12 2 8 7-3 11H7L4 9zM4 9h16M12 2 8 9l4 11 4-11z",
  mechanical: "M9 3h6l1 4 4 1 1 6-4 2-1 4H9l-1-4-4-1-1-6 4-2zM8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0",
};
export function StudioIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name] ?? PATHS["qr"]} />
    </svg>
  );
}
