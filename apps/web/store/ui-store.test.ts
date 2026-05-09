import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "./ui-store";

describe("ui store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.setAttribute("data-theme", "dark");
    useUiStore.setState({ theme: "dark", locale: "en" });
  });

  it("hydrates from local storage", () => {
    window.localStorage.setItem("pien.ui.theme", "light");
    window.localStorage.setItem("pien.ui.locale", "ja");
    useUiStore.getState().hydrate();
    expect(useUiStore.getState().theme).toBe("light");
    expect(useUiStore.getState().locale).toBe("ja");
  });

  it("updates and persists theme", () => {
    useUiStore.getState().setTheme("light");
    expect(useUiStore.getState().theme).toBe("light");
    expect(window.localStorage.getItem("pien.ui.theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("updates and persists locale", () => {
    useUiStore.getState().setLocale("th");
    expect(useUiStore.getState().locale).toBe("th");
    expect(window.localStorage.getItem("pien.ui.locale")).toBe("th");
  });
});
