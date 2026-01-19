import type { Metadata } from "next";
import { BASE_URL, generatePageMetadata } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

interface ResourceData {
  id: number;
  name: string;
  description?: string;
  category: string;
  resource_type: string;
  creator_username?: string;
  tags?: string[];
  average_rating?: number;
  rating_count?: number;
  download_count: number;
  view_count: number;
}

async function fetchResource(id: string): Promise<ResourceData | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/resources/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function generateResourceSchema(resource: ResourceData, id: string) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: resource.name,
    description: resource.description,
    url: `${BASE_URL}/resources/${id}`,
    genre: resource.category,
    creator: resource.creator_username
      ? {
          "@type": "Person",
          name: resource.creator_username,
        }
      : undefined,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/ViewAction",
        userInteractionCount: resource.view_count,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/DownloadAction",
        userInteractionCount: resource.download_count,
      },
    ],
  };

  if (resource.average_rating && resource.rating_count) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: resource.average_rating,
      ratingCount: resource.rating_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (resource.tags && resource.tags.length > 0) {
    schema.keywords = resource.tags.join(", ");
  }

  return schema;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const resource = await fetchResource(resolvedParams.id);

  if (!resource) {
    return generatePageMetadata({
      title: "Resource Not Found",
      description: "This resource could not be found on Wurm Tools.",
      path: `/resources/${resolvedParams.id}`,
      noIndex: true,
    });
  }

  const ratingInfo =
    resource.average_rating && resource.rating_count
      ? ` - Rated ${resource.average_rating.toFixed(1)}/5`
      : "";

  return generatePageMetadata({
    title: `${resource.name} - Community Resource`,
    description:
      resource.description ||
      `Download ${resource.name} for Wurm Online. ${resource.category} resource${ratingInfo}. ${resource.download_count} downloads.`,
    keywords: [
      "Wurm Online resource",
      resource.name,
      resource.category,
      resource.resource_type,
      ...(resource.tags || []),
    ],
    path: `/resources/${resolvedParams.id}`,
  });
}

export default async function ResourceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const resource = await fetchResource(resolvedParams.id);

  if (!resource) {
    return children;
  }

  const schema = generateResourceSchema(resource, resolvedParams.id);

  return (
    <>
      <JsonLd data={schema} />
      {children}
    </>
  );
}
