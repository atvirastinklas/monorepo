"use client";

import maplibregl from "maplibre-gl";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { MapContext } from "../context/MapContext";
import type { MapContextValue, MapProviderInitialOptions } from "../types/map";

export type MapProviderProps = {
  initialOptions: MapProviderInitialOptions;
  children?: ReactNode;
  className?: string;
  mapClassName?: string;
  mapStyle?: CSSProperties;
};

export function MapProvider({
  initialOptions,
  children,
  className,
  mapClassName = "h-full w-full",
  mapStyle,
}: MapProviderProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const initialOptionsRef = useRef<MapProviderInitialOptions>(initialOptions);

  const getMap = useCallback(() => mapRef.current, []);

  const contextValue = useMemo<MapContextValue>(() => {
    return {
      mapRef,
      getMap,
    };
  }, [getMap]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      ...initialOptionsRef.current,
      container: mapContainerRef.current,
    });

    mapRef.current = map;

    return () => {
      map.remove();

      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <MapContext.Provider value={contextValue}>
      <div className={className}>
        <div ref={mapContainerRef} className={mapClassName} style={mapStyle} />
        {children}
      </div>
    </MapContext.Provider>
  );
}
