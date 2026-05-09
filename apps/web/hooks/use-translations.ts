"use client";

import { useUiStore } from "../store/ui-store";
import en from "../messages/en.json";
import ja from "../messages/ja.json";
import th from "../messages/th.json";

type Messages = typeof en;

const messages: Record<string, Messages> = { en, ja, th };

type TranslationKey = string;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let result: unknown = obj;
  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof result === "string" ? result : path;
}

export function useTranslations() {
  const locale = useUiStore((s) => s.locale);
  const msg = messages[locale] ?? messages.en;

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    let value = getNestedValue(msg as unknown as Record<string, unknown>, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, String(v));
      });
    }
    return value;
  }

  return { t, locale };
}