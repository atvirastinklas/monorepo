import { redirect } from "next/navigation";

import { getDefaultDevicePath } from "@/lib/devices";

export default function Page() {
  redirect(getDefaultDevicePath());
}
