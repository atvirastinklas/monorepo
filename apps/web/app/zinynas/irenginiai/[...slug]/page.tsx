import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppDeviceDocsPage } from "@/components/docs/device-docs-page";
import { getAllDeviceParams, getDeviceBySlug } from "@/lib/devices";

type DeviceDocsPageProps = {
  params: Promise<{
    slug: string[];
  }>;
};

export default async function Page({ params }: DeviceDocsPageProps) {
  const { slug } = await params;
  const device = getDeviceBySlug(slug);

  if (!device) {
    notFound();
  }

  return <AppDeviceDocsPage device={device} />;
}

export async function generateStaticParams() {
  return getAllDeviceParams();
}

export async function generateMetadata({ params }: DeviceDocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const device = getDeviceBySlug(slug);

  if (!device) {
    notFound();
  }

  return {
    title: device.title,
    description: device.description,
  };
}
