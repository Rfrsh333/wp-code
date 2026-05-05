export type LeadListSource =
  | "restaurant_import"
  | "google_maps"
  | "personeel_aanvragen"
  | "calculator"
  | "manual"
  | "instantly"
  | "other";

export interface CRMLeadList {
  id: string;
  name: string;
  description: string | null;
  source: LeadListSource;
  city: string | null;
  imported_file_name: string | null;
  lead_count: number;
  contacted_count: number;
  replied_count: number;
  interested_count: number;
  customer_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CRMLead {
  id: string;
  company_name: string;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  google_maps_url: string | null;
  category: string;
  rating: number | null;
  review_count: number | null;
  status: CRMStatus;
  priority: CRMPriority;
  source: string | null;
  contact_person: string | null;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  archived_at: string | null;
  // Lead list / source tracking
  lead_list_id: string | null;
  source_type: string | null;
  source_reference_id: string | null;
  // Channel availability
  phone_available: boolean;
  email_available: boolean;
  instagram_available: boolean;
  facebook_available: boolean;
  // Outreach tracking
  outreach_status: OutreachStatus;
  next_best_channel: OutreachChannel | null;
  // Per-channel timestamps
  last_call_at: string | null;
  last_email_at: string | null;
  last_instagram_dm_at: string | null;
  last_facebook_dm_at: string | null;
  // Instantly
  instantly_campaign_id: string | null;
  instantly_campaign_name: string | null;
  instantly_email_status: InstantlyStatus | null;
  instantly_last_event_at: string | null;
  instantly_lead_id: string | null;
  instantly_last_reply_at: string | null;
  instantly_last_reply_text: string | null;
  // Counters
  call_count: number;
  email_count: number;
  instagram_dm_count: number;
  facebook_dm_count: number;
  // Closing funnel
  beslisser: string | null;
  beslisser_functie: string | null;
  beslisser_mobiel: string | null;
  personeelsbehoefte: string[] | null;
  urgentie: string | null;
  gewenste_startdatum: string | null;
  aantal_mensen: number | null;
  type_behoefte: string | null;
  bezwaren: string[] | null;
  afspraak_datum: string | null;
  afspraak_notities: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  tags?: CRMTag[];
}

export type CRMStatus =
  | "nieuw"
  | "te_bellen"
  | "gebeld_geen_gehoor"
  | "terugbellen"
  | "voicemail"
  | "email_gestuurd"
  | "dm_gestuurd"
  | "in_gesprek"
  | "offerte_gestuurd"
  | "gewonnen"
  | "verloren"
  | "niet_bereikbaar"
  | "geen_interesse"
  | "al_klant"
  | "geparkeerd"
  | "afspraak_gepland"
  | "testdienst_ingepland"
  | "testdienst_afgerond"
  | "in_onderhandeling"
  | "klant_geworden";

export type CRMPriority = "laag" | "normaal" | "hoog" | "urgent";

export type OutreachStatus =
  | "not_started"
  | "in_progress"
  | "contacted"
  | "replied"
  | "interested"
  | "not_interested"
  | "converted";

export type OutreachChannel = "phone" | "email" | "instagram" | "facebook" | "none";

export type InstantlyStatus = "not_sent" | "sent" | "opened" | "replied" | "bounced" | "unsubscribed" | "clicked" | "auto_reply";

export type ContactLogType =
  | "gebeld"
  | "geen_gehoor"
  | "voicemail"
  | "gesproken"
  | "email"
  | "dm_instagram"
  | "dm_facebook"
  | "whatsapp"
  | "bezoek"
  | "offerte"
  | "notitie"
  | "instantly_sent"
  | "instantly_opened"
  | "instantly_replied"
  | "instantly_bounced"
  | "instantly_clicked"
  | "instantly_auto_reply"
  | "instantly_unsubscribed"
  | "instantly_link_clicked";

export type FollowupType = "bellen" | "email" | "dm" | "bezoek" | "offerte" | "anders";
export type FollowupStatus = "gepland" | "voltooid" | "overgeslagen" | "verzet";

export interface CRMContactLog {
  id: string;
  lead_id: string;
  type: ContactLogType;
  notes: string | null;
  action_key: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  is_reverted: boolean;
  reverted_at: string | null;
  revert_reason: string | null;
  created_at: string;
}

export interface CRMFollowup {
  id: string;
  lead_id: string;
  scheduled_at: string;
  type: FollowupType;
  status: FollowupStatus;
  notes: string | null;
  created_at: string;
  lead?: Pick<CRMLead, "id" | "company_name" | "city" | "phone">;
}

export interface CRMNote {
  id: string;
  lead_id: string;
  content: string;
  created_at: string;
}

export interface CRMTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CRMTestShift {
  id: string;
  lead_id: string;
  shift_date: string;
  shift_time: string | null;
  shift_role: string;
  people_count: number;
  location: string | null;
  status: "gepland" | "bevestigd" | "uitgevoerd" | "geslaagd" | "mislukt" | "geannuleerd";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMObjection {
  id: string;
  objection: string;
  suggested_response: string;
  category: string;
  created_at: string;
}

export interface CRMInstantlyEvent {
  id: string;
  event_id: string;
  event_type: string;
  lead_id: string | null;
  email: string;
  campaign_id: string | null;
  payload: Record<string, unknown> | null;
  processed: boolean;
  created_at: string;
}

export interface CRMDashboardStats {
  total: number;
  nieuw: number;
  in_gesprek: number;
  gewonnen: number;
  verloren: number;
  followups_due: number;
  followups_overdue: number;
  contacted_today: number;
  conversion_rate: number;
  calls_today: number;
  emails_today: number;
  instagram_dms_today: number;
  facebook_dms_today: number;
  replies_total: number;
  interested_total: number;
  converted_total: number;
  gesprekken_today: number;
  interest_today: number;
  appointments_today: number;
  instantly_sent: number;
  instantly_opened: number;
  instantly_replied: number;
  instantly_bounced: number;
  active_campaigns: number;
  email_replies_today: number;
  opened_not_called: number;
  unmatched_instantly: number;
  possible_duplicates: number;
}

export interface CRMDashboardResponse {
  stats: CRMDashboardStats;
  todo: {
    phone: number;
    followup_overdue: number;
    replied: number;
  };
  hot_leads: CRMLead[];
  action_phone: CRMLead[];
  action_followup_overdue: CRMLead[];
}

export interface CRMFilters {
  status?: CRMStatus | CRMStatus[];
  priority?: CRMPriority;
  city?: string;
  search?: string;
  tag_id?: string;
  has_followup?: boolean;
  archived?: boolean;
  outreach_status?: OutreachStatus;
  next_best_channel?: OutreachChannel;
  instantly_email_status?: InstantlyStatus;
  phone_available?: boolean;
  email_available?: boolean;
  instagram_available?: boolean;
  facebook_available?: boolean;
}

export interface CRMLeadListResponse {
  leads: CRMLead[];
  total: number;
  page: number;
  per_page: number;
}

// --- Instantly Campaigns ---

export interface CRMInstantlyCampaign {
  id: string;
  instantly_campaign_id: string;
  name: string;
  status: number;
  total_leads: number;
  leads_sent: number;
  leads_opened: number;
  leads_replied: number;
  leads_bounced: number;
  leads_unsubscribed: number;
  leads_clicked: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMLeadCampaign {
  id: string;
  lead_id: string;
  campaign_id: string;
  instantly_lead_email: string;
  email_status: InstantlyStatus;
  open_count: number;
  reply_count: number;
  click_count: number;
  added_at: string;
  last_event_at: string | null;
  created_at: string;
  updated_at: string;
  lead?: CRMLead;
  campaign?: CRMInstantlyCampaign;
}

export type UnmatchedResolution = "pending" | "matched" | "created" | "ignored";

export interface CRMUnmatchedInstantlyLead {
  id: string;
  campaign_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  website: string | null;
  email_status: InstantlyStatus;
  open_count: number;
  reply_count: number;
  click_count: number;
  resolution: UnmatchedResolution;
  matched_lead_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  campaign?: CRMInstantlyCampaign;
}

export interface DuplicateMatch {
  lead_id: string;
  company_name: string;
  city: string | null;
  email: string | null;
  phone: string | null;
  match_reasons: string[];
  confidence: "high" | "medium" | "low";
}
