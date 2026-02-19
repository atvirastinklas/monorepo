import { Footer } from "@/components/landing/footer";
import { HeroSection } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <HeroSection />
      <Footer />
    </div>
  );
}
