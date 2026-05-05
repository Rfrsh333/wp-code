"use client";

import { useRef, useState } from "react";
import { Section } from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";
import { useToast } from "@/components/ui/Toast";

export default function MeerAanvragenPage() {
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 pt-28 pb-20 md:pt-36 md:pb-28">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#F27501]/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-[#F27501]/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <FadeIn>
            <span className="mb-6 inline-block rounded-full border border-[#F27501]/30 bg-[#F27501]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#F27501]">
              Voor installatie- & servicebedrijven
            </span>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
              Binnen 30 dagen meer aanvragen voor jouw servicebedrijf{" "}
              <span className="text-[#F27501]">
                — zonder dat jij iets aan marketing hoeft te doen
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-neutral-300 md:text-xl">
              Wij zorgen ervoor dat mensen die nu zoeken naar jouw dienst, bij
              jou terechtkomen. Niet bij de concurrent.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F27501] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-[#F27501]/25 transition-all hover:bg-[#d96800] hover:shadow-xl hover:shadow-[#F27501]/30"
            >
              Ontvang gratis analyse
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <p className="mt-4 text-sm text-neutral-400">
              Vrijblijvend &middot; Binnen 48 uur reactie &middot; Geen
              verplichtingen
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── PROBLEEM ── */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="mx-auto max-w-3xl">
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-wider text-[#F97316]">
                Herkenbaar?
              </span>
              <h2 className="mb-8 text-3xl font-bold text-neutral-900 md:text-4xl">
                Je bent goed in wat je doet. Maar nieuwe klanten komen met
                pieken en dalen.
              </h2>

              <div className="space-y-5">
                {[
                  "Je bent afhankelijk van mond-tot-mondreclame — en dat is niet genoeg",
                  "Soms heb je het druk, soms zit je zonder werk",
                  "Concurrenten die minder kwaliteit leveren krijgen wél de opdrachten — omdat ze online beter zichtbaar zijn",
                  "Je hebt geen tijd (of zin) om je bezig te houden met websites, advertenties of social media",
                ].map((point, i) => (
                  <FadeIn key={i} delay={0.05 * i}>
                    <div className="flex items-start gap-4 rounded-xl border border-neutral-100 bg-neutral-50 p-5">
                      <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                        <svg
                          className="h-3.5 w-3.5 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </div>
                      <p className="text-neutral-700">{point}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>

              <FadeIn delay={0.3}>
                <p className="mt-8 text-center text-lg font-semibold text-neutral-900">
                  Het probleem is niet jouw vakmanschap.{" "}
                  <span className="text-[#F27501]">
                    Het probleem is dat niemand je kan vinden.
                  </span>
                </p>
              </FadeIn>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* ── OPLOSSING ── */}
      <Section variant="tinted" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-wider text-[#F97316]">
                De oplossing
              </span>
              <h2 className="mb-4 text-3xl font-bold text-neutral-900 md:text-4xl">
                Wat als klanten jóu bellen — in plaats van andersom?
              </h2>
              <p className="mb-12 text-neutral-600">
                Wij maken jouw bedrijf zichtbaar op het moment dat mensen zoeken
                naar wat jij aanbiedt. Geen ingewikkelde marketing. Geen gedoe.
              </p>
            </div>
          </FadeIn>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              {
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                ),
                title: "Gevonden worden",
                text: "Mensen in jouw regio die nu zoeken naar een installateur, loodgieter of monteur, komen bij jou uit.",
              },
              {
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                ),
                title: "Meer aanvragen",
                text: "Via je telefoon, WhatsApp of contactformulier. Echte mensen met echte opdrachten.",
              },
              {
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                ),
                title: "Consistente groei",
                text: "Geen pieken en dalen meer, maar een voorspelbare stroom aan nieuwe klanten.",
              },
            ].map((item, i) => (
              <FadeIn key={i} delay={0.1 * i}>
                <div className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEF3E7]">
                    <svg
                      className="h-6 w-6 text-[#F27501]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {item.icon}
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-neutral-900">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-600">
                    {item.text}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.4}>
            <p className="mt-10 text-center text-lg text-neutral-700">
              Jij doet waar je goed in bent.{" "}
              <span className="font-semibold text-[#F27501]">
                Wij zorgen dat de telefoon blijft gaan.
              </span>
            </p>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* ── RESULTATEN ── */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="mx-auto max-w-3xl">
            <FadeIn>
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-wider text-[#F97316]">
                Resultaten
              </span>
              <h2 className="mb-10 text-3xl font-bold text-neutral-900 md:text-4xl">
                Dit is wat er verandert
              </h2>
            </FadeIn>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Meer aanvragen per week",
                  text: "Zonder zelf achter klanten aan te gaan",
                },
                {
                  title: "Hogere omzet",
                  text: "Doordat je kunt kiezen welke opdrachten je aanneemt",
                },
                {
                  title: "Minder stress",
                  text: "Geen onzekerheid meer over waar de volgende klus vandaan komt",
                },
                {
                  title: "Meer focus",
                  text: "Jij werkt, wij regelen de instroom",
                },
              ].map((item, i) => (
                <FadeIn key={i} delay={0.05 * i}>
                  <div className="flex items-start gap-4 rounded-xl border border-neutral-100 bg-neutral-50 p-5">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                      <svg
                        className="h-3.5 w-3.5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">
                        {item.title}
                      </p>
                      <p className="text-sm text-neutral-600">{item.text}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </Section.Container>
      </Section>

      {/* ── HOE HET WERKT ── */}
      <Section variant="tinted" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="text-center">
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-wider text-[#F97316]">
                Hoe het werkt
              </span>
              <h2 className="mb-12 text-3xl font-bold text-neutral-900 md:text-4xl">
                Zo simpel is het
              </h2>
            </div>
          </FadeIn>

          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "We kijken waar je staat",
                text: "We analyseren hoe jouw bedrijf er nu online voorstaat. Wat werkt, wat niet, en waar de kansen liggen.",
              },
              {
                step: "2",
                title: "We zetten alles op",
                text: "Wij bouwen en draaien campagnes die ervoor zorgen dat klanten in jouw regio jou vinden. Jij hoeft niks te doen.",
              },
              {
                step: "3",
                title: "Jij ontvangt aanvragen",
                text: "Klanten nemen contact op. Jij kiest welke opdrachten je aanneemt. Zo simpel.",
              },
            ].map((item, i) => (
              <FadeIn key={i} delay={0.1 * i}>
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F27501] text-2xl font-bold text-white shadow-lg shadow-[#F27501]/25">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-neutral-900">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-600">
                    {item.text}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Section.Container>
      </Section>

      {/* ── SOCIAL PROOF ── */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="text-center">
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-wider text-[#F97316]">
                Resultaten van onze klanten
              </span>
              <h2 className="mb-12 text-3xl font-bold text-neutral-900 md:text-4xl">
                Bedrijven zoals die van jou
              </h2>
            </div>
          </FadeIn>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {[
              {
                quote:
                  "Ik had geen idee hoeveel klanten ik liet liggen. Binnen de eerste maand had ik al meer aanvragen dan normaal in een heel kwartaal.",
                author: "Installatiebedrijf",
                location: "Regio Zuid-Holland",
              },
              {
                quote:
                  "Eindelijk kan ik kiezen welke klussen ik aanneem, in plaats van hopen dat er iets binnenkomt.",
                author: "Loodgietersbedrijf",
                location: "Regio Utrecht",
              },
            ].map((item, i) => (
              <FadeIn key={i} delay={0.1 * i}>
                <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-8">
                  <svg
                    className="mb-4 h-8 w-8 text-[#F27501]/30"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                  <p className="mb-6 text-lg leading-relaxed text-neutral-700 italic">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {item.author}
                    </p>
                    <p className="text-sm text-neutral-500">{item.location}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.3}>
            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-8 text-center">
              {[
                { value: "3x", label: "meer aanvragen binnen 90 dagen" },
                { value: "15+", label: "branches in de serviceverlening" },
                { value: "93%", label: "blijft na de eerste 3 maanden" },
              ].map((stat, i) => (
                <div key={i}>
                  <p className="text-3xl font-extrabold text-[#F27501] md:text-4xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* ── CTA + FORM ── */}
      <div ref={formRef}>
        <Section variant="tinted" spacing="large">
          <Section.Container>
            <div className="mx-auto max-w-2xl">
              <FadeIn>
                <div className="text-center">
                  <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-wider text-[#F97316]">
                    Gratis analyse
                  </span>
                  <h2 className="mb-4 text-3xl font-bold text-neutral-900 md:text-4xl">
                    Ontdek wat jij laat liggen
                  </h2>
                  <p className="mb-10 text-neutral-600">
                    Wij analyseren gratis hoe jouw bedrijf er online voorstaat.
                    Geen verkooppraatje. Geen verplichting. Gewoon duidelijkheid.
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <LeadForm />
              </FadeIn>
            </div>
          </Section.Container>
        </Section>
      </div>

      {/* ── FAQ ── */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="mx-auto max-w-3xl">
              <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-wider text-[#F97316]">
                Veelgestelde vragen
              </span>
              <h2 className="mb-10 text-3xl font-bold text-neutral-900 md:text-4xl">
                Nog twijfels?
              </h2>

              <div className="space-y-4">
                {[
                  {
                    q: "Moet ik zelf iets doen?",
                    a: "Nee. Wij regelen alles. Het enige wat jij doet is de telefoon opnemen als er een klant belt.",
                  },
                  {
                    q: "Hoe snel zie ik resultaat?",
                    a: "De meeste bedrijven zien binnen 2 tot 4 weken de eerste aanvragen binnenkomen. Binnen 90 dagen heb je een stabiele stroom.",
                  },
                  {
                    q: "Voor wie is dit geschikt?",
                    a: "Voor elk servicebedrijf dat lokaal werkt: installateurs, loodgieters, elektriciens, dakdekkers, schilders, schoonmaakbedrijven, en meer.",
                  },
                  {
                    q: "Wat kost het?",
                    a: "Dat hangt af van jouw situatie. De analyse is gratis en vrijblijvend. Daarna bespreken we wat logisch is voor jouw bedrijf — zonder druk.",
                  },
                  {
                    q: "Zit ik ergens aan vast?",
                    a: "Nee. Geen langlopende contracten. We geloven dat resultaat de beste reden is om te blijven.",
                  },
                ].map((item, i) => (
                  <FadeIn key={i} delay={0.05 * i}>
                    <FAQItem question={item.q} answer={item.a} />
                  </FadeIn>
                ))}
              </div>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

      {/* ── FINAL CTA ── */}
      <section className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <FadeIn>
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              Klaar om te groeien?
            </h2>
            <p className="mb-8 text-lg text-neutral-300">
              Vraag je gratis analyse aan en ontdek binnen 48 uur wat jouw
              bedrijf online laat liggen.
            </p>
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F27501] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-[#F27501]/25 transition-all hover:bg-[#d96800] hover:shadow-xl hover:shadow-[#F27501]/30"
            >
              Start mijn gratis analyse
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </button>
            <p className="mt-4 text-sm text-neutral-400">
              We werken met een beperkt aantal bedrijven per regio — zodat jij
              niet concurreert met onze andere klanten.
            </p>
          </FadeIn>
        </div>
      </section>
    </>
  );
}

/* ─────────────── LEAD FORM ─────────────── */

function LeadForm() {
  const [form, setForm] = useState({
    naam: "",
    bedrijfsnaam: "",
    email: "",
    telefoon: "",
    bericht: "",
  });
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const toast = useToast();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Er ging iets mis");
      }

      setStatus("success");
      toast.success("Aanvraag ontvangen! We nemen snel contact op.");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Er ging iets mis. Probeer het opnieuw."
      );
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-2xl font-bold text-neutral-900">
          Aanvraag ontvangen!
        </h3>
        <p className="text-neutral-600">
          We gaan aan de slag met jouw analyse. Je ontvangt binnen 48 uur een
          reactie.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-neutral-100 bg-white p-8 shadow-sm md:p-10"
    >
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="naam"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Naam *
            </label>
            <input
              id="naam"
              name="naam"
              type="text"
              required
              value={form.naam}
              onChange={handleChange}
              placeholder="Jouw naam"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-[#F27501] focus:bg-white focus:ring-2 focus:ring-[#F27501]/20"
            />
          </div>
          <div>
            <label
              htmlFor="bedrijfsnaam"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Bedrijfsnaam *
            </label>
            <input
              id="bedrijfsnaam"
              name="bedrijfsnaam"
              type="text"
              required
              value={form.bedrijfsnaam}
              onChange={handleChange}
              placeholder="Jouw bedrijf"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-[#F27501] focus:bg-white focus:ring-2 focus:ring-[#F27501]/20"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              E-mail *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="jouw@email.nl"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-[#F27501] focus:bg-white focus:ring-2 focus:ring-[#F27501]/20"
            />
          </div>
          <div>
            <label
              htmlFor="telefoon"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Telefoon{" "}
              <span className="text-neutral-400">(optioneel)</span>
            </label>
            <input
              id="telefoon"
              name="telefoon"
              type="tel"
              value={form.telefoon}
              onChange={handleChange}
              placeholder="06 12345678"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-[#F27501] focus:bg-white focus:ring-2 focus:ring-[#F27501]/20"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="bericht"
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            Waar heb je hulp bij nodig?{" "}
            <span className="text-neutral-400">(optioneel)</span>
          </label>
          <textarea
            id="bericht"
            name="bericht"
            rows={3}
            value={form.bericht}
            onChange={handleChange}
            placeholder="Bijv. meer klanten voor airco installaties in regio Amsterdam"
            className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 outline-none transition-all focus:border-[#F27501] focus:bg-white focus:ring-2 focus:ring-[#F27501]/20"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-6 w-full rounded-xl bg-[#F27501] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-[#F27501]/20 transition-all hover:bg-[#d96800] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting"
          ? "Versturen..."
          : "Ontvang gratis analyse"}
      </button>

      <p className="mt-3 text-center text-xs text-neutral-400">
        Vrijblijvend &middot; Geen spam &middot; Binnen 48 uur reactie
      </p>
    </form>
  );
}

/* ─────────────── FAQ ITEM ─────────────── */

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`rounded-2xl border transition-all ${
        open
          ? "border-[#F27501] shadow-lg shadow-[#F27501]/10"
          : "border-neutral-200 hover:border-[#F27501]/50"
      } bg-white`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all ${
            open
              ? "bg-[#F27501] text-white"
              : "bg-[#FEF3E7] text-[#F27501]"
          }`}
        >
          <svg
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
        <h3
          className={`text-lg font-semibold transition-colors ${
            open ? "text-[#F27501]" : "text-neutral-900"
          }`}
        >
          {question}
        </h3>
      </button>
      <div
        className={`overflow-hidden transition-all ${
          open ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="px-5 pb-5 pl-[4.25rem]">
          <p className="leading-relaxed text-neutral-600">{answer}</p>
        </div>
      </div>
    </div>
  );
}
