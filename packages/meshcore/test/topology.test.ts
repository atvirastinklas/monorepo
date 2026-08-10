import { describe, expect, it } from "vitest";

import {
  consolidateRepeaterTopology,
  deriveNetworkId,
  findMeshcoreIataRegion,
  normalizeBeaconRepeater,
  normalizeRepeater,
  parseMeshcoreProvider,
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

  it("normalizes Beacon repeaters with epoch timestamps and six-character network IDs", () => {
    expect(
      normalizeBeaconRepeater({
        firstSeen: 1_767_225_600_000,
        id: "e3b5f9d2-7881-49fb-8e51-58fd7d2dfe69",
        lastSeen: 1_767_312_000_000,
        lat: 54.7,
        lng: 25.2,
        name: "Beacon Alpha",
        nodeTypeName: "repeater",
        publicKey: "AABBCCDDEEFF0011",
      }),
    ).toEqual({
      createdAt: "2026-01-01T00:00:00.000Z",
      hexId: "aabbccddeeff0011",
      lastHeard: "2026-01-02T00:00:00.000Z",
      lat: 54.7,
      locationIata: "VNO",
      lon: 25.2,
      name: "Beacon Alpha",
      networkId: "aabbcc",
    });
  });

  it("keeps only domestic Beacon repeaters and defaults the provider to Beacon", () => {
    const node = {
      id: "node",
      lat: 54.7,
      lng: 25.2,
      nodeTypeName: "repeater",
      publicKey: "aaaaaaaaaaaaaaaa",
    };

    expect(normalizeBeaconRepeater(node)).not.toBeNull();
    expect(normalizeBeaconRepeater({ ...node, lat: 52.5, lng: 13.4 })).toBeNull();
    expect(normalizeBeaconRepeater({ ...node, nodeTypeName: "companion" })).toBeNull();
    expect(parseMeshcoreProvider(undefined)).toBe("beacon");
    expect(parseMeshcoreProvider("corescope")).toBe("corescope");
    expect(() => parseMeshcoreProvider("other")).toThrow("Unsupported MeshCore provider");
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
