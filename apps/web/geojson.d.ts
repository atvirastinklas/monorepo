declare namespace GeoJSON {
  type Geometry = {
    type: string;
    coordinates?: unknown;
  };

  interface Feature<G extends Geometry | null = Geometry, P = Record<string, unknown> | null> {
    type: "Feature";
    geometry: G;
    properties: P;
  }

  interface FeatureCollection<
    G extends Geometry | null = Geometry,
    P = Record<string, unknown> | null,
  > {
    type: "FeatureCollection";
    features: Feature<G, P>[];
  }
}

