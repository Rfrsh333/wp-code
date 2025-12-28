import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocation } from "@/data/locations";

interface Props {
  params: Promise<{ city: string }>;
}

export default async function CityPage({ params }: Props) {
  const { city } = await params;
  const location = getLocation(city);

  if (!location) {
    notFound();
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
          Horeca Personeel {location.name}
        </h1>
        <p className="text-xl text-neutral-600 mb-8">{location.heroText}</p>
      </div>
    </div>
  );
}
