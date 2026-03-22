"use client";

import { GeoJSONSource, type GeoJSONSourceSpecification, type Map as MapLibreMap } from "maplibre-gl";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useMap } from "./map-container";

type GeoJsonSourceContextValue = {
    sourceId: string | null;
};

export type GeoJsonData = GeoJSON.GeoJSON | string;
function resolveGeoJsonData(data: GeoJsonData): GeoJsonData {
    if (typeof data !== "string") {
        return data;
    }

    try {
        return new URL(data, window.location.origin).toString();
    } catch {
        return data;
    }
}

function getGeoJsonSource(map: MapLibreMap, id: string) {
    const source = map.getSource(id);
    if (source == null) {
        return null;
    }
    if (!(source instanceof GeoJSONSource)) {
        throw new Error(`Source "${id}" already exists and is not a GeoJSON source.`);
    }
    return source;
}

function removeSourceIfExists(map: MapLibreMap, id: string) {
    try {
        if (map.getSource(id) != null) {
            map.removeSource(id);
        }
    } catch {
        // MapLibre throws once the internal style has been disposed.
    }
}

export const GeoJsonSourceContext = createContext<GeoJsonSourceContextValue>({ sourceId: null });
export const useGeoJsonSource = () => useContext(GeoJsonSourceContext);

type GeoJsonSourceProps = {
    id: string;
    data: GeoJsonData;
    sourceOptions?: Omit<GeoJSONSourceSpecification, "type" | "data">;
    children: React.ReactNode;
};

export function GeoJsonSource({ id, data, sourceOptions, children }: GeoJsonSourceProps) {
    const { map, ready: mapReady } = useMap();
    const resolvedData = useMemo(() => resolveGeoJsonData(data), [data]);
    const [sourceReady, setSourceReady] = useState(false);

    useEffect(() => {
        if (map == null || !mapReady) {
            setSourceReady(false);
            return;
        }

        const source = getGeoJsonSource(map, id);
        if (source == null) {
            map.addSource(id, {
                type: "geojson",
                data: resolvedData,
                ...sourceOptions,
            });
        }
        setSourceReady((currentReady) => (currentReady ? currentReady : true));

        return () => {
            setSourceReady(false);
            removeSourceIfExists(map, id);
        };
    }, [map, mapReady, id, sourceOptions]);

    useEffect(() => {
        if (map == null || !mapReady || !sourceReady) {
            return;
        }

        const source = getGeoJsonSource(map, id);
        if (source == null) {
            return;
        }

        source.setData(resolvedData);
    }, [map, mapReady, sourceReady, id, resolvedData]);

    const contextValue = useMemo(() => ({ sourceId: id }), [id]);

    return (
        <GeoJsonSourceContext.Provider value={contextValue}>
            {sourceReady ? children : null}
        </GeoJsonSourceContext.Provider>
    );
}
