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

const stats = [
  { value: "100+", label: "Tevreden Klanten" },
  { value: "98%", label: "Klanttevredenheid" },
  { value: "500+", label: "Succesvolle Plaatsingen" },
  { value: "24u", label: "Gemiddelde Responstijd" },
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
                        alt="TopTalent Service"
                        width={280}
                        height={350}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="rounded-2xl overflow-hidden aspect-square bg-neutral-100">
                      <Image
                        src="/images/dienst-detachering.png"
                        alt="TopTalent Detachering"
                        width={280}
                        height={280}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="rounded-2xl overflow-hidden aspect-square bg-neutral-100">
                      <Image
                        src="/images/dienst-recruitment.png"
                        alt="TopTalent Recruitment"
                        width={280}
                        height={280}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="rounded-2xl overflow-hidden aspect-[4/5] bg-neutral-100">
                      <Image
                        src="/images/barista.png"
                        alt="TopTalent Team"
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

      {/* Testimonials Grid */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-[#1F2937] to-[#111827] relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-white/10 px-4 py-2 rounded-full border border-white/20">
                Testimonials
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Woorden van onze partners
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <FadeIn key={index} delay={0.1 * index}>
                <div className="bg-white rounded-2xl p-6 lg:p-8 relative group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  {/* Shape/Pattern */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-transparent rounded-bl-full opacity-50"></div>

                  {/* Quote Icon */}
                  <div className="absolute top-6 right-6 w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white transition-all duration-300">
                    <QuoteIcon />
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900">{testimonial.name}</h4>
                      <span className="text-sm text-neutral-500">{testimonial.role}, {testimonial.company}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-neutral-600 leading-relaxed mb-4">
                    {testimonial.content}
                  </p>

                  {/* Rating */}
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <StarIcon key={i} />
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <Section variant="white" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="text-center mb-12">
              <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                Onze cijfers
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900">
                Vertrouwd door de beste in de branche
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((stat, index) => (
              <FadeIn key={index} delay={0.1 * index}>
                <div className="text-center p-6 lg:p-8 bg-neutral-50 rounded-2xl hover:bg-orange-50 transition-colors duration-300 group">
                  <div className="text-4xl lg:text-5xl font-bold text-[#F97316] mb-2 group-hover:scale-110 transition-transform duration-300">
                    {stat.value}
                  </div>
                  <p className="text-neutral-600">{stat.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Section.Container>
      </Section>

      {/* Video CTA Section */}
      <Section variant="tinted" spacing="large">
        <Section.Container>
          <FadeIn>
            <div className="relative rounded-3xl overflow-hidden">
              <div className="aspect-video lg:aspect-[21/9] bg-gradient-to-r from-neutral-900 to-neutral-800 relative">
                {/* Background Image Placeholder */}
                <div className="absolute inset-0 bg-[url('/images/barista.png')] bg-cover bg-center opacity-30"></div>

                {/* Content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <button className="w-20 h-20 bg-[#F97316] rounded-full flex items-center justify-center mb-6 mx-auto hover:bg-[#EA580C] transition-colors duration-300 hover:scale-110 transform shadow-xl shadow-orange-500/30">
                      <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    <p className="text-lg font-medium">Bekijk onze video</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </Section.Container>
      </Section>

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
