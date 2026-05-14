import type { Metadata } from "next";

const BASE_URL = "https://www.toptalentjobs.nl";
const FALLBACK_OG_IMAGE = `${BASE_URL}/opengraph-image`;

interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  authors?: string[];
}

export function buildPageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  authors,
}: PageMetadataOptions): Metadata {
  const url = `${BASE_URL}${path}`;
  const imageUrl = image ? `${BASE_URL}${image}` : FALLBACK_OG_IMAGE;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "TopTalent Jobs",
      locale: "nl_NL",
      type,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(authors && { authors }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
