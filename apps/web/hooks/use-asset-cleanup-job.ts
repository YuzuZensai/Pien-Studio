"use client";

import React from "react";
import { startAssetCleanupJob } from "@pien-studio/storage";

export function useAssetCleanupJob() {
  React.useEffect(() => {
    const stop = startAssetCleanupJob();
    return () => stop();
  }, []);
}
