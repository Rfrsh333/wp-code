// Social Lead Capture System Types

export type Platform = 'facebook' | 'linkedin' | 'instagram' | 'google' | 'website' | 'handmatig' | 'kvk'

export type LeadStatus = 'nieuw' | 'benaderd' | 'in_gesprek' | 'geplaatst' | 'archief' | 'niet_interested'

export type LeadPrioriteit = 'laag' | 'normaal' | 'hoog'

export type OutreachKanaal = 'whatsapp' | 'email' | 'telefoon' | 'linkedin' | 'facebook'

export type OutreachRichting = 'uitgaand' | 'inkomend'

export type OutreachStatus = 'verstuurd' | 'afgeleverd' | 'gelezen' | 'beantwoord' | 'mislukt'

export type TemplateKanaal = 'whatsapp' | 'email'

export interface Lead {
  id: string
  created_at: string
  updated_at: string

  // Contactgegevens
  naam: string
  bedrijf?: string | null
  functie?: string | null
  telefoon?: string | null
  email?: string | null

  // Locatie
  stad?: string | null
  regio?: string | null

  // Source tracking
  platform: Platform
  bron_url?: string | null
  bron_naam?: string | null

  // Status
  status: LeadStatus
  prioriteit: LeadPrioriteit

  // CRM velden
  notities?: string | null
  tags?: string[] | null

  // Outreach tracking
  laatste_contact?: string | null
  volgende_actie?: string | null
  aantal_contactpogingen: number

  // Beheer
  aangemaakt_door?: string | null
  toegewezen_aan?: string | null
}

export interface LeadOutreach {
  id: string
  created_at: string
  lead_id: string

  kanaal: OutreachKanaal
  richting: OutreachRichting
  bericht?: string | null
  template_naam?: string | null

  verstuurd_door?: string | null
  status: OutreachStatus
}

export interface OutreachTemplate {
  id: string
  created_at: string

  naam: string
  kanaal: TemplateKanaal
  onderwerp?: string | null
  bericht: string

  aantal_gebruikt: number
  is_actief: boolean

  aangemaakt_door?: string | null
}

// API Request/Response types
export interface CreateLeadRequest {
  naam: string
  bedrijf?: string
  functie?: string
  telefoon?: string
  email?: string
  stad?: string
  platform: Platform
  bron_url?: string
  bron_naam?: string
  notities?: string
  bookmarklet_token?: string
}

export interface UpdateLeadRequest {
  naam?: string
  bedrijf?: string
  functie?: string
  telefoon?: string
  email?: string
  stad?: string
  status?: LeadStatus
  prioriteit?: LeadPrioriteit
  notities?: string
  tags?: string[]
  volgende_actie?: string
  toegewezen_aan?: string
}

export interface SendWhatsAppRequest {
  telefoon: string
  bericht: string
  template_id?: string
}

export interface LeadsListResponse {
  leads: Lead[]
  total: number
  page: number
  limit: number
}

// Analytics types
export interface LeadsByPlatform {
  platform: Platform
  count: number
  converted: number
}

export interface LeadsByStatus {
  status: LeadStatus
  count: number
}

export interface LeadsByDate {
  date: string
  count: number
}

export interface ConversionFunnel {
  nieuw: number
  benaderd: number
  in_gesprek: number
  geplaatst: number
}
