import { useCallback } from "react";
import { useMapSnapshot } from "./useMapSnapshot";
import type {
  MapCoordinates,
  MapLibreMap,
  MapSnapshotOptions,
} from "../types/map";

const LIVE_EVENTS = ["move"] as const;
const DEFAULT_EVENTS = ["moveend"] as const;

export function useCoordinates(
  options: MapSnapshotOptions = {},
): MapCoordinates | null {
  const { live = false } = options;
  const events = live ? LIVE_EVENTS : DEFAULT_EVENTS;

  const getSnapshot = useCallback((map: MapLibreMap) => {
    const center = map.getCenter();

    return {
      lng: center.lng,
      lat: center.lat,
    };
  }, []);

  const isEqual = useCallback(
    (previous: MapCoordinates, next: MapCoordinates) =>
      previous.lng === next.lng && previous.lat === next.lat,
    [],
  );

  // Defaulting to moveend avoids high-frequency updates for basic readouts.
  return useMapSnapshot({
    events,
    getSnapshot,
    isEqual,
  });
}
