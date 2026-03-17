import { useEffect, useState } from "react";
import { useMap } from "./useMap";
import type { MapLibreMap, MapSnapshotEventName } from "../types/map";

type UseMapSnapshotConfig<TSnapshot> = {
  events: readonly MapSnapshotEventName[];
  getSnapshot: (map: MapLibreMap) => TSnapshot;
  isEqual?: (previous: TSnapshot, next: TSnapshot) => boolean;
};

export function useMapSnapshot<TSnapshot>({
  events,
  getSnapshot,
  isEqual = Object.is,
}: UseMapSnapshotConfig<TSnapshot>): TSnapshot | null {
  const { getMap } = useMap();
  const [snapshot, setSnapshot] = useState<TSnapshot | null>(null);

  useEffect(() => {
    let frameId: number | null = null;
    let cleanupListeners: (() => void) | null = null;
    let disposed = false;

    const attach = () => {
      if (disposed) {
        return;
      }

      const map = getMap();

      if (!map) {
        frameId = window.requestAnimationFrame(attach);
        return;
      }

      const updateSnapshot = () => {
        if (disposed) {
          return;
        }

        const nextSnapshot = getSnapshot(map);
        setSnapshot((previousSnapshot) => {
          if (
            previousSnapshot !== null &&
            isEqual(previousSnapshot, nextSnapshot)
          ) {
            return previousSnapshot;
          }

          return nextSnapshot;
        });
      };

      updateSnapshot();

      for (const eventName of events) {
        map.on(eventName, updateSnapshot);
      }

      cleanupListeners = () => {
        for (const eventName of events) {
          map.off(eventName, updateSnapshot);
        }
      };
    };

    attach();

    return () => {
      disposed = true;

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      cleanupListeners?.();
    };
  }, [events, getMap, getSnapshot, isEqual]);

  return snapshot;
}
