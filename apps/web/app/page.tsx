"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { addLayer, createLayer, createProject, parseProjectFile, setCanvasSize } from "@pien-studio/editor-core";
import type { Project } from "@pien-studio/types";
import { deleteProject, duplicateProject, loadProjects, upsertProject } from "@pien-studio/storage";
import { useEditorStore } from "../store/editor-store";
import { useUiStore } from "../store/ui-store";
import { accentButtonClass, cx, mutedSurfaceClass, subtleButtonClass, surfaceClass } from "../lib/theme";
import { UiPreferences } from "../components/ui-preferences";
import { useAssetCleanupJob } from "../hooks/use-asset-cleanup-job";
import { useTranslations } from "../hooks/use-translations";

export default function HomePage() {
  useAssetCleanupJob();
  const router = useRouter();
  const setProject = useEditorStore((s) => s.setProject);
  const { theme, hydrate } = useUiStore((s) => s);
  const { t } = useTranslations();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [showWipModal, setShowWipModal] = React.useState(true);
  const [projectPendingDelete, setProjectPendingDelete] = React.useState<Project | null>(null);
  const projectInputRef = React.useRef<HTMLInputElement | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const isDark = theme === "dark";

  const refreshProjects = React.useCallback(async () => {
    setProjects(await loadProjects());
  }, []);

  React.useEffect(() => {
    hydrate();
    void refreshProjects();
  }, [hydrate, refreshProjects]);

  function openProject(project: Project) {
    setProject(project);
    router.push(`/editor/${project.id}`);
  }

  async function confirmDeleteProject() {
    if (!projectPendingDelete) return;
    await deleteProject(projectPendingDelete.id);
    await refreshProjects();
    setProjectPendingDelete(null);
  }

  async function handleNewProject() {
    const project = createProject(t("home.untitledProject"));
    await upsertProject(project);
    openProject(project);
  }

  async function handleImportProjectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const raw = await file.text();
    try {
      const parsed = parseProjectFile(raw);
      if (!parsed.ok) return;
      await upsertProject(parsed.project);
      await refreshProjects();
      openProject(parsed.project);
    } finally {
      event.target.value = "";
    }
  }

  function handleOpenImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const title = file.name.replace(/\.[^/.]+$/, "") || t("home.imageProject");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const sourceUri = typeof reader.result === "string" ? reader.result : undefined;
        if (!sourceUri) return;

        const imageSize = await new Promise<{ width: number; height: number }>((resolve) => {
          const image = new Image();
          image.onload = () => {
            resolve({
              width: Math.max(1, Math.round(image.naturalWidth)),
              height: Math.max(1, Math.round(image.naturalHeight)),
            });
          };
          image.onerror = () => resolve({ width: 1, height: 1 });
          image.src = sourceUri;
        });

        const base = createProject(title, "free");
        const projectWithImageCanvas = setCanvasSize(base, imageSize.width, imageSize.height);

        const project = addLayer(projectWithImageCanvas, createLayer("image", {
          name: file.name,
          sourceUri,
          x: 0,
          y: 0,
          width: imageSize.width,
          height: imageSize.height,
        }));

        await upsertProject(project);
        await refreshProjects();
        openProject(project);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      {showWipModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setShowWipModal(false)}>
          <div
            className={cx("w-full max-w-lg rounded-2xl border p-5 shadow-2xl", surfaceClass(isDark))}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">{t("home.wipTitle")}</h2>
            <p className={cx("mt-2 text-sm leading-relaxed", isDark ? "text-[#c9ced8]" : "text-[#545d6d]")}>{t("home.wipBody")}</p>
            <p className={cx("mt-3 text-sm leading-relaxed", isDark ? "text-[#c9ced8]" : "text-[#545d6d]")}>
              {t("home.wipSupportPrefix")} {" "}
              <a
                href="https://github.com/sponsors/YuzuZensai"
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-[var(--color-accent-strong)] underline underline-offset-2"
              >
                github.com/sponsors/YuzuZensai
              </a>
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowWipModal(false)}
                className={cx("rounded border px-3 py-1.5 text-sm font-semibold", accentButtonClass())}
              >
                {t("home.wipAcknowledge")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {projectPendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setProjectPendingDelete(null)}>
          <div
            className={cx("w-full max-w-md rounded-2xl border p-5 shadow-2xl", surfaceClass(isDark))}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Delete project?</h2>
            <p className={cx("mt-2 text-sm leading-relaxed", isDark ? "text-[#c9ced8]" : "text-[#545d6d]")}>
              This will permanently delete <span className="font-semibold">{projectPendingDelete.title}</span> from local storage.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProjectPendingDelete(null)}
                className={cx("rounded border px-3 py-1.5 text-sm font-semibold", subtleButtonClass(isDark))}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void confirmDeleteProject();
                }}
                className="rounded border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-sm font-semibold text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main
        className={`min-h-screen w-full px-4 py-5 sm:px-6 ${
          isDark ? "bg-[#1b1d21] text-[#e8eaed]" : "bg-[#f5f6f8] text-[#1f2430]"
        }`}
      >
      <section className={cx("rounded-xl border p-4 sm:p-5", surfaceClass(isDark))}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={cx("text-[10px] uppercase tracking-[0.2em]", isDark ? "text-[#a8abb2]" : "text-[#6c7382]")}>pien.studio</p>
            <h1 className="text-2xl font-semibold">{t("home.projectHub")}</h1>
            <p className={cx("text-sm", isDark ? "text-[#b9bec8]" : "text-[#5f6672]")}>{t("home.createOpenManage")}</p>
          </div>
          <UiPreferences />
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={handleNewProject}
          className={cx("rounded border px-3 py-2 text-sm font-semibold", accentButtonClass())}
        >
          {t("home.newProject")}
        </button>
        <button type="button" onClick={() => projectInputRef.current?.click()} className={cx("rounded border px-3 py-2 text-sm font-semibold", subtleButtonClass(isDark))}>
          {t("home.openProjectFile")}
        </button>
        <button type="button" onClick={() => imageInputRef.current?.click()} className={cx("rounded border px-3 py-2 text-sm font-semibold", subtleButtonClass(isDark))}>
          {t("home.openImage")}
        </button>
        <input ref={projectInputRef} type="file" accept=".json,.pien.json,application/json" className="hidden" onChange={handleImportProjectFile} />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleOpenImage} />
      </section>

      <section className={cx("mt-4 rounded-xl border p-4", surfaceClass(isDark))}>
        <h2 className={cx("mb-3 text-sm font-semibold uppercase tracking-wide", isDark ? "text-[#c5cad3]" : "text-[#6c7382]")}>{t("home.myProjects")}</h2>
        {projects.length === 0 ? <p className={cx("text-sm", isDark ? "text-[#aeb3bc]" : "text-[#5f6672]")}>{t("home.noProjectsYet")}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article key={project.id} className={cx("rounded border p-3", mutedSurfaceClass(isDark))}>
              <p className={cx("truncate text-sm font-semibold", isDark ? "text-[#f3f5f8]" : "text-[#1f2430]")}>{project.title}</p>
              <p className={cx("mt-1 text-xs", isDark ? "text-[#aeb3bc]" : "text-[#5f6672]")}>{new Date(project.updatedAt).toLocaleString()}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openProject(project)}
                  className={cx("rounded border px-2 py-1 text-xs font-semibold", accentButtonClass())}
                >
                  {t("home.open")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void duplicateProject(project.id).then(refreshProjects);
                  }}
                  className={cx("rounded border px-2 py-1 text-xs font-semibold", subtleButtonClass(isDark))}
                >
                  {t("home.duplicate")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProjectPendingDelete(project);
                  }}
                  className="rounded border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs font-semibold text-red-200"
                >
                  {t("home.delete")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      </main>
    </>
  );
}
