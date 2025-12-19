import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/bedankt/', '/klant/', '/medewerker/'],
    },
    sitemap: 'https://toptalentjobs.nl/sitemap.xml',
  }
}
