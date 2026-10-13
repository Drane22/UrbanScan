import { createQRArtifact, parseLink, type QRArtifact } from "@every-qrcode/core";
import { startStudioTiming } from "./studio-diagnostics";

export type QRArtifactState = {
  readonly draftUrl: string;
  readonly artifact: QRArtifact | null;
  readonly revision: number;
  readonly pending: boolean;
  readonly error: string | null;
};

export function createQRArtifactState(
  initialUrl: string,
  create: (url: string) => Promise<QRArtifact> = createQRArtifact,
) {
  let state: QRArtifactState = {
    draftUrl: initialUrl,
    artifact: null,
    revision: 0,
    pending: false,
    error: null,
  };
  let request = 0;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: QRArtifactState) => {
    state = next;
    for (const listener of listeners) listener();
  };
  const store = {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setDraftUrl(draftUrl: string) {
      clearTimeout(debounce);
      request++;
      let unchanged = false;
      try {
        unchanged = parseLink(draftUrl).payloadUrl === state.artifact?.identity.link.payloadUrl;
      } catch {
        // Validate after the typing pause, not on every keystroke.
      }
      publish({ ...state, draftUrl, pending: !unchanged, error: null });
      if (!unchanged) debounce = setTimeout(() => void store.submit(draftUrl, true), 350);
    },
    cancel() {
      clearTimeout(debounce);
      request++;
      publish({ ...state, pending: false });
    },
    async submit(value = state.draftUrl, preserveDraft = false): Promise<boolean> {
      clearTimeout(debounce);
      const timing = startStudioTiming();
      const ticket = ++request;
      const draftAtSubmit = state.draftUrl;
      publish({ ...state, pending: true, error: null });
      try {
        const artifact = await create(value.trim());
        if (ticket !== request) return false;
        timing("qr-ready");
        publish({
          ...state,
          artifact,
          revision: ticket,
          pending: false,
          error: null,
          draftUrl:
            !preserveDraft && state.draftUrl === draftAtSubmit
              ? artifact.identity.link.payloadUrl
              : state.draftUrl,
        });
        return true;
      } catch (reason) {
        if (ticket !== request) return false;
        timing("qr-error");
        publish({
          ...state,
          pending: false,
          error:
            reason instanceof Error ? reason.message : "Could not create this QR code. Try again.",
        });
        return false;
      }
    },
  };
  return store;
}
