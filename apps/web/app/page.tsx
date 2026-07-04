import { DevicesShowcase } from "@/components/landing/devices-showcase";
import { FeaturesSection } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { HeroSection } from "@/components/landing/hero";
import { MeshcoreNetworkStats } from "@/components/landing/meshcore-network-stats";
import { Navbar } from "@/components/landing/navbar";

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <MeshcoreNetworkStats />
        <DevicesShowcase />
      </main>
      <Footer />
    </div>
  );
}
