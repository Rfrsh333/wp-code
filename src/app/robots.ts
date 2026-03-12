import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
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
      // AI zoekmachines expliciet toestaan
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/klant/', '/medewerker/'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: ['/admin/', '/api/', '/klant/', '/medewerker/'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/klant/', '/medewerker/'],
      },
      {
        userAgent: 'Claude-Web',
        allow: '/',
        disallow: ['/admin/', '/api/', '/klant/', '/medewerker/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/klant/', '/medewerker/'],
      },
      {
        userAgent: 'Applebot-Extended',
        allow: '/',
        disallow: ['/admin/', '/api/', '/klant/', '/medewerker/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: ['/admin/', '/api/', '/klant/', '/medewerker/'],
      },
      {
        userAgent: 'Bytespider',
        allow: '/',
        disallow: ['/admin/', '/api/', '/klant/', '/medewerker/'],
      },
      {
        userAgent: 'CCBot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/klant/', '/medewerker/'],
      },
      {
        userAgent: 'FacebookBot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/klant/', '/medewerker/'],
      },
      {
        userAgent: 'cohere-ai',
        allow: '/',
        disallow: ['/admin/', '/api/', '/klant/', '/medewerker/'],
      },
    ],
    sitemap: 'https://www.toptalentjobs.nl/sitemap.xml',
  }
}
