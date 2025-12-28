import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocation, cityOrder } from "@/data/locations";
import { generateBreadcrumbSchema } from "@/components/Breadcrumbs";

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

  // Service-specific FAQ schema met lokale context
  const faqSchemas = {
    uitzenden: {
      utrecht: [
        {
          question: "Hoe snel kan ik horeca personeel krijgen in Utrecht?",
          answer: "Vaak binnen 24 uur. Voor Jaarbeurs events of UIT-week kunnen we soms dezelfde dag personeel leveren in Utrecht centrum en omgeving, afhankelijk van beschikbaarheid."
        },
        {
          question: "Leveren jullie ook personeel voor Jaarbeurs evenementen?",
          answer: "Ja, wij hebben ruime ervaring met grote evenementen bij de Jaarbeurs Utrecht en TivoliVredenburg. Van congrespersoneel tot horecamedewerkers voor festivals."
        },
        {
          question: "Wat zijn de kosten voor uitzendpersoneel in Utrecht?",
          answer: "Tarieven variëren per functie en ervaring. Gebruik onze kosten calculator voor een indicatie of neem contact op voor een prijs op maat voor uw Utrechtse zaak."
        }
      ],
      amsterdam: [
        {
          question: "Hoe snel kan ik horeca personeel krijgen in Amsterdam?",
          answer: "Vaak binnen 24 uur. Voor centrum, Zuidas of Schiphol area kunnen we soms dezelfde dag meertalig personeel leveren, afhankelijk van beschikbaarheid."
        },
        {
          question: "Hebben jullie meertalig personeel voor internationale gasten?",
          answer: "Ja, ons personeel in Amsterdam spreekt vaak Nederlands, Engels, Duits en Frans. Ideaal voor hotels, restaurants met internationale gasten en RAI events."
        },
        {
          question: "Leveren jullie ook personeel voor RAI evenementen?",
          answer: "Ja, wij hebben uitgebreide ervaring met grote events in de RAI Amsterdam, ADE en andere conferenties. Van barpersoneel tot gastheren en gastvrouwen."
        }
      ],
      rotterdam: [
        {
          question: "Hoe snel kan ik horeca personeel krijgen in Rotterdam?",
          answer: "Vaak binnen 24 uur. Voor centrum, Markthal of havengebied kunnen we soms dezelfde dag personeel leveren in heel Rotterdam, afhankelijk van beschikbaarheid."
        },
        {
          question: "Leveren jullie ook personeel voor Ahoy evenementen?",
          answer: "Ja, wij hebben ruime ervaring met grootschalige events in Ahoy Rotterdam, North Sea Jazz en cruise terminal hospitality. Van barmedewerkers tot bediening."
        },
        {
          question: "Werken jullie ook in het havengebied van Rotterdam?",
          answer: "Ja, wij leveren personeel in heel Rotterdam inclusief het havengebied, Schiedam en Vlaardingen. Onze medewerkers kennen de regio goed."
        }
      ]
    },
    detachering: {
      utrecht: [
        {
          question: "Wat is het verschil tussen uitzenden en detachering in Utrecht?",
          answer: "Bij detachering plaatsen we een medewerker voor langere tijd (3-12 maanden) bij uw Utrechtse zaak. Bij uitzenden gaat het om kortere, flexibele inzet voor piekdrukte of events."
        },
        {
          question: "Hoe lang duurt een detacheringsperiode gemiddeld?",
          answer: "Gemiddeld 3 tot 12 maanden. Dit biedt stabiliteit voor uw team zonder langdurige verplichtingen. Na afloop kunt u de medewerker eventueel overnemen."
        },
        {
          question: "Wat zijn de kosten van detachering in Utrecht?",
          answer: "Tarieven zijn afhankelijk van functie, ervaring en duur. Neem contact op voor een vrijblijvende offerte op maat voor uw Utrechtse restaurant of hotel."
        }
      ],
      amsterdam: [
        {
          question: "Wat is het verschil tussen uitzenden en detachering in Amsterdam?",
          answer: "Bij detachering plaatsen we een medewerker voor langere tijd (3-12 maanden) bij uw Amsterdamse zaak. Bij uitzenden gaat het om kortere, flexibele inzet."
        },
        {
          question: "Kan ik een gedetacheerde medewerker overnemen?",
          answer: "Ja, na de detacheringsperiode heeft u de optie om de medewerker in vaste dienst te nemen. Dit is ideaal om eerst te ervaren of de match goed is."
        },
        {
          question: "Regelen jullie ook de administratie?",
          answer: "Ja, wij verzorgen alle HR-administratie, loonadministratie, verzekeringen en belastingen. U heeft geen werkgeversrisico en administratieve rompslomp."
        }
      ],
      rotterdam: [
        {
          question: "Wat is het verschil tussen uitzenden en detachering in Rotterdam?",
          answer: "Bij detachering plaatsen we een medewerker voor langere tijd (3-12 maanden) bij uw Rotterdamse zaak. Bij uitzenden gaat het om kortere, tijdelijke inzet."
        },
        {
          question: "Is detachering geschikt voor mijn restaurant in Rotterdam?",
          answer: "Detachering is ideaal als u structureel extra capaciteit nodig heeft, maar geen vaste medewerker wilt aannemen. Perfect voor seizoenswerk of langere projecten."
        },
        {
          question: "Wat als de gedetacheerde medewerker niet bevalt?",
          answer: "U kunt het contract beëindigen met een korte opzegtermijn. Wij zorgen dan voor een passende vervanging. Uw tevredenheid staat voorop."
        }
      ]
    }
  };

  const faqItems = faqSchemas[service as keyof typeof faqSchemas][city as keyof typeof faqSchemas.uitzenden];

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
