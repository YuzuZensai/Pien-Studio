import React from "react";
import Link from "next/link";
import { Redo2, Undo2 } from "lucide-react";
import { UiPreferences } from "../ui-preferences";
import { dividerClass, hoverSubtleClass } from "../../lib/theme";

type EditorHeaderProps = {
  isDark: boolean;
  projectTitle: string;
  canvasWidth: number;
  canvasHeight: number;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  labels: {
    file: string;
    edit: string;
    view: string;
    settings: string;
    save: string;
    exportPng: string;
    exportProjectFile: string;
    importImage: string;
    canvasSize: string;
    undo: string;
    redo: string;
    copy: string;
    cut: string;
    paste: string;
    preferences: string;
    panTool: string;
    pointerTool: string;
    unsavedChanges: string;
    saved: string;
  };
  onSave: () => void;
  onExportPng: () => void;
  onExportProjectFile: () => void;
  onImportImage: () => void;
  onOpenCanvasSize: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onSetHandTool: () => void;
  onSetPointerTool: () => void;
};

export function EditorHeader({
  isDark,
  projectTitle,
  canvasWidth,
  canvasHeight,
  canUndo,
  canRedo,
  isDirty,
  labels,
  onSave,
  onExportPng,
  onExportProjectFile,
  onImportImage,
  onOpenCanvasSize,
  onUndo,
  onRedo,
  onCopy,
  onCut,
  onPaste,
  onSetHandTool,
  onSetPointerTool,
}: EditorHeaderProps) {
  const menuClass = `absolute left-0 top-full z-30 min-w-[180px] rounded border p-1 text-[11px] opacity-0 shadow-xl transition-opacity pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 hover:pointer-events-auto hover:opacity-100 ${
    isDark ? "border-white/10 bg-[#2a2c31] text-[#e2e5ea]" : "border-black/10 bg-white text-[#1f2430]"
  }`;

  return (
    <header className={`flex h-14 items-center justify-between border-b px-4 ${isDark ? "border-white/10 bg-[#2b2d31]" : "border-black/10 bg-white"}`}>
      <div className="flex items-center gap-4">
        <Link href="/" className="group">
          <p className={`text-[10px] uppercase tracking-[0.2em] group-hover:opacity-80 ${isDark ? "text-[#a8abb2]" : "text-[#6c7382]"}`}>
            pien.studio
          </p>
          <h1 className={`text-sm font-semibold group-hover:opacity-80 ${isDark ? "text-[#f5f7fa]" : "text-[#1f2430]"}`}>{projectTitle}</h1>
        </Link>

        <nav className="flex items-center gap-2 text-xs font-medium">
          <MenuShell isDark={isDark} label={labels.file} menuClass={menuClass}>
            <FileMenu
              isDark={isDark}
              labels={labels}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              onSave={onSave}
              onExportPng={onExportPng}
              onExportProjectFile={onExportProjectFile}
              onImportImage={onImportImage}
              onOpenCanvasSize={onOpenCanvasSize}
            />
          </MenuShell>
          <MenuShell isDark={isDark} label={labels.edit} menuClass={menuClass}>
            <EditMenu isDark={isDark} labels={labels} canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} onCopy={onCopy} onCut={onCut} onPaste={onPaste} />
          </MenuShell>
          <MenuShell isDark={isDark} label={labels.view} menuClass={menuClass}>
            <ViewMenu isDark={isDark} labels={labels} onSetHandTool={onSetHandTool} onSetPointerTool={onSetPointerTool} />
          </MenuShell>
          <MenuShell isDark={isDark} label={labels.settings} menuClass={menuClass}>
            <SettingsMenu isDark={isDark} preferences={labels.preferences} />
          </MenuShell>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title={labels.undo}
          className={`rounded border px-2.5 py-1.5 text-xs font-medium ${
            isDark ? "border-white/15 bg-[#25272b] text-[#d7dae0]" : "border-black/15 bg-[#f2f4f8] text-[#1f2430]"
          } ${!canUndo ? "opacity-50" : "hover:opacity-90"}`}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title={labels.redo}
          className={`rounded border px-2.5 py-1.5 text-xs font-medium ${
            isDark ? "border-white/15 bg-[#25272b] text-[#d7dae0]" : "border-black/15 bg-[#f2f4f8] text-[#1f2430]"
          } ${!canRedo ? "opacity-50" : "hover:opacity-90"}`}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
        <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${isDark ? "text-[#a8abb2]" : "text-[#6c7382]"}`}>
          {isDirty ? labels.unsavedChanges : labels.saved}
        </span>
      </div>
    </header>
  );
}

function MenuShell({ isDark, label, menuClass, children }: { isDark: boolean; label: string; menuClass: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      <button type="button" className={`rounded px-2 py-1 ${isDark ? "text-[#d7dae0] hover:bg-white/10" : "text-[#1f2430] hover:bg-black/5"}`}>
        {label}
      </button>
      <div className={menuClass} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function FileMenu({
  isDark,
  labels,
  canvasWidth,
  canvasHeight,
  onSave,
  onExportPng,
  onExportProjectFile,
  onImportImage,
  onOpenCanvasSize,
}: {
  isDark: boolean;
  labels: EditorHeaderProps["labels"];
  canvasWidth: number;
  canvasHeight: number;
  onSave: () => void;
  onExportPng: () => void;
  onExportProjectFile: () => void;
  onImportImage: () => void;
  onOpenCanvasSize: () => void;
}) {
  return (
    <div className="space-y-1">
      <button type="button" onClick={onSave} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>{labels.save}</button>
      <div className={`my-1 h-px ${dividerClass(isDark)}`} />
      <button type="button" onClick={onExportPng} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>{labels.exportPng}</button>
      <button type="button" onClick={onExportProjectFile} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>{labels.exportProjectFile}</button>
      <div className={`my-1 h-px ${dividerClass(isDark)}`} />
      <button type="button" onClick={onImportImage} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>{labels.importImage}</button>
      <button type="button" onClick={onOpenCanvasSize} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>{labels.canvasSize} ({canvasWidth} x {canvasHeight})</button>
    </div>
  );
}

function EditMenu({
  isDark,
  labels,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCopy,
  onCut,
  onPaste,
}: {
  isDark: boolean;
  labels: EditorHeaderProps["labels"];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
}) {
  return (
    <div className="space-y-1">
      <button type="button" onClick={onUndo} disabled={!canUndo} className={`w-full rounded px-2 py-1 text-left ${!canUndo ? "opacity-50" : hoverSubtleClass(isDark)}`}>{labels.undo}</button>
      <button type="button" onClick={onRedo} disabled={!canRedo} className={`w-full rounded px-2 py-1 text-left ${!canRedo ? "opacity-50" : hoverSubtleClass(isDark)}`}>{labels.redo}</button>
      <div className={`my-1 h-px ${dividerClass(isDark)}`} />
      <button type="button" onClick={onCopy} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>{labels.copy}</button>
      <button type="button" onClick={onCut} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>{labels.cut}</button>
      <button type="button" onClick={onPaste} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>{labels.paste}</button>
    </div>
  );
}

function ViewMenu({ isDark, labels, onSetHandTool, onSetPointerTool }: { isDark: boolean; labels: EditorHeaderProps["labels"]; onSetHandTool: () => void; onSetPointerTool: () => void }) {
  return (
    <div className="space-y-1">
      <button type="button" onClick={onSetHandTool} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>{labels.panTool}</button>
      <button type="button" onClick={onSetPointerTool} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>{labels.pointerTool}</button>
    </div>
  );
}

function SettingsMenu({ isDark, preferences }: { isDark: boolean; preferences: string }) {
  return (
    <div className="space-y-2 p-1">
      <p className={`px-2 text-[10px] font-semibold uppercase tracking-wide ${isDark ? "text-[#9aa1ad]" : "text-[#6c7382]"}`}>{preferences}</p>
      <UiPreferences />
    </div>
  );
}
