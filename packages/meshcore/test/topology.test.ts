import { describe, expect, it } from "vitest";

import {
  consolidateRepeaterTopology,
  deriveNetworkId,
  findMeshcoreIataRegion,
  normalizeRepeater,
} from "../src";

describe("MeshCore topology", () => {
  it("assigns known Lithuanian locations to all four IATA regions", () => {
    expect(findMeshcoreIataRegion(25.2, 54.7)).toBe("VNO");
    expect(findMeshcoreIataRegion(23.9, 54.9)).toBe("KUN");
    expect(findMeshcoreIataRegion(23.9, 55.9)).toBe("SQQ");
    expect(findMeshcoreIataRegion(21.2, 55.7)).toBe("PLQ");
    expect(findMeshcoreIataRegion(13.4, 52.5)).toBeNull();
  });

  it("keeps domestic repeaters and rejects foreign, invalid, and unlocatable nodes", () => {
    expect(normalizeRepeater(node())).toMatchObject({
      hexId: "aaaaaaaaaaaaaaaa",
      locationIata: "VNO",
      networkId: "aaaaaa",
    });
    expect(normalizeRepeater(node({ foreign: true }))).toBeNull();
    expect(normalizeRepeater(node({ lat: 0 }))).toBeNull();
    expect(normalizeRepeater(node({ lon: 13.4, lat: 52.5 }))).toBeNull();
    expect(normalizeRepeater(node({ role: "companion" }))).toBeNull();
  });

  it("derives on-air network IDs from hash-size bytes", () => {
    expect(deriveNetworkId("aabbccddeeff", 1)).toBe("aa");
    expect(deriveNetworkId("aabbccddeeff", 3)).toBe("aabbcc");
    expect(deriveNetworkId("aabb", 3)).toBeNull();
  });

  it("creates a deduplicated undirected graph and excludes ambiguous neighbors", () => {
    const topology = consolidateRepeaterTopology(
      [node(), node({ public_key: "bbbbbbbbbbbbbbbb", name: "Beta", lon: 25.3 })],
      {
        edges: [
          { source: "aaaaaaaaaaaaaaaa", target: "bbbbbbbbbbbbbbbb" },
          { source: "aaaaaaaaaaaaaaaa", target: "bbbbbbbbbbbbbbbb" },
          { source: "aaaaaaaaaaaaaaaa", target: "prefix:beef" },
          { source: "aaaaaaaaaaaaaaaa", target: "cccccccccccccccc" },
        ],
      },
    );

    expect(topology.neighborsByRepeater.get("aaaaaaaaaaaaaaaa")).toEqual([
      "bbbbbbbbbbbbbbbb",
      "cccccccccccccccc",
    ]);
    expect(topology.neighborsByRepeater.get("bbbbbbbbbbbbbbbb")).toEqual(["aaaaaaaaaaaaaaaa"]);
  });
});

function node(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    foreign: false,
    hash_size: 3,
    lat: 54.7,
    lon: 25.2,
    name: "Alpha",
    public_key: "aaaaaaaaaaaaaaaa",
    role: "repeater",
    ...overrides,
  };
}
