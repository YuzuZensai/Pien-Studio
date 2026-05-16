import { NextResponse } from "next/server";
import { execSync } from "child_process";

export function GET() {
  const hash = execSync("git rev-parse --short HEAD").toString().trim();
  return NextResponse.json({ hash });
}