"use client";

import { useEffect, useState } from "react";

const BUILD_HASH = process.env.NEXT_PUBLIC_GIT_HASH || "unknown";
const SHOULD_LOAD_DEV_HASH = process.env.NODE_ENV === "development" && BUILD_HASH === "unknown";

function formatHash(hash: string) {
  return hash === "unknown" ? hash : hash.slice(0, 7);
}

export function Footer() {
  const [hash, setHash] = useState(formatHash(BUILD_HASH));

  useEffect(() => {
    if (!SHOULD_LOAD_DEV_HASH) return;

    fetch("/api/commit-hash")
      .then((res) => res.json())
      .then((data: { hash?: string }) => setHash(formatHash(data.hash || "unknown")))
      .catch(() => setHash("unknown"));
  }, []);

  return (
    <footer className="fixed bottom-2 right-4 py-1 pointer-events-none">
      <span className="text-xs text-gray-400 font-mono">{hash}</span>
    </footer>
  );
}
