import { useCallback } from "react";
import { useMapSnapshot } from "./useMapSnapshot";
import type { MapLibreMap } from "../types/map";

const PITCH_EVENTS = ["pitchend"] as const;

export function usePitch(): number | null {
  const getSnapshot = useCallback((map: MapLibreMap) => map.getPitch(), []);

  return useMapSnapshot({
    events: PITCH_EVENTS,
    getSnapshot,
  });
}
