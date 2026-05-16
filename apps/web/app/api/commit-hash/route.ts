import { execSync } from "child_process";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ hash: process.env.NEXT_PUBLIC_GIT_HASH || "unknown" });
  }

  try {
    const hash = execSync("git rev-parse --short HEAD", { cwd: process.cwd() }).toString().trim();
    return NextResponse.json({ hash });
  } catch {
    return NextResponse.json({ hash: "unknown" });
  }
}
