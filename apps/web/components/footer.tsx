"use client";

import { useEffect, useState } from "react";

export function Footer() {
  const [hash, setHash] = useState<string>("...");

  useEffect(() => {
    fetch("/api/commit-hash")
      .then((res) => res.json())
      .then((data) => setHash(data.hash))
      .catch(() => setHash("unknown"));
  }, []);

  return (
    <footer className="fixed bottom-2 right-4 py-1 pointer-events-none">
      <span className="text-xs text-gray-400 font-mono">{hash}</span>
    </footer>
  );
}