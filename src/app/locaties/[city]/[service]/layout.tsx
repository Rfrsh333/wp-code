import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocation, cityOrder } from "@/data/locations";
import { generateBreadcrumbSchema } from "@/components/Breadcrumbs";
import { getLocationServiceFAQs } from "@/data/location-service-faqs";

interface Props {
  params: Promise<{ city: string; service: string }>;
  children: React.ReactNode;
}

const validServices = ["uitzenden", "detachering"];

export async function generateStaticParams() {
  const params = [];
  for (const city of cityOrder) {
    for (const service of validServices) {
      params.push({ city, service });
    }
  }
  return params;
}

// SEO metadata per stad/dienst combinatie
const getServiceMetadata = (city: string, service: string, locationName: string) => {
  const serviceNames = {
    uitzenden: "Horeca Uitzenden",
    detachering: "Horeca Detachering"
  };

  const serviceName = serviceNames[service as keyof typeof serviceNames];

  const titles = {
    uitzenden: {
      utrecht: `Horeca Uitzenden Utrecht | Tijdelijk personeel binnen 24 uur`,
      amsterdam: `Horeca Uitzenden Amsterdam | Flexibel personeel centrum & Zuidas`,
      rotterdam: `Horeca Uitzenden Rotterdam | Snel personeel haven & centrum`
    },
    detachering: {
      utrecht: `Detachering Utrecht | Vaste horecakracht zonder werkgeversrisico`,
      amsterdam: `Detachering Amsterdam | Langdurig horeca personeel centrum`,
      rotterdam: `Detachering Rotterdam | Stabiel personeel voor uw zaak`
    }
  };

  const descriptions = {
    uitzenden: {
      utrecht: `Horeca uitzenden in Utrecht en omgeving. Snel tijdelijk personeel voor restaurants, hotels en Jaarbeurs events. Binnen 24 uur beschikbaar. Lokale expertise sinds jaren.`,
      amsterdam: `Flexibel horeca personeel uitzenden in Amsterdam. Van centrum tot Zuidas, voor restaurants, hotels en RAI events. Meertalig personeel binnen 24 uur beschikbaar.`,
      rotterdam: `Horeca uitzendbureau Rotterdam. Tijdelijk personeel voor Markthal, havengebied en Ahoy events. Snel inzetbaar, binnen 24 uur op locatie.`
    },
    detachering: {
      utrecht: `Horeca detachering Utrecht. Vaste medewerker voor langere periode zonder werkgeversrisico. Ideaal voor restaurants, hotels en TivoliVredenburg. Stabiel en betrouwbaar.`,
      amsterdam: `Detachering horeca Amsterdam. Langdurig personeel voor uw zaak zonder vaste lasten. Ervaring met high-end horeca en internationale gasten. Flexibel contract.`,
      rotterdam: `Horeca detachering Rotterdam. Stabiele kracht voor uw team zonder werkgeversrisico. Ervaring met Rotterdamse horeca van Markthal tot cruise terminal.`
    }
  };

  return {
    title: titles[service as keyof typeof titles][city as keyof typeof titles.uitzenden],
    description: descriptions[service as keyof typeof descriptions][city as keyof typeof descriptions.uitzenden]
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, service } = await params;
  const location = getLocation(city);

  if (!location || !validServices.includes(service)) {
    return {
      title: "Pagina niet gevonden"
    };
  }

  const { title, description } = getServiceMetadata(city, service, location.name);

  return {
    title,
    description,
    alternates: {
      canonical: `https://toptalentjobs.nl/locaties/${city}/${service}`
    },
    openGraph: {
      title,
      description,
      url: `https://toptalentjobs.nl/locaties/${city}/${service}`,
      siteName: "TopTalent Jobs",
      locale: "nl_NL",
      type: "website"
    }
  };
}

export default async function ServiceLayout({ params, children }: Props) {
  const { city, service } = await params;
  const location = getLocation(city);

  if (!location || !validServices.includes(service)) {
    notFound();
  }

  const serviceLabels = {
    uitzenden: "Uitzenden",
    detachering: "Detachering"
  };

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Locaties", href: "/locaties" },
    { label: location.name, href: `/locaties/${city}` },
    {
      label: serviceLabels[service as keyof typeof serviceLabels],
      href: `/locaties/${city}/${service}`
    }
  ];

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  // FAQ items uit centrale data bron (single source of truth)
  const faqItems = getLocationServiceFAQs(
    service as "uitzenden" | "detachering",
    city as "utrecht" | "amsterdam" | "rotterdam"
  );

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
