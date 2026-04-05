import type { Root } from "fumadocs-core/page-tree";

import makerMetaConfig from "@/content/devices/meta.json";
import type { DevicePlatform, DeviceType } from "@/lib/device-types";
import { type Device, allDevices as collectedDevices } from "content-collections";

const LANDING_SECTION_ORDER = ["companion", "repeaters", "standalone"] as const;
type DeviceMakerMeta = {
  label: string;
};

type DeviceMakersMeta = Record<string, DeviceMakerMeta>;

type ResolvedDeviceDocument = Device & {
  makerSlug: string;
  deviceSlug: string;
  slugSegments: [string, string];
  url: string;
  mdx: string;
};
export type DeviceDocument = ResolvedDeviceDocument;
export type LandingDeviceSectionId = (typeof LANDING_SECTION_ORDER)[number];

export type DeviceShowcaseItem = {
  id: string;
  name: string;
  brand: string;
  imageSrc?: string;
  deprecated: boolean;
  platform: DevicePlatform;
  primaryHref?: string;
  url: string;
};

export type DeviceShowcaseSectionSpec = {
  id: LandingDeviceSectionId;
  items: DeviceShowcaseItem[];
};

export type DeviceMakerGroup = {
  makerSlug: string;
  makerLabel: string;
  devices: ResolvedDeviceDocument[];
};

const makerMeta = makerMetaConfig as DeviceMakersMeta;

function isResolvedDeviceDocument(device: Device): device is ResolvedDeviceDocument {
  return Boolean(
    device.makerSlug &&
    device.deviceSlug &&
    device.url &&
    device.mdx &&
    device.slugSegments?.length === 2,
  );
}

function getMakerLabel(makerSlug: string) {
  return makerMeta[makerSlug]?.label ?? makerSlug;
}

function compareDevices(a: ResolvedDeviceDocument, b: ResolvedDeviceDocument) {
  const makerName = a.makerSlug.localeCompare(b.makerSlug);

  if (makerName !== 0) {
    return makerName;
  }

  return a.title.localeCompare(b.title, "lt");
}

export const allDevices = [...collectedDevices]
  .filter(isResolvedDeviceDocument)
  .sort(compareDevices);

export function getDeviceBySlug(slugSegments: string[]) {
  if (slugSegments.length !== 2) {
    return undefined;
  }

  const [makerSlug, deviceSlug] = slugSegments;

  return allDevices.find(
    (device) => device.makerSlug === makerSlug && device.deviceSlug === deviceSlug,
  );
}

export function getAllDeviceParams() {
  return allDevices.map((device) => ({
    slug: device.slugSegments,
  }));
}

export function getDefaultDevicePath() {
  return allDevices[0]?.url ?? "/zinynas";
}

export function getDevicesGroupedByMaker(): DeviceMakerGroup[] {
  const groups = new Map<string, DeviceDocument[]>();

  for (const device of allDevices) {
    const items = groups.get(device.makerSlug) ?? [];
    items.push(device);
    groups.set(device.makerSlug, items);
  }

  return [...groups.entries()].map(([makerSlug, devices]) => ({
    makerSlug,
    makerLabel: getMakerLabel(makerSlug),
    devices,
  }));
}

export function getDevicesPageTree(): Root {
  return {
    name: "Įrenginiai",
    children: getDevicesGroupedByMaker().map((group) => ({
      type: "folder" as const,
      name: group.makerLabel,
      defaultOpen: true,
      children: group.devices.map((device) => ({
        type: "page" as const,
        name: device.title,
        url: device.url,
      })),
    })),
  };
}

function getLandingSectionId(deviceType: DeviceType): LandingDeviceSectionId {
  if (deviceType === "repeater") {
    return "repeaters";
  }

  return deviceType;
}

export function getLandingDeviceSections(): DeviceShowcaseSectionSpec[] {
  const sections = new Map<LandingDeviceSectionId, DeviceShowcaseItem[]>();

  for (const sectionId of LANDING_SECTION_ORDER) {
    sections.set(sectionId, []);
  }

  for (const device of allDevices) {
    if (!device.featured) {
      continue;
    }

    const sectionId = getLandingSectionId(device.deviceType);
    const items = sections.get(sectionId);

    if (!items) {
      continue;
    }

    items.push({
      id: `${device.makerSlug}-${device.deviceSlug}`,
      name: device.title,
      brand: device.brand,
      imageSrc: device.photo,
      deprecated: device.deprecated,
      platform: device.platform,
      url: device.url,
    });
  }

  return LANDING_SECTION_ORDER.map((id) => ({
    id,
    items: sections.get(id) ?? [],
  })).filter((section) => section.items.length > 0);
}
