import { MetadataRoute } from 'next'
import { cityOrder } from '@/data/locations'
import { getAllBlogSlugs } from '@/data/blogArticles'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.toptalentjobs.nl'

  // Static pages - gebruik vaste datum voor stabiele crawl signalen
  const contentDate = new Date('2024-12-19')

  // ALLEEN indexeerbare pagina's (zie src/proxy.ts whitelist)
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: contentDate,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/diensten`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/diensten/uitzenden`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/diensten/detachering`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/diensten/recruitment`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/locaties`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/over-ons`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/testimonials`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/kosten-calculator`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/personeel-aanvragen`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/inschrijven`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: contentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: contentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/voorwaarden`,
      lastModified: contentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Location overview pages
  const locationPages = cityOrder.map((city) => ({
    url: `${baseUrl}/locaties/${city}`,
    lastModified: contentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  // Location service pages - NIEUW! (alle stad/dienst combinaties)
  const servicePages: MetadataRoute.Sitemap = []
  const services = ['uitzenden', 'detachering']

  for (const city of cityOrder) {
    for (const service of services) {
      servicePages.push({
        url: `${baseUrl}/locaties/${city}/${service}`,
        lastModified: contentDate,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })
    }
  }

  // Blog articles
  const blogSlugs = getAllBlogSlugs()
  const blogPages = blogSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: contentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...locationPages, ...servicePages, ...blogPages]
}
