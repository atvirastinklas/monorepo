import {
  SiEspressif,
  SiNordicsemiconductor,
  SiRaspberrypi,
} from "@icons-pack/react-simple-icons";

import type { DevicePlatform } from "@/lib/device-types";

export function getDevicePlatformLabel(platform: DevicePlatform) {
  switch (platform) {
    case "esp32":
      return "ESP32";
    case "nrf52":
      return "nRF52";
    case "rp2040":
      return "RP2040";
  }
}

export function DevicePlatformIcon({
  platform,
  className,
}: {
  platform: DevicePlatform;
  className?: string;
}) {
  switch (platform) {
    case "esp32":
      return <SiEspressif className={className} color="#E7352C" aria-hidden />;
    case "nrf52":
      return <SiNordicsemiconductor className={className} color="#00A9CE" aria-hidden />;
    case "rp2040":
      return <SiRaspberrypi className={className} color="#A22846" aria-hidden />;
  }
}
