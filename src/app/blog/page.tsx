import Link from "next/link";
import Image from "next/image";
import { Section, Container } from "@/components/Section";
import FadeIn from "@/components/animations/FadeIn";

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  image: string;
  slug: string;
}

const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "Horecapersoneel inhuren: De complete gids voor 2025",
    excerpt: "Alles wat u moet weten over het inhuren van horecapersoneel. Van uitzendkrachten tot vaste medewerkers, wij leggen alle opties uit inclusief kosten, voordelen en valkuilen.",
    category: "Recruitment",
    author: "TopTalent Team",
    date: "14 december 2024",
    image: "/images/blog-horecapersoneel-inhuren.jpg",
    slug: "horecapersoneel-inhuren-gids-2025",
  },
  {
    id: 2,
    title: "Personeelstekort horeca oplossen: 7 bewezen strategieën",
    excerpt: "Het personeelstekort in de horeca is een grote uitdaging. Ontdek 7 effectieve strategieën om toch voldoende personeel te vinden en te behouden voor uw restaurant of hotel.",
    category: "HR",
    author: "TopTalent Team",
    date: "12 december 2024",
    image: "/images/blog-personeelstekort.jpg",
    slug: "personeelstekort-horeca-oplossen",
  },
  {
    id: 4,
    title: "Werken als uitzendkracht in de horeca: salaris en voordelen",
    excerpt: "Overweeg je om als uitzendkracht in de horeca te werken? Lees alles over het salaris, de voordelen, flexibiliteit en doorgroeimogelijkheden in deze complete gids.",
    category: "Carrière",
    author: "TopTalent Team",
    date: "8 december 2024",
    image: "/images/blog-werken-als-uitzendkracht.jpg",
    slug: "werken-uitzendkracht-horeca-salaris",
  },
  {
    id: 5,
    title: "Evenementenpersoneel inhuren: checklist voor organisatoren",
    excerpt: "Organiseert u een evenement, festival of bedrijfsfeest? Deze checklist helpt u bij het inhuren van het juiste horecapersoneel voor een geslaagd event.",
    category: "Evenementen",
    author: "TopTalent Team",
    date: "5 december 2024",
    image: "/images/blog-evenementenpersoneel.jpg",
    slug: "evenementenpersoneel-inhuren-checklist",
  },
  {
    id: 6,
    title: "Detachering vs uitzenden: welke vorm past bij uw bedrijf?",
    excerpt: "Wat is het verschil tussen detachering en uitzenden? Wij vergelijken beide vormen op kosten, flexibiliteit, binding en geschiktheid voor verschillende situaties.",
    category: "Detachering",
    author: "TopTalent Team",
    date: "3 december 2024",
    image: "/images/blog-detachering-vs-uitzenden.jpg",
    slug: "detachering-vs-uitzenden-verschil",
  },
  {
    id: 7,
    title: "Horecamedewerker worden zonder ervaring: zo begin je",
    excerpt: "Wil je in de horeca werken maar heb je geen ervaring? Geen probleem! Lees hoe je kunt starten, welke functies geschikt zijn voor beginners en hoe je snel leert.",
    category: "Carrière",
    author: "TopTalent Team",
    date: "1 december 2024",
    image: "/images/blog-horecamedewerker-zonder-ervaring.jpg",
    slug: "horecamedewerker-worden-zonder-ervaring",
  },
  {
    id: 8,
    title: "De 10 meest gevraagde horecafuncties in Nederland",
    excerpt: "Van barista tot sous-chef: dit zijn de meest gevraagde functies in de Nederlandse horeca. Inclusief salarissen, vereisten en doorgroeimogelijkheden per functie.",
    category: "Carrière",
    author: "TopTalent Team",
    date: "28 november 2024",
    image: "/images/blog-meest-gevraagde-functies.jpg",
    slug: "meest-gevraagde-horecafuncties-nederland",
  },
  {
    id: 9,
    title: "Restaurant openen? Zo stel je het perfecte team samen",
    excerpt: "Een nieuw restaurant openen begint met het juiste team. Ontdek welke functies u nodig heeft, hoeveel personeel en hoe u de beste mensen vindt en behoudt.",
    category: "Management",
    author: "TopTalent Team",
    date: "25 november 2024",
    image: "/images/dienst-recruitment.png",
    slug: "restaurant-openen-team-samenstellen",
  },
  {
    id: 10,
    title: "Seizoenspersoneel horeca: voorbereid op de zomer",
    excerpt: "De zomer betekent terrassen en drukte. Leer hoe u tijdig seizoenspersoneel werft, inwerkt en behoudt voor een succesvolle zomerperiode in uw horecazaak.",
    category: "Uitzenden",
    author: "TopTalent Team",
    date: "22 november 2024",
    image: "/images/dienst-uitzenden.png",
    slug: "seizoenspersoneel-horeca-zomer",
  },
  {
    id: 11,
    title: "CAO Horeca 2025: dit verandert er voor werkgevers",
    excerpt: "De nieuwe CAO Horeca brengt veranderingen in salaris, toeslagen en arbeidsvoorwaarden. Een overzicht van de belangrijkste wijzigingen voor horecaondernemers.",
    category: "HR",
    author: "TopTalent Team",
    date: "20 november 2024",
    image: "/images/dienst-detachering.png",
    slug: "cao-horeca-2025-wijzigingen",
  },
  {
    id: 12,
    title: "Horeca personeelsplanning: tips voor een efficiënt rooster",
    excerpt: "Een goede personeelsplanning bespaart kosten en voorkomt stress. Praktische tips voor het maken van een efficiënt werkrooster in uw restaurant of café.",
    category: "Management",
    author: "TopTalent Team",
    date: "18 november 2024",
    image: "/images/barista.png",
    slug: "horeca-personeelsplanning-rooster-tips",
  },
];

const categories = [
  { name: "Recruitment", count: 3 },
  { name: "Uitzenden", count: 3 },
  { name: "Detachering", count: 1 },
  { name: "HR", count: 2 },
  { name: "Management", count: 2 },
  { name: "Carrière", count: 3 },
  { name: "Evenementen", count: 1 },
];

const recentPosts = blogPosts.slice(0, 3);

const tags = ["Horecapersoneel", "Uitzendkracht", "Personeelstekort", "Salaris", "Evenementen", "Restaurant", "CAO Horeca", "Flexwerk"];

export default function BlogPage() {
  return (
    <>
      {/* Page Title */}
      <section className="pt-28 pb-16 bg-gradient-to-b from-white to-neutral-50 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <span className="inline-block text-[#F97316] font-semibold text-xs tracking-wider uppercase mb-4 bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
              Nieuws & Inzichten
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Blog
            </h1>
            <nav className="flex justify-center items-center gap-3 text-sm text-neutral-500">
              <Link href="/" className="hover:text-[#F97316] transition-colors">Home</Link>
              <span>-</span>
              <span className="text-[#F97316]">Blog</span>
            </nav>
          </FadeIn>
        </div>
      </section>

      {/* Blog Grid with Sidebar */}
      <Section variant="white" spacing="large">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Sidebar */}
            <div className="order-2 lg:order-1 lg:col-span-1">
              <div className="sticky top-24 space-y-8">
                {/* Search Widget */}
                <FadeIn>
                  <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Zoeken..."
                        className="w-full px-4 py-3 pr-12 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#F97316] transition-colors"
                      />
                      <button className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#F97316] transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </FadeIn>

                {/* Categories Widget */}
                <FadeIn delay={0.1}>
                  <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
                    <h3 className="text-lg font-bold text-neutral-900 mb-4 pb-3 border-b-2 border-orange-100">
                      Categorieën
                    </h3>
                    <ul className="space-y-3">
                      {categories.map((category, index) => (
                        <li key={index}>
                          <Link
                            href={`/blog?category=${category.name.toLowerCase()}`}
                            className="flex justify-between items-center py-2 text-neutral-600 hover:text-[#F97316] transition-colors border-b border-neutral-50"
                          >
                            <span>{category.name}</span>
                            <span className="text-[#F97316] font-medium text-sm">({category.count})</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>

                {/* Recent Posts Widget */}
                <FadeIn delay={0.2}>
                  <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
                    <h3 className="text-lg font-bold text-neutral-900 mb-4 pb-3 border-b-2 border-orange-100">
                      Recente berichten
                    </h3>
                    <div className="space-y-4">
                      {recentPosts.map((post, index) => (
                        <Link
                          key={index}
                          href={`/blog/${post.slug}`}
                          className="flex gap-4 group"
                        >
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-100">
                            <Image
                              src={post.image}
                              alt={post.title}
                              width={80}
                              height={80}
                              sizes="80px"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-neutral-900 text-sm line-clamp-2 group-hover:text-[#F97316] transition-colors">
                              {post.title}
                            </h4>
                            <span className="text-xs text-neutral-500 mt-1 block">{post.date}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </FadeIn>

                {/* Tags Widget */}
                <FadeIn delay={0.3}>
                  <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
                    <h3 className="text-lg font-bold text-neutral-900 mb-4 pb-3 border-b-2 border-orange-100">
                      Populaire tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <Link
                          key={index}
                          href={`/blog?tag=${tag.toLowerCase()}`}
                          className="px-4 py-2 bg-neutral-50 text-neutral-600 text-sm rounded-lg hover:bg-[#F97316] hover:text-white transition-all duration-300"
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                </FadeIn>

                {/* Download Widget */}
                <FadeIn delay={0.4}>
                  <div className="bg-gradient-to-br from-[#1F2937] to-[#111827] rounded-2xl p-6 text-white relative overflow-hidden">
                    {/* Decorative shape */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#F97316]/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10">
                      <div className="w-16 h-20 bg-white/10 rounded-lg flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-lg mb-2">
                        De 2024 gids voor <span className="text-[#F97316]">Horecapersoneel</span>
                      </h4>
                      <p className="text-white/70 text-sm mb-4">
                        Alles wat u moet weten over werving in de horeca.
                      </p>
                      <button className="w-full bg-[#F97316] text-white py-3 rounded-xl font-semibold hover:bg-[#EA580C] transition-colors">
                        Download E-book
                      </button>
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>

            {/* Blog Grid */}
            <div className="order-1 lg:order-2 lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {blogPosts.map((post, index) => (
                  <FadeIn key={post.id} delay={0.05 * index}>
                    <article className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                      {/* Image */}
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={post.image}
                          alt={post.title}
                          width={400}
                          height={250}
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="absolute top-4 left-4 bg-[#F97316] text-white text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wide">
                          {post.category}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <Link href={`/blog/${post.slug}`}>
                          <h3 className="font-bold text-lg text-neutral-900 mb-3 line-clamp-2 group-hover:text-[#F97316] transition-colors">
                            {post.title}
                          </h3>
                        </Link>
                        <p className="text-neutral-600 text-sm mb-4 line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-neutral-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {post.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {post.date}
                          </span>
                        </div>
                      </div>
                    </article>
                  </FadeIn>
                ))}
              </div>

              {/* Pagination */}
              <FadeIn delay={0.5}>
                <div className="flex justify-center items-center gap-2 mt-12">
                  <button className="w-12 h-12 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:border-[#F97316] hover:text-[#F97316] transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  {[1, 2, 3].map((page) => (
                    <button
                      key={page}
                      className={`w-12 h-12 rounded-full font-medium transition-colors ${
                        page === 1
                          ? "bg-[#F97316] text-white"
                          : "border border-neutral-200 text-neutral-600 hover:border-[#F97316] hover:text-[#F97316]"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button className="w-12 h-12 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 hover:border-[#F97316] hover:text-[#F97316] transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </FadeIn>
            </div>
          </div>
        </Container>
      </Section>

      {/* Subscribe Section */}
      <Section variant="tinted" spacing="large">
        <Container>
          <FadeIn>
            <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-3xl p-12 lg:p-16 relative overflow-hidden">
              {/* Decorative shapes */}
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>

              <div className="relative z-10 text-center max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Schrijf je in voor de <span className="opacity-80">nieuwsbrief</span>
                </h2>
                <p className="text-white/80 mb-8">
                  Ontvang de nieuwste tips, trends en vacatures direct in je inbox.
                </p>

                <form className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                  <input
                    type="email"
                    placeholder="Uw e-mailadres"
                    className="flex-1 px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/40"
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
          </FadeIn>
        </Container>
      </Section>
    </>
  );
}
