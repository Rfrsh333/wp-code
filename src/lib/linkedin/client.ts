// ============================================================
// LinkedIn REST API v2 Client (native fetch)
// ============================================================

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";
const LINKEDIN_COMMUNITY_API = "https://api.linkedin.com/rest";

interface LinkedInPostResponse {
  id: string; // URN like urn:li:share:12345 or urn:li:ugcPost:12345
}

interface LinkedInAnalyticsResponse {
  totalShareStatistics: {
    shareCount: number;
    clickCount: number;
    likeCount: number;
    commentCount: number;
    impressionCount: number;
    engagement: number;
  };
}

export class LinkedInClient {
  private accessToken: string;
  private personId: string;

  constructor(accessToken: string, personId: string) {
    this.accessToken = accessToken;
    this.personId = personId;
  }

  private headers(version?: string): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    };
    if (version) {
      h["LinkedIn-Version"] = version;
    }
    return h;
  }

  private authorUrn(): string {
    return `urn:li:person:${this.personId}`;
  }

  async createTextPost(text: string): Promise<LinkedInPostResponse> {
    const body = {
      author: this.authorUrn(),
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const res = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`LinkedIn createTextPost failed (${res.status}): ${error}`);
    }

    const id = res.headers.get("x-restli-id") || res.headers.get("X-RestLi-Id") || "";
    return { id };
  }

  async createLinkPost(text: string, linkUrl: string): Promise<LinkedInPostResponse> {
    const body = {
      author: this.authorUrn(),
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "ARTICLE",
          media: [
            {
              status: "READY",
              originalUrl: linkUrl,
            },
          ],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const res = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`LinkedIn createLinkPost failed (${res.status}): ${error}`);
    }

    const id = res.headers.get("x-restli-id") || res.headers.get("X-RestLi-Id") || "";
    return { id };
  }

  async createImagePost(text: string, imageUrl: string): Promise<LinkedInPostResponse> {
    // For image posts using community API (Posts API)
    const body = {
      author: this.authorUrn(),
      commentary: text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
      },
      content: {
        media: {
          altText: "TopTalent Jobs post",
          id: imageUrl, // Pre-uploaded image asset URN
        },
      },
      lifecycleState: "PUBLISHED",
    };

    const res = await fetch(`${LINKEDIN_COMMUNITY_API}/posts`, {
      method: "POST",
      headers: this.headers("202401"),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`LinkedIn createImagePost failed (${res.status}): ${error}`);
    }

    const id = res.headers.get("x-restli-id") || res.headers.get("X-RestLi-Id") || "";
    return { id };
  }

  async getPostAnalytics(postUrn: string): Promise<LinkedInAnalyticsResponse | null> {
    try {
      const encodedUrn = encodeURIComponent(postUrn);
      const res = await fetch(
        `${LINKEDIN_API_BASE}/organizationalEntityShareStatistics?q=organizationalEntity&shares[0]=${encodedUrn}`,
        { headers: this.headers() }
      );

      if (!res.ok) {
        // Fallback: try socialActions for basic metrics
        return this.getBasicAnalytics(postUrn);
      }

      const data = await res.json();
      const stats = data.elements?.[0]?.totalShareStatistics;
      if (!stats) return this.getBasicAnalytics(postUrn);

      return {
        totalShareStatistics: {
          shareCount: stats.shareCount || 0,
          clickCount: stats.clickCount || 0,
          likeCount: stats.likeCount || 0,
          commentCount: stats.commentCount || 0,
          impressionCount: stats.impressionCount || 0,
          engagement: stats.engagement || 0,
        },
      };
    } catch {
      return null;
    }
  }

  private async getBasicAnalytics(postUrn: string): Promise<LinkedInAnalyticsResponse | null> {
    try {
      const encodedUrn = encodeURIComponent(postUrn);
      const res = await fetch(
        `${LINKEDIN_API_BASE}/socialActions/${encodedUrn}`,
        { headers: this.headers() }
      );

      if (!res.ok) return null;

      const data = await res.json();
      return {
        totalShareStatistics: {
          shareCount: data.sharesCount || 0,
          clickCount: 0,
          likeCount: data.likesCount || 0,
          commentCount: data.commentsCount || 0,
          impressionCount: 0,
          engagement: 0,
        },
      };
    } catch {
      return null;
    }
  }

  async getProfile(): Promise<{ id: string; name: string; picture?: string }> {
    const res = await fetch(`${LINKEDIN_API_BASE}/userinfo`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`LinkedIn getProfile failed (${res.status})`);
    }

    const data = await res.json();
    return {
      id: data.sub,
      name: data.name || `${data.given_name || ""} ${data.family_name || ""}`.trim(),
      picture: data.picture,
    };
  }
}
