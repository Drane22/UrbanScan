// A short idle lease keeps theme switches warm without retaining GPU resources
// indefinitely after the last canvas unmounts. Device loss starts a fresh session.
type Session = {
  device: GPUDevice;
  users: number;
  lost: boolean;
  idle?: ReturnType<typeof setTimeout>;
};
let pending: Promise<Session> | undefined;
const sessions = new WeakMap<GPUDevice, Session>();

export async function acquireGpuDevice(): Promise<GPUDevice> {
  if (!pending) {
    const next = (async () => {
      if (!navigator.gpu) throw new Error("This browser does not support WebGPU");
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
      if (!adapter) throw new Error("No WebGPU adapter is available");
      const device = await adapter.requestDevice();
      const session: Session = { device, users: 0, lost: false };
      sessions.set(device, session);
      void device.lost.then(() => {
        session.lost = true;
        if (pending === next) pending = undefined;
        clearTimeout(session.idle);
      });
      return session;
    })();
    pending = next;
    void next.catch(() => {
      if (pending === next) pending = undefined;
    });
  }
  const session = await pending;
  if (session.lost) return acquireGpuDevice();
  clearTimeout(session.idle);
  session.users++;
  return session.device;
}

export function releaseGpuDevice(device: GPUDevice): void {
  const session = sessions.get(device);
  if (!session || session.users === 0) return;
  if (--session.users === 0 && !session.lost) {
    session.idle = setTimeout(() => {
      if (session.users === 0) {
        pending = undefined;
        device.destroy();
      }
    }, 30_000);
  }
}
