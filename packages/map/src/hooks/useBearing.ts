import { useCallback } from "react";
import { useMapSnapshot } from "./useMapSnapshot";
import type { MapLibreMap } from "../types/map";

const BEARING_EVENTS = ["rotateend"] as const;

export function useBearing(): number | null {
  const getSnapshot = useCallback((map: MapLibreMap) => map.getBearing(), []);

  return useMapSnapshot({
    events: BEARING_EVENTS,
    getSnapshot,
  });
}
