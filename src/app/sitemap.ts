import { MetadataRoute } from 'next'
import { cityOrder } from '@/data/locations'
import { getAllBlogSlugs } from '@/data/blogArticles'
import { getAllFunctieSlugs } from '@/data/functies'
import { supabaseAdmin } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.toptalentjobs.nl'

  // Vaste datums per contentgroep voor betrouwbare crawl-signalen
  // (Google negeert lastModified als het bij elke crawl verandert)
  const coreDate = new Date('2026-05-01')
  const contentDate = new Date('2026-05-13')

  // ALLEEN indexeerbare pagina's (zie src/proxy.ts whitelist)
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: contentDate,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/diensten/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/diensten/uitzenden/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/diensten/detachering/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/diensten/recruitment/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/locaties/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/over-ons/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/testimonials/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/kosten-calculator/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/personeel-aanvragen/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/inschrijven/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/functies/`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/`,
      lastModified: contentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/afspraak-plannen/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/kennismaking-plannen/`,
      lastModified: coreDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy/`,
      lastModified: new Date('2026-01-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/voorwaarden/`,
      lastModified: new Date('2026-01-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Location overview pages
  const locationPages = cityOrder.map((city) => ({
    url: `${baseUrl}/locaties/${city}/`,
    lastModified: coreDate,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  // Location service pages - NIEUW! (alle stad/dienst combinaties)
  const servicePages: MetadataRoute.Sitemap = []
  const services = ['uitzenden', 'detachering']

  for (const city of cityOrder) {
    for (const service of services) {
      servicePages.push({
        url: `${baseUrl}/locaties/${city}/${service}/`,
        lastModified: coreDate,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })
    }
  }

  // Blog articles
  const blogSlugs = getAllBlogSlugs()
  const blogPages = blogSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}/`,
    lastModified: contentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Editorial articles (AI-gegenereerd)
  let editorialPages: MetadataRoute.Sitemap = []
  try {
    const { data: editorialSlugs } = await supabaseAdmin
      .from('editorial_drafts')
      .select('slug, published_at')
      .eq('review_status', 'published')

    if (editorialSlugs) {
      editorialPages = editorialSlugs.map((item) => ({
        url: `${baseUrl}/blog/editorial/${item.slug}/`,
        lastModified: item.published_at ? new Date(item.published_at) : contentDate,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    }
  } catch {
    // Silently fail if Supabase is unreachable during build
  }

  // FAQ hub + individual FAQ pages
  const faqHubPage: MetadataRoute.Sitemap = [{
    url: `${baseUrl}/veelgestelde-vragen/`,
    lastModified: contentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }]

  let faqPages: MetadataRoute.Sitemap = []
  try {
    const { data: faqSlugs } = await supabaseAdmin
      .from('faq_items')
      .select('slug')
      .eq('status', 'published')

    if (faqSlugs) {
      faqPages = faqSlugs.map((item) => ({
        url: `${baseUrl}/veelgestelde-vragen/${item.slug}/`,
        lastModified: contentDate,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    }
  } catch {
    // Silently fail if Supabase is unreachable during build
  }

  // Geo content pages (AI-gegenereerde lokale content)
  let geoPages: MetadataRoute.Sitemap = []
  try {
    const { data: geoSlugs } = await supabaseAdmin
      .from('geo_content')
      .select('slug, gepubliceerd_op')
      .eq('status', 'gepubliceerd')

    if (geoSlugs) {
      geoPages = geoSlugs.map((item) => ({
        url: `${baseUrl}/geo/${item.slug}/`,
        lastModified: item.gepubliceerd_op ? new Date(item.gepubliceerd_op) : contentDate,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    }
  } catch {
    // Silently fail if Supabase is unreachable during build
  }

  // Functies pages (programmatic SEO)
  const functieSlugs = getAllFunctieSlugs()
  const functiePages = functieSlugs.map((slug) => ({
    url: `${baseUrl}/functies/${slug}/`,
    lastModified: contentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...locationPages, ...servicePages, ...functiePages, ...blogPages, ...editorialPages, ...faqHubPage, ...faqPages, ...geoPages]
}
