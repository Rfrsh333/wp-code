import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/bedankt/',
        '/klant/',
        '/medewerker/',
        '/wp-content/',
        '/wp-includes/',
        '/wp-admin/',
        '/*?page_id=*',
        '/*?wpr_templates=*',
      ],
    },
    sitemap: 'https://www.toptalentjobs.nl/sitemap.xml',
  }
}
