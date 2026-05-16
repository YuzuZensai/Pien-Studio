"use client";

import React from "react";
import { useUiStore } from "../store/ui-store";
import { isDarkTheme } from "../store/ui-store";
import { cx, subtleButtonClass } from "../lib/theme";
import { useTranslations } from "../hooks/use-translations";

export function UiPreferences({ compact = false }: { compact?: boolean }) {
  const { theme, locale, setTheme, setLocale } = useUiStore((s) => s);
  const { t } = useTranslations();
  const isDark = isDarkTheme(theme);
  const wrapperHeight = compact ? "h-7" : "h-9";
  const textSize = compact ? "text-[10px]" : "text-xs";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={cx("inline-flex items-center rounded border px-2", subtleButtonClass(isDark), wrapperHeight)}>
        <span className={cx("mr-2 font-semibold opacity-70", textSize)}>{t("ui.locale")}</span>
        <select
          aria-label={t("ui.locale")}
          value={locale}
          onChange={(event) => setLocale(event.target.value as "en" | "th" | "ja")}
          className={cx(
            "bg-transparent font-semibold outline-none",
            textSize,
            isDark ? "text-[#f5f7fa]" : "text-[#1f2430]",
          )}
        >
          <option value="en">English</option>
          <option value="th">Thai</option>
          <option value="ja">Japanese</option>
        </select>
      </label>
      <button
        type="button"
        onClick={() => {
          const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
          setTheme(next);
        }}
        className={cx("rounded border px-3 font-semibold", subtleButtonClass(isDark), wrapperHeight, textSize)}
      >
        {theme === "dark" ? t("ui.darkMode") : theme === "system" ? t("ui.systemMode") : t("ui.lightMode")}
      </button>
    </div>
  );
}