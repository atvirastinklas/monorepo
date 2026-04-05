/** Must match the Zod schema in `content-collections.ts`. */
export type DeviceType = "companion" | "repeater" | "standalone";

/** Must match the Zod schema in `content-collections.ts`. */
export type SupportedMeshStack = "meshcore" | "meshtastic";

/** Must match the Zod schema in `content-collections.ts`. */
export type DeviceProductKind = "developmentKit" | "finishedProduct";

/** Must match the Zod schema in `content-collections.ts`. */
export type DevicePlatform = "esp32" | "nrf52" | "rp2040";
