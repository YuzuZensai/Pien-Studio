import React from "react";
import { AUTOSAVE_DELAY_MS } from "../lib/editor-constants";

type UseEditorAutosaveOptions = {
  isDirty: boolean;
  projectUpdatedAt: string;
  saveCurrentProject: () => Promise<void>;
};

export function useEditorAutosave(options: UseEditorAutosaveOptions) {
  const { isDirty, projectUpdatedAt, saveCurrentProject } = options;
  const autosaveInFlightRef = React.useRef(false);
  const autosaveVersionRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!isDirty) return;
    if (autosaveVersionRef.current === projectUpdatedAt) return;

    const timer = window.setTimeout(() => {
      if (autosaveInFlightRef.current) return;
      autosaveInFlightRef.current = true;
      autosaveVersionRef.current = projectUpdatedAt;
      void saveCurrentProject().finally(() => {
        autosaveInFlightRef.current = false;
      });
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isDirty, projectUpdatedAt, saveCurrentProject]);
}
