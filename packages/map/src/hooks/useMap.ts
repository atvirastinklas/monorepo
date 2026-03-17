import { useContext } from "react";
import { MapContext } from "../context/MapContext";
import type { MapContextValue } from "../types/map";

export function useMap(): MapContextValue {
  const context = useContext(MapContext);

  if (!context) {
    throw new Error("useMap must be used inside a MapProvider.");
  }

  return context;
}
