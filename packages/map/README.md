# @workspace/map

React-first MapLibre integration for this monorepo.

## Design Rules

- Context exposes only the imperative map handle (`mapRef` / `getMap`).
- Hooks subscribe directly to MapLibre events and derive tiny React snapshots.
- Each hook owns its own local state so only hook consumers rerender.
- Do not mirror full MapLibre internals into React or context.

This keeps updates focused and avoids global rerenders from high-frequency map events.

## Why Context Holds The Handle

`MapLibreMap` is an imperative object with methods (`flyTo`, `setFilter`, `addLayer`, ...).
That object is stable and does not need to trigger React renders by itself.

Putting changing camera state (`zoom`, `bounds`, `center`, etc.) in context would cause broad
context churn and rerender many consumers that do not need those updates.

## Why Hooks Subscribe To Events

Hooks use `useEffect` + map event listeners to compute small snapshots from the imperative map:

- `useCoordinates`
- `useZoom`
- `useBounds`
- `useBearing`
- `usePitch`

This keeps each reactive slice local and explicit.

## Event Frequency Guidance

`useCoordinates` defaults to `moveend`, not `move`, so readouts update at lower frequency.
This is the safe default for docs and typical form/UI integrations.

Use `useCoordinates({ live: true })` when you intentionally need live updates during drag/zoom.

## Basic Usage

```tsx
"use client";

import { MapProvider, useCoordinates } from "@workspace/map";

function CoordinateView() {
  const coordinates = useCoordinates();

  if (!coordinates) return null;

  return <p>{coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}</p>;
}

export function ExampleMap() {
  return (
    <MapProvider
      initialOptions={{
        style: "https://demotiles.maplibre.org/style.json",
        center: [0, 0],
        zoom: 1,
      }}
      mapClassName="h-80 w-full rounded-lg border"
    >
      <CoordinateView />
    </MapProvider>
  );
}
```

Import map styles once in the app-level stylesheet:

```css
@import "@workspace/map/styles.css";
```

## When A Shared App Store Makes Sense

Stay with hook-local read state by default.

Add a shared writable store only when the same state must be changed by multiple independent
features (for example map click selection + sidebar selection controls, globally shared filters,
or search-driven focus controlled from multiple UI entry points).
