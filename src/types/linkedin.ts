// ============================================================
// LinkedIn Integratie — TypeScript Types
// ============================================================

export interface LinkedInConnection {
  id: string;
  user_email: string;
  linkedin_person_id: string;
  organization_id: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string;
  refresh_token_expires_at: string | null;
  scopes: string[] | null;
  profile_name: string | null;
  profile_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type LinkedInPostStatus = "draft" | "approved" | "scheduled" | "publishing" | "published" | "failed";
export type LinkedInPostType = "text" | "link" | "image" | "article";

export interface LinkedInPost {
  id: string;
  content_post_id: string | null;
  template_id: string | null;
  status: LinkedInPostStatus;
  post_type: LinkedInPostType;
  content: string;
  link_url: string | null;
  image_url: string | null;
  hashtags: string[] | null;
  scheduled_for: string | null;
  published_at: string | null;
  linkedin_post_urn: string | null;
  error_message: string | null;
  retry_count: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate: number;
  analytics_updated_at: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LinkedInTemplateCategorie = "mijlpaal" | "tip" | "case_study" | "seizoen" | "vacature" | "nieuws" | "engagement" | "behind_the_scenes";

export interface LinkedInTemplate {
  id: string;
  naam: string;
  categorie: LinkedInTemplateCategorie;
  template: string;
  variabelen: string[];
  voorbeeld: string | null;
  is_active: boolean;
  gebruik_count: number;
  created_at: string;
  updated_at: string;
}

export interface LinkedInAnalyticsSummary {
  total_posts: number;
  total_impressions: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_clicks: number;
  avg_engagement_rate: number;
  posts_this_week: number;
  posts_this_month: number;
}

export interface LinkedInPostCreateInput {
  content: string;
  post_type?: LinkedInPostType;
  link_url?: string;
  image_url?: string;
  hashtags?: string[];
  scheduled_for?: string;
  template_id?: string;
  content_post_id?: string;
}
