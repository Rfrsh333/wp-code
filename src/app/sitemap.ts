import { MetadataRoute } from 'next'
import { blogArticles } from '@/data/blogArticles'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://toptalentjobs.nl'

  // Static pages - gebruik vaste datum voor stabiele crawl signalen
  const contentDate = new Date('2024-12-19')

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
      url: `${baseUrl}/lp/personeel`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/inschrijven`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/personeel-aanvragen`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/testimonials`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: contentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/kosten-calculator`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/locaties`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/locaties/utrecht`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/locaties/amsterdam`,
      lastModified: contentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/voorwaarden`,
      lastModified: contentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: contentDate,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: contentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Blog articles
  const blogPages = Object.keys(blogArticles).map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date(blogArticles[slug].datePublished),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...blogPages]
}
