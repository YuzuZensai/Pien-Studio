import { describe, expect, it } from "vitest";
import { createApp } from "./index";

describe("api endpoints", () => {
  it("returns root route info", async () => {
    const app = createApp();
    const response = await app.handle(new Request("http://localhost/"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.name).toBe("pien-api");
  });

  it("returns healthy status", async () => {
    const app = createApp();
    const response = await app.handle(new Request("http://localhost/health"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("returns token for valid device payload", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("http://localhost/auth/device", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: "dev1234", locale: "en" }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.token).toBe("dev_dev1234");
  });
});
