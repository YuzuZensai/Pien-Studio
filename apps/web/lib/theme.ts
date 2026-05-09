export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function surfaceClass(isDark: boolean): string {
  return isDark ? "border-white/10 bg-[#2a2c31]" : "border-black/10 bg-white";
}

export function mutedSurfaceClass(isDark: boolean): string {
  return isDark ? "border-white/10 bg-[#23252a]" : "border-black/10 bg-[#f7f8fa]";
}

export function subtleButtonClass(isDark: boolean): string {
  return isDark
    ? "border-white/15 bg-[#25272b] text-[#e8eaed]"
    : "border-black/15 bg-[#f2f4f8] text-[#1f2430]";
}

export function accentButtonClass(): string {
  return "border-[var(--color-accent-strong)] bg-[var(--color-accent-strong)] text-white";
}

export function hoverSubtleClass(isDark: boolean): string {
  return isDark ? "hover:bg-white/10" : "hover:bg-black/5";
}

export function dividerClass(isDark: boolean): string {
  return isDark ? "bg-white/10" : "bg-black/10";
}

export function panelClass(isDark: boolean): string {
  return cx("rounded border p-3", isDark ? "border-white/10 bg-[#2a2c31]" : "border-black/10 bg-white");
}

export function panelTitleClass(isDark: boolean): string {
  return isDark ? "text-[#dfe3ea]" : "text-[#1f2430]";
}

export function panelCounterClass(isDark: boolean): string {
  return isDark ? "bg-white/10 text-[#cfd4dd]" : "bg-black/5 text-[#586071]";
}

export function panelInsetClass(isDark: boolean): string {
  return isDark ? "border-white/10 bg-[#24262b]" : "border-black/10 bg-[#f6f7f9]";
}
