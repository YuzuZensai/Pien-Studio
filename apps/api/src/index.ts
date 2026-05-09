import { Elysia } from "elysia";
import { DeviceSessionSchema } from "@pien-studio/types";

export function createApp() {
  return new Elysia()
    .get("/", () => ({
      name: "pien-api",
      status: "ok",
    }))
    .get("/health", () => ({ ok: true, service: "pien-api" }))
    .post("/auth/device", ({ body }) => {
      const parsed = DeviceSessionSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: "invalid_device_payload" }), {
          status: 400,
        });
      }
      return {
        token: `dev_${parsed.data.deviceId}`,
        scope: "local-sync",
      };
    })
    .get("/sync/bootstrap", () => ({
      replication: {
        pull: "/sync/pull",
        push: "/sync/push",
        strategy: "couch-compatible",
      },
    }));
}

if (import.meta.main) {
  createApp().listen(4000);
  console.log("pien api listening on http://localhost:4000");
}
