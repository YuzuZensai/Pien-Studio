import React from "react";
import { createProject } from "@pien-studio/editor-core";
import { upsertProject } from "@pien-studio/storage";

type Translator = (key: string, params?: Record<string, string | number>) => string;

type UseEditorProjectLifecycleOptions = {
  projectId: string;
  hydrate: () => void;
  loadProjectById: (projectId: string) => Promise<boolean>;
  setProject: (project: ReturnType<typeof createProject>) => void;
  t: Translator;
};

export function useEditorProjectLifecycle(options: UseEditorProjectLifecycleOptions) {
  const { projectId, hydrate, loadProjectById, setProject, t } = options;
  const initializedProjectId = React.useRef<string | null>(null);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (initializedProjectId.current === projectId) return;
    initializedProjectId.current = projectId;

    if (projectId === "new") {
      const nextProject = createProject(t("home.untitledProject"));
      setProject(nextProject);
      void upsertProject(nextProject);
      return;
    }
    void loadProjectById(projectId);
  }, [loadProjectById, projectId, setProject, t]);
}
