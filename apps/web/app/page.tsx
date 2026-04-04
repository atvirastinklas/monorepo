import { FeaturesSection } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { HeroSection } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
}
