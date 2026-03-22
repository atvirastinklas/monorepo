import { LayerSpecification } from "maplibre-gl";
import { useMap } from "./map-container";
import { useEffect } from "react";
import { useGeoJsonSource } from "./geojson-source";

export type LayerConfig = Omit<LayerSpecification, "id" | "source">;

export type MapLayerProps = {
    id: string;
    config: LayerConfig;
};

export function MapLayer({ id, config }: MapLayerProps) {
    const mapContainer = useMap();
    const { sourceId } = useGeoJsonSource();

    useEffect(() => {
        if (mapContainer.map == null || sourceId == null) {
            return;
        }

        mapContainer.map.addLayer({
            ...config,
            id: id,
            source: sourceId,
        } as LayerSpecification);

        return () => {
            try {

                mapContainer.map?.removeLayer(id);
            } catch {
                // MapLibre throws once the internal style has been disposed.
            }
        };
    }, [mapContainer, id, config, sourceId]);

    return null;
}
