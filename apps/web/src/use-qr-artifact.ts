import { useEffect, useState, useSyncExternalStore } from "react";
import { createQRArtifactState } from "./qr-artifact-state";

export function useQRArtifact(initialUrl: string) {
  const [store] = useState(() => createQRArtifactState(initialUrl));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    void store.submit(initialUrl);
    return () => store.cancel();
  }, [initialUrl, store]);
  return { ...state, setDraftUrl: store.setDraftUrl, submit: store.submit };
}
