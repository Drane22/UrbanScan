import { createQRArtifact, type QRArtifact } from "@every-qrcode/core";

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
  const listeners = new Set<() => void>();
  const publish = (next: QRArtifactState) => {
    state = next;
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setDraftUrl(draftUrl: string) {
      publish({ ...state, draftUrl, error: null });
    },
    cancel() {
      request++;
      publish({ ...state, pending: false });
    },
    async submit(value = state.draftUrl): Promise<boolean> {
      const ticket = ++request;
      const draftAtSubmit = state.draftUrl;
      publish({ ...state, pending: true, error: null });
      try {
        const artifact = await create(value.trim());
        if (ticket !== request) return false;
        publish({
          ...state,
          artifact,
          revision: ticket,
          pending: false,
          error: null,
          draftUrl:
            state.draftUrl === draftAtSubmit ? artifact.identity.link.payloadUrl : state.draftUrl,
        });
        return true;
      } catch (reason) {
        if (ticket !== request) return false;
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
}
