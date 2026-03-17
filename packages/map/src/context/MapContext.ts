import { createContext } from "react";
import type { MapContextValue } from "../types/map";

export const MapContext = createContext<MapContextValue | null>(null);
