import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocation, cityOrder } from "@/data/locations";
import { generateBreadcrumbSchema } from "@/components/Breadcrumbs";
import {
  generateLocalBusinessSchema,
  generateLocationFAQSchema,
} from "@/lib/schema-helpers";

interface Props {
  params: Promise<{ city: string }>;
  children: React.ReactNode;
}

export async function generateStaticParams() {
  // Exclude utrecht - it has its own standalone route
  return cityOrder.filter((city) => city !== "utrecht").map((city) => ({
    city,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const location = getLocation(city);

  if (!location) {
    return {
      title: "Locatie niet gevonden",
    };
  }

  return {
    title: location.title,
    description: location.description,
    alternates: {
      canonical: `https://toptalentjobs.nl/locaties/${location.slug}`,
    },
    openGraph: {
      title: location.title,
      description: location.description,
      url: `https://toptalentjobs.nl/locaties/${location.slug}`,
      siteName: "TopTalent Jobs",
      locale: "nl_NL",
      type: "website",
    },
  };
}

export default async function CityLayout({ params, children }: Props) {
  const { city } = await params;
  const location = getLocation(city);

  if (!location) {
    notFound();
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Locaties", href: "/locaties" },
    { label: location.name, href: `/locaties/${location.slug}` },
  ];

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);
  const localBusinessSchema = generateLocalBusinessSchema(location);
  const faqSchema = generateLocationFAQSchema(location);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
