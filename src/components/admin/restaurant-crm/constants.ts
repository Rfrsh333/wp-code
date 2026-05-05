import type { CRMStatus, CRMPriority, ContactLogType, FollowupType, OutreachStatus, OutreachChannel, InstantlyStatus } from "./types";

export const STATUS_CONFIG: Record<CRMStatus, { label: string; color: string; bgColor: string }> = {
  nieuw: { label: "Nieuw", color: "text-blue-700", bgColor: "bg-blue-50" },
  te_bellen: { label: "Te bellen", color: "text-indigo-700", bgColor: "bg-indigo-50" },
  gebeld_geen_gehoor: { label: "Geen gehoor", color: "text-yellow-700", bgColor: "bg-yellow-50" },
  terugbellen: { label: "Terugbellen", color: "text-orange-700", bgColor: "bg-orange-50" },
  voicemail: { label: "Voicemail", color: "text-amber-700", bgColor: "bg-amber-50" },
  email_gestuurd: { label: "Email gestuurd", color: "text-cyan-700", bgColor: "bg-cyan-50" },
  dm_gestuurd: { label: "DM gestuurd", color: "text-pink-700", bgColor: "bg-pink-50" },
  in_gesprek: { label: "In gesprek", color: "text-purple-700", bgColor: "bg-purple-50" },
  offerte_gestuurd: { label: "Offerte gestuurd", color: "text-violet-700", bgColor: "bg-violet-50" },
  gewonnen: { label: "Gewonnen", color: "text-green-700", bgColor: "bg-green-50" },
  verloren: { label: "Verloren", color: "text-red-700", bgColor: "bg-red-50" },
  niet_bereikbaar: { label: "Niet bereikbaar", color: "text-gray-700", bgColor: "bg-gray-50" },
  geen_interesse: { label: "Geen interesse", color: "text-slate-700", bgColor: "bg-slate-50" },
  al_klant: { label: "Al klant", color: "text-emerald-700", bgColor: "bg-emerald-50" },
  geparkeerd: { label: "Geparkeerd", color: "text-stone-700", bgColor: "bg-stone-50" },
  afspraak_gepland: { label: "Afspraak gepland", color: "text-teal-700", bgColor: "bg-teal-50" },
  testdienst_ingepland: { label: "Testdienst ingepland", color: "text-sky-700", bgColor: "bg-sky-50" },
  testdienst_afgerond: { label: "Testdienst afgerond", color: "text-lime-700", bgColor: "bg-lime-50" },
  in_onderhandeling: { label: "In onderhandeling", color: "text-fuchsia-700", bgColor: "bg-fuchsia-50" },
  klant_geworden: { label: "Klant geworden", color: "text-emerald-700", bgColor: "bg-emerald-50" },
};

export const PRIORITY_CONFIG: Record<CRMPriority, { label: string; color: string; bgColor: string }> = {
  laag: { label: "Laag", color: "text-gray-600", bgColor: "bg-gray-50" },
  normaal: { label: "Normaal", color: "text-blue-600", bgColor: "bg-blue-50" },
  hoog: { label: "Hoog", color: "text-orange-600", bgColor: "bg-orange-50" },
  urgent: { label: "Urgent", color: "text-red-600", bgColor: "bg-red-50" },
};

export const OUTREACH_STATUS_CONFIG: Record<OutreachStatus, { label: string; color: string; bgColor: string }> = {
  not_started: { label: "Niet gestart", color: "text-gray-600", bgColor: "bg-gray-50" },
  in_progress: { label: "Bezig", color: "text-blue-600", bgColor: "bg-blue-50" },
  contacted: { label: "Benaderd", color: "text-indigo-600", bgColor: "bg-indigo-50" },
  replied: { label: "Gereageerd", color: "text-purple-600", bgColor: "bg-purple-50" },
  interested: { label: "Geïnteresseerd", color: "text-green-600", bgColor: "bg-green-50" },
  not_interested: { label: "Geen interesse", color: "text-red-600", bgColor: "bg-red-50" },
  converted: { label: "Klant", color: "text-emerald-600", bgColor: "bg-emerald-50" },
};

export const CHANNEL_CONFIG: Record<OutreachChannel, { label: string; color: string; bgColor: string; icon: string }> = {
  phone: { label: "Bellen", color: "text-blue-700", bgColor: "bg-blue-50", icon: "Phone" },
  email: { label: "Email", color: "text-cyan-700", bgColor: "bg-cyan-50", icon: "Mail" },
  instagram: { label: "Instagram", color: "text-pink-700", bgColor: "bg-pink-50", icon: "Instagram" },
  facebook: { label: "Facebook", color: "text-indigo-700", bgColor: "bg-indigo-50", icon: "Facebook" },
  none: { label: "Geen", color: "text-gray-500", bgColor: "bg-gray-50", icon: "Minus" },
};

export const INSTANTLY_STATUS_CONFIG: Record<InstantlyStatus, { label: string; color: string; bgColor: string }> = {
  not_sent: { label: "Niet verstuurd", color: "text-gray-600", bgColor: "bg-gray-50" },
  sent: { label: "Verstuurd", color: "text-blue-600", bgColor: "bg-blue-50" },
  opened: { label: "Geopend", color: "text-indigo-600", bgColor: "bg-indigo-50" },
  replied: { label: "Gereageerd", color: "text-green-600", bgColor: "bg-green-50" },
  bounced: { label: "Bounced", color: "text-red-600", bgColor: "bg-red-50" },
  unsubscribed: { label: "Unsubscribed", color: "text-orange-600", bgColor: "bg-orange-50" },
};

export const CONTACT_LOG_CONFIG: Record<ContactLogType, { label: string; icon: string }> = {
  gebeld: { label: "Gebeld", icon: "Phone" },
  geen_gehoor: { label: "Geen gehoor", icon: "PhoneMissed" },
  voicemail: { label: "Voicemail", icon: "Voicemail" },
  gesproken: { label: "Gesproken", icon: "PhoneCall" },
  email: { label: "Email", icon: "Mail" },
  dm_instagram: { label: "DM Instagram", icon: "Instagram" },
  dm_facebook: { label: "DM Facebook", icon: "Facebook" },
  whatsapp: { label: "WhatsApp", icon: "MessageCircle" },
  bezoek: { label: "Bezoek", icon: "MapPin" },
  offerte: { label: "Offerte", icon: "FileText" },
  notitie: { label: "Notitie", icon: "StickyNote" },
  instantly_sent: { label: "Email verstuurd", icon: "Send" },
  instantly_opened: { label: "Email geopend", icon: "MailOpen" },
  instantly_replied: { label: "Email beantwoord", icon: "Reply" },
  instantly_bounced: { label: "Email bounced", icon: "AlertTriangle" },
};

export const FOLLOWUP_TYPE_CONFIG: Record<FollowupType, { label: string }> = {
  bellen: { label: "Bellen" },
  email: { label: "Email" },
  dm: { label: "DM sturen" },
  bezoek: { label: "Bezoek" },
  offerte: { label: "Offerte" },
  anders: { label: "Anders" },
};

export const CALL_SCRIPT = {
  opening: `Hoi, je spreekt met Rachid van Toptalent.\nIk bel heel kort: wij helpen restaurants met ervaren horecapersoneel, ook last-minute.\nMag ik vragen hoe jullie het nu oplossen als iemand ziek is of niet komt opdagen?`,
  interest: `Ja precies, dat hoor ik vaker. Wij kunnen vaak binnen 24 uur iemand regelen voor bediening, keuken of events.\nZal ik je kort wat info sturen, zodat je ons achter de hand hebt voor drukke momenten?`,
};

export const DM_TEMPLATE = `Hey, ik probeerde jullie net kort te bellen.\nWij helpen restaurants in Utrecht met ervaren horecapersoneel, ook last-minute.\nHoe lossen jullie het nu op als iemand uitvalt?`;

export const URGENTIE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  laag: { label: "Laag", color: "text-gray-600", bgColor: "bg-gray-50" },
  normaal: { label: "Normaal", color: "text-blue-600", bgColor: "bg-blue-50" },
  hoog: { label: "Hoog", color: "text-orange-600", bgColor: "bg-orange-50" },
  urgent: { label: "Urgent!", color: "text-red-600", bgColor: "bg-red-50" },
};

export const PERSONEELSBEHOEFTE_OPTIONS = [
  "Bediening",
  "Keuken",
  "Afwas",
  "Bar",
  "Gastvrouw/heer",
  "Events",
  "Catering",
  "Management",
];

export const TYPE_BEHOEFTE_OPTIONS = [
  { value: "structureel", label: "Structureel (vast)" },
  { value: "flexibel", label: "Flexibel (oproep)" },
  { value: "seizoen", label: "Seizoensgebonden" },
  { value: "eenmalig", label: "Eenmalig / event" },
  { value: "noodgeval", label: "Noodgeval / last-minute" },
];

export const TESTSHIFT_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  gepland: { label: "Gepland", color: "text-blue-700", bgColor: "bg-blue-50" },
  bevestigd: { label: "Bevestigd", color: "text-indigo-700", bgColor: "bg-indigo-50" },
  uitgevoerd: { label: "Uitgevoerd", color: "text-purple-700", bgColor: "bg-purple-50" },
  geslaagd: { label: "Geslaagd", color: "text-green-700", bgColor: "bg-green-50" },
  mislukt: { label: "Mislukt", color: "text-red-700", bgColor: "bg-red-50" },
  geannuleerd: { label: "Geannuleerd", color: "text-gray-700", bgColor: "bg-gray-50" },
};
