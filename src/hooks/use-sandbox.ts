"use client";

import { useCallback, useRef } from "react";
import { useSyncExternalStore } from "react";
import { ContainerEngine, createSeedEngine } from "@/lib/container-sandbox-engine";

let sharedEngine: ContainerEngine | null = null;

export function getSharedEngine(): ContainerEngine {
  if (!sharedEngine) sharedEngine = createSeedEngine();
  return sharedEngine;
}

export function resetSharedEngine(): ContainerEngine {
  sharedEngine = createSeedEngine();
  return sharedEngine;
}

export function useSandbox(seed?: () => ContainerEngine) {
  const ref = useRef<ContainerEngine | null>(null);
  if (!ref.current) ref.current = seed ? seed() : getSharedEngine();
  const engine = ref.current;
  const version = useSyncExternalStore(
    useCallback((cb) => engine.subscribe(cb), [engine]),
    useCallback(() => engine.getVersion(), [engine]),
    useCallback(() => engine.getVersion(), [engine]),
  );
  return { engine, version };
}
