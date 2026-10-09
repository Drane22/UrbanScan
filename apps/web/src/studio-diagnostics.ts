export type StudioEvent =
  | "controls-ready"
  | "qr-ready"
  | "qr-error"
  | "world-ready"
  | "world-fallback"
  | "png-ready"
  | "png-error"
  | "download-started"
  | "share-completed"
  | "share-cancelled";
/** Local, bounded User Timing entries. Never accept URLs, messages or arbitrary detail. */
export function recordStudioEvent(event: StudioEvent, started = 0): void {
  if (typeof window === "undefined" || typeof performance.measure !== "function") return;
  try {
    const name = "urbanscan:" + event;
    if (performance.getEntriesByName(name).length >= 20) performance.clearMeasures(name);
    performance.measure(name, { start: Math.max(0, started), end: performance.now() });
  } catch {
    // Restricted User Timing support must never prevent QR creation or a download.
  }
}
export function startStudioTiming(): (event: StudioEvent) => void {
  const start = performance.now();
  let done = false;
  return (event) => {
    if (done) return;
    done = true;
    recordStudioEvent(event, start);
  };
}
