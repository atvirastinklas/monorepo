"use client";

import { Map as MapLibreMap, type MapOptions } from "maplibre-gl";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type MapContextValue = {
    map: MapLibreMap | null;
    ready: boolean;
};

export const MapContext = createContext<MapContextValue>({ map: null, ready: false });
export const useMap = () => useContext(MapContext);

type Props = {
    initialOptions: Omit<MapOptions, "container">;
    children?: React.ReactNode;
    className?: string;
};

export function MapContainer({ initialOptions, children, className }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<MapLibreMap | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;
        const instance = new MapLibreMap({
            ...initialOptions,
            container: containerRef.current,
        });

        if (instance.isStyleLoaded()) {
            setReady(true);
        } else {
            instance.once("load", () => {
                setReady(true);
            });
        }

        setMap(instance);
        return () => {
            setReady(false);
            instance.remove();
            setMap(null);
        };
    }, []);

    const contextValue = useMemo(() => ({ map, ready }), [map, ready]);

    return (
        <MapContext.Provider value={contextValue}>
            <div className={className}>
                <div ref={containerRef} className="w-full h-full" />
                {children}
            </div>
        </MapContext.Provider>
    );
}
