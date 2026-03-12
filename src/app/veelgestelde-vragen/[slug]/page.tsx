import { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Section, Container } from "@/components/Section";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  slug: string;
  view_count: number;
}

// Generate static params voor alle gepubliceerde FAQ's
export async function generateStaticParams() {
  const { data } = await supabaseAdmin
    .from("faq_items")
    .select("slug")
    .eq("status", "published");

  return (data || []).map((item) => ({
    slug: item.slug,
  }));
}

// Dynamic metadata per vraag
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: faq } = await supabaseAdmin
    .from("faq_items")
    .select("question, answer, category")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!faq) return { title: "Vraag niet gevonden" };

  const shortAnswer = faq.answer.slice(0, 155).replace(/\n/g, " ");

  return {
    title: faq.question,
    description: `${shortAnswer}... Lees het volledige antwoord van TopTalent Jobs.`,
    alternates: {
      canonical: `https://www.toptalentjobs.nl/veelgestelde-vragen/${slug}`,
    },
    openGraph: {
      title: faq.question,
      description: shortAnswer,
      url: `https://www.toptalentjobs.nl/veelgestelde-vragen/${slug}`,
      siteName: "TopTalent Jobs",
      locale: "nl_NL",
      type: "article",
    },
  };
}

export const revalidate = 3600;

export default async function FAQDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: faq } = await supabaseAdmin
    .from("faq_items")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!faq) notFound();

  const typedFaq = faq as FAQItem;

  // Gerelateerde vragen (zelfde categorie)
  const { data: related } = await supabaseAdmin
    .from("faq_items")
    .select("question, slug, category")
    .eq("status", "published")
    .eq("category", typedFaq.category)
    .neq("id", typedFaq.id)
    .limit(5);

  // Increment view count
  supabaseAdmin
    .from("faq_items")
    .update({ view_count: (typedFaq.view_count || 0) + 1 })
    .eq("id", typedFaq.id)
    .then();

  // QAPage schema
  const qaSchema = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "mainEntity": {
      "@type": "Question",
      "name": typedFaq.question,
      "text": typedFaq.question,
      "answerCount": 1,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": typedFaq.answer,
        "author": {
          "@type": "Organization",
          "name": "TopTalent Jobs",
          "url": "https://www.toptalentjobs.nl",
        },
      },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.toptalentjobs.nl",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Veelgestelde vragen",
        "item": "https://www.toptalentjobs.nl/veelgestelde-vragen",
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": typedFaq.question.slice(0, 50),
        "item": `https://www.toptalentjobs.nl/veelgestelde-vragen/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(qaSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Breadcrumb nav */}
      <Section variant="white" spacing="small">
        <Container>
          <nav className="flex items-center gap-2 text-sm text-neutral-500">
            <Link href="/" className="hover:text-[#F97316]">Home</Link>
            <span>/</span>
            <Link href="/veelgestelde-vragen" className="hover:text-[#F97316]">
              Veelgestelde vragen
            </Link>
            <span>/</span>
            <span className="text-neutral-700 font-medium truncate max-w-xs">
              {typedFaq.category}
            </span>
          </nav>
        </Container>
      </Section>

      {/* Main content */}
      <Section variant="white" spacing="large">
        <Container>
          <div className="max-w-3xl mx-auto">
            <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
              {typedFaq.category}
            </span>

            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-8 leading-tight">
              {typedFaq.question}
            </h1>

            <div className="text-neutral-700 text-lg leading-relaxed">
              {typedFaq.answer.split("\n\n").map((paragraph: string, i: number) => (
                <p key={i} className="mb-4">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10 bg-orange-50 border border-orange-100 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-neutral-900">
                  Meer weten of direct personeel aanvragen?
                </p>
                <p className="text-sm text-neutral-600 mt-1">
                  Neem contact op of vraag vrijblijvend personeel aan.
                </p>
              </div>
              <Link
                href="/personeel-aanvragen"
                className="bg-[#F27501] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#d96800] transition-colors whitespace-nowrap"
              >
                Personeel aanvragen
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* Related questions */}
      {related && related.length > 0 && (
        <Section variant="tinted" spacing="large">
          <Container>
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">
                Gerelateerde vragen
              </h2>
              <div className="space-y-3">
                {related.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/veelgestelde-vragen/${item.slug}`}
                    className="block bg-white rounded-xl border border-neutral-200 px-6 py-4 hover:border-[#F97316]/30 hover:shadow-sm transition-all group"
                  >
                    <span className="font-medium text-neutral-900 group-hover:text-[#F97316] transition-colors">
                      {item.question}
                    </span>
                    <span className="text-[#F97316] text-sm ml-2">&rarr;</span>
                  </Link>
                ))}
              </div>
              <div className="mt-8 text-center">
                <Link
                  href="/veelgestelde-vragen"
                  className="inline-flex items-center gap-2 text-[#F97316] font-semibold hover:gap-3 transition-all"
                >
                  &larr; Terug naar alle vragen
                </Link>
              </div>
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}
