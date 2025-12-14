import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Testimonials - Wat Onze Klanten Zeggen",
  description: "Lees ervaringen van tevreden klanten van TopTalent Jobs. Restaurants, hotels en evenementenbureaus over onze service en personeel.",
};

export default function TestimonialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
