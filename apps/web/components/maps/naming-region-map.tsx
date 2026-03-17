"use client";

import { MapProvider, useCoordinates } from "@workspace/map";

const initialOptions = {
  style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  center: [0, 0] as [number, number],
  zoom: 1,
};

function CoordinateView() {
  const coordinates = useCoordinates();

  if (!coordinates) {
    return (
      <p className="text-sm text-fd-muted-foreground">Map center: loading...</p>
    );
  }

  return (
    <p className="text-sm text-fd-muted-foreground">
      Map center: {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
    </p>
  );
}

export const NamingRegionMap = () => {
  return (
    <div className="not-prose space-y-2">
      <MapProvider
        initialOptions={initialOptions}
        mapClassName="h-80 w-full overflow-hidden rounded-lg border"
      >
        <CoordinateView />
      </MapProvider>
    </div>
  );
};
