// ============================================================================
// Digitaal Contractsysteem - TypeScript Types
// ============================================================================

// --- Enums / Union Types ---

export type ContractType =
  | 'arbeidsovereenkomst'
  | 'uitzendovereenkomst'
  | 'oproepovereenkomst'
  | 'freelance'
  | 'overeenkomst_van_opdracht'
  | 'stage'
  | 'custom'

export type ContractStatus =
  | 'concept'
  | 'verzonden'
  | 'bekeken'
  | 'ondertekend_medewerker'
  | 'ondertekend_admin'
  | 'actief'
  | 'verlopen'
  | 'opgezegd'
  | 'geannuleerd'

export type OndertekenaarType = 'medewerker' | 'admin'

export type TemplateVariabeleType = 'text' | 'number' | 'date' | 'select' | 'textarea'

// --- Template Types ---

export interface TemplateSectie {
  titel: string
  tekst: string
  volgorde: number
}

export interface TemplateVariabele {
  naam: string
  label: string
  type: TemplateVariabeleType
  verplicht: boolean
  opties?: string[] // Voor type 'select'
  standaardwaarde?: string
}

export interface TemplateInhoud {
  secties: TemplateSectie[]
  variabelen: TemplateVariabele[]
}

export interface ContractTemplate {
  id: string
  naam: string
  slug: string
  beschrijving: string | null
  type: ContractType
  inhoud: TemplateInhoud
  versie: number
  actief: boolean
  created_at: string
  updated_at: string
}

// --- Contract Types ---

export interface Contract {
  id: string
  template_id: string | null
  medewerker_id: string
  klant_id: string | null
  aangemaakt_door: string

  contract_nummer: string
  type: ContractType
  titel: string
  contract_data: Record<string, unknown>
  status: ContractStatus

  onderteken_token: string | null
  onderteken_token_verloopt_at: string | null

  pdf_pad: string | null
  getekend_pdf_pad: string | null

  startdatum: string | null
  einddatum: string | null
  verzonden_at: string | null
  ondertekend_medewerker_at: string | null
  ondertekend_admin_at: string | null
  opgezegd_at: string | null

  notities: string | null
  created_at: string
  updated_at: string
}

// Contract met relaties (voor admin overzicht)
export interface ContractMetRelaties extends Contract {
  medewerker?: {
    id: string
    naam: string
    voornaam: string
    achternaam: string
    email: string
    telefoon: string | null
  }
  klant?: {
    id: string
    bedrijfsnaam: string
    contactpersoon: string | null
  }
  template?: {
    id: string
    naam: string
    type: ContractType
  }
}

// --- Ondertekening Types ---

export interface ContractOndertekening {
  id: string
  contract_id: string
  ondertekenaar_type: OndertekenaarType
  ondertekenaar_naam: string
  ondertekenaar_email: string | null
  handtekening_data: string // Base64 PNG
  handtekening_hash: string // SHA-256
  ip_adres: string | null
  user_agent: string | null
  getekend_at: string
  created_at: string
}

// --- Versie Types ---

export interface ContractVersie {
  id: string
  contract_id: string
  versie_nummer: number
  contract_data: Record<string, unknown>
  gewijzigd_door: string
  wijziging_reden: string | null
  created_at: string
}

// --- API Request Types ---

export interface CreateContractRequest {
  template_id: string
  medewerker_id: string
  klant_id?: string
  type: ContractType
  titel: string
  contract_data: Record<string, unknown>
  startdatum?: string
  einddatum?: string
  notities?: string
}

export interface UpdateContractRequest {
  titel?: string
  contract_data?: Record<string, unknown>
  status?: ContractStatus
  startdatum?: string
  einddatum?: string
  notities?: string
}

export interface VerzendContractRequest {
  contract_id: string
}

export interface OndertekeningRequest {
  contract_id: string
  ondertekenaar_naam: string
  ondertekenaar_email?: string
  handtekening_data: string // Base64 PNG
}

// --- API Response Types ---

export interface ContractenListResponse {
  data: ContractMetRelaties[]
  total: number
}

export interface ContractDetailResponse {
  contract: ContractMetRelaties
  ondertekeningen: ContractOndertekening[]
  versies: ContractVersie[]
}

// --- Filter / Query Types ---

export interface ContractFilters {
  status?: ContractStatus | ContractStatus[]
  type?: ContractType
  medewerker_id?: string
  klant_id?: string
  zoekterm?: string
  van_datum?: string
  tot_datum?: string
}

// --- Statistieken ---

export interface ContractStatistieken {
  totaal: number
  concept: number
  verzonden: number
  ondertekend: number
  actief: number
  verlopen: number
  opgezegd: number
}
