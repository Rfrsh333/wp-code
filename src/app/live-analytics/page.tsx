import type { Metadata } from "next";
import HeroAnalyticsSection from "@/components/analytics-demo/HeroAnalyticsSection";

export const metadata: Metadata = {
  title: "Live Analytics | ZenithZoom",
  description:
    "Real-time analytics dashboard with interactive 3D globe visualization. Monitor global visitor data, traffic sources, and performance metrics.",
};

export default function LiveAnalyticsPage() {
  return (
    <main>
      <HeroAnalyticsSection />
    </main>
  );
}
