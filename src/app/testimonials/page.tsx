"use client";

import Link from "next/link";
import Image from "next/image";
import Section from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";

interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  image?: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Martijn de Vries",
    role: "Eigenaar",
    company: "Restaurant De Smaak",
    content: "TopTalent heeft ons enorm geholpen tijdens de drukke zomermaanden. Binnen een dag hadden we ervaren bediening op de vloer. De kwaliteit van het personeel is uitstekend en de communicatie verloopt altijd soepel.",
    rating: 5,
  },
  {
    name: "Sophie Jansen",
    role: "HR Manager",
    company: "Grand Hotel Amsterdam",
    content: "Als HR Manager van een groot hotel heb ik veel ervaring met uitzendbureaus. TopTalent onderscheidt zich door hun persoonlijke aanpak en het begrip van onze specifieke behoeften. Ze leveren niet zomaar personeel, ze leveren de juiste mensen.",
    rating: 5,
  },
  {
    name: "Rick van den Berg",
    role: "Operations Manager",
    company: "Catering Company",
    content: "Voor onze evenementen hebben we regelmatig extra personeel nodig. TopTalent begrijpt de dynamiek van de eventbranche en levert altijd betrouwbare, professionele medewerkers. Een absolute aanrader!",
    rating: 5,
  },
  {
    name: "Emma Bakker",
    role: "Bedrijfsleider",
    company: "Brasserie Het Plein",
    content: "De medewerkers van TopTalent passen perfect in ons team. Ze zijn goed gescreend en weten wat gastvrijheid betekent. Het voelt niet als uitzendkrachten, maar als echte teamleden.",
    rating: 5,
  },
  {
    name: "Thomas Vermeer",
    role: "F&B Director",
    company: "Hotel Group Nederland",
    content: "Wij werken al jaren samen met TopTalent voor zowel tijdelijke als vaste medewerkers. Hun recruitment dienst heeft ons geholpen om enkele van onze beste managers te vinden. Zeer tevreden!",
    rating: 5,
  },
  {
    name: "Lisa de Groot",
    role: "Eventmanager",
    company: "Premium Events",
    content: "Van cocktailparty's tot bedrijfsgala's - TopTalent levert altijd het juiste personeel. De medewerkers zijn representatief, ervaren en weten hoe ze gasten moeten verwelkomen. Onmisbaar voor onze events!",
    rating: 5,
  },
];

const StarIcon = () => (
  <svg className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const QuoteIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
  </svg>
);

export default function TestimonialsPage() {
  return (
    <>
      {/* Page Title */}
      <section className="pt-28 pb-16 bg-gradient-to-b from-white to-neutral-50 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
              Ervaringen
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Wat onze klanten zeggen
            </h1>
            <nav className="flex justify-center items-center gap-3 text-sm text-neutral-500">
              <Link href="/" className="hover:text-[#F97316] transition-colors">Home</Link>
              <span>-</span>
              <span className="text-[#F97316]">Testimonials</span>
            </nav>
          </FadeIn>
        </div>
      </section>

      {/* About Section */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Image Grid */}
            <FadeIn direction="left">
              <div className="relative">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="rounded-2xl overflow-hidden aspect-[4/5] bg-neutral-100">
                      <Image
                        src="/images/dienst-uitzenden.png"
                        alt="Horeca uitzendkracht TopTalent aan het werk in restaurant"
                        width={280}
                        height={350}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="rounded-2xl overflow-hidden aspect-square bg-neutral-100">
                      <Image
                        src="/images/dienst-detachering.png"
                        alt="Gedetacheerd horeca personeel TopTalent in hotel"
                        width={280}
                        height={280}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="rounded-2xl overflow-hidden aspect-square bg-neutral-100">
                      <picture>
                        <source srcSet="/images/dienst-recruitment.webp" type="image/webp" />
                        <Image
                          src="/images/dienst-recruitment.png"
                          alt="Recruitment kandidaat gesprek TopTalent horeca"
                          width={280}
                          height={280}
                          className="w-full h-full object-cover"
                        />
                      </picture>
                    </div>
                    <div className="rounded-2xl overflow-hidden aspect-[4/5] bg-neutral-100">
                      <Image
                        src="/images/barista.png"
                        alt="Professionele barista TopTalent aan het werk"
                        width={280}
                        height={350}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Support Box */}
                <div className="absolute -bottom-6 -right-6 lg:-right-12 bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-2xl p-6 text-white shadow-xl shadow-orange-500/25">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium opacity-90">Online Support</span>
                  </div>
                  <a href="tel:+31649200412" className="text-lg font-bold hover:underline">
                    +31 6 49 20 04 12
                  </a>
                </div>
              </div>
            </FadeIn>

            {/* Content */}
            <FadeIn direction="right" delay={0.2}>
              <div>
                <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                  Over ons
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">
                  Het meest geliefde <span className="text-[#F97316]">Horeca Uitzendbureau</span>
                </h2>
                <p className="text-neutral-600 mb-8 leading-relaxed">
                  Verkozen tot de snelste oplossing voor uw personeelsbehoefte en de makkelijkste partner voor uw HR-uitdagingen.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: "🏆", title: "Beste Service", subtitle: "2024" },
                    { icon: "❤️", title: "Klanten zijn fan", subtitle: "Winter 2024" },
                    { icon: "⭐", title: "Marktleider", subtitle: "Horeca" },
                    { icon: "🤝", title: "Beste Support", subtitle: "24/7" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-neutral-50 rounded-xl hover:bg-orange-50 transition-colors duration-300">
                      <div className="text-2xl">{item.icon}</div>
                      <div>
                        <h4 className="font-semibold text-neutral-900 text-sm">{item.title}</h4>
                        <span className="text-xs text-neutral-500">{item.subtitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </Section.Container>
      </Section>

      {/* Testimonials Grid - Light, Warm & Premium */}
      <section
        className="py-20 lg:py-28 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7F1 18%, #FFF7F1 82%, #FFFFFF 100%)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn>
            <div className="text-center mb-14 lg:mb-16">
              <span className="inline-block text-[#FF7A00] font-semibold text-xs tracking-wider uppercase mb-4 bg-white px-4 py-2 rounded-full border border-orange-100 shadow-sm">
                Testimonials
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1F1F1F]">
                Woorden van onze partners
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <FadeIn key={index} delay={0.08 * index}>
                <div className="relative pt-7">
                  {/* Profile Photo - Overlapping */}
                  <div className="absolute left-6 top-0 z-10">
                    <div
                      className="w-14 h-14 rounded-full overflow-hidden border-[3px] border-white"
                      style={{
                        boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
                      }}
                    >
                      <div className="w-full h-full bg-gradient-to-br from-[#FF7A00] to-[#EA580C] flex items-center justify-center text-white font-bold text-lg">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    </div>
                  </div>

                  {/* Testimonial Card */}
                  <div
                    className="bg-white rounded-[20px] p-8 pt-12 relative group hover:-translate-y-1 transition-all duration-300"
                    style={{
                      boxShadow: '0 20px 50px rgba(0,0,0,0.06)'
                    }}
                  >
                    {/* Quote Icon - Subtle */}
                    <div className="absolute top-6 right-6">
                      <div className="text-[#FF7A00] opacity-25">
                        <QuoteIcon />
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-[#1F1F1F] leading-relaxed mb-6 pr-8">
                      &ldquo;{testimonial.content}&rdquo;
                    </p>

                    {/* Author Info */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-[#1F1F1F]">{testimonial.name}</h4>
                        <span className="text-sm text-neutral-500">{testimonial.role}, {testimonial.company}</span>
                      </div>

                      {/* Rating */}
                      <div className="flex gap-0.5">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <StarIcon key={i} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe / CTA Section */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 relative overflow-hidden">
              {/* Decorative shapes */}
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="text-center lg:text-left">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Blijf op de hoogte van <span className="opacity-80">het laatste nieuws</span>
                  </h2>
                  <p className="text-white/80">Ontvang updates over nieuwe functies, tips en vacatures.</p>
                </div>

                <div className="w-full lg:w-auto">
                  <form className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      placeholder="Uw e-mailadres"
                      className="px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/40 min-w-[280px]"
                    />
                    <button
                      type="submit"
                      className="px-8 py-4 bg-white text-[#F97316] rounded-xl font-semibold hover:bg-neutral-100 transition-colors duration-300"
                    >
                      Inschrijven
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>
    </>
  );
}
