import type { Metadata } from "next";
import { BASE_URL, generatePageMetadata } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

interface AllianceData {
  id: number;
  name: string;
  tag?: string;
  description?: string;
  member_count: number;
  max_members: number;
  leader_username: string;
  is_public: boolean;
}

async function fetchAlliance(id: string): Promise<AllianceData | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/alliances/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.alliance || null;
  } catch {
    return null;
  }
}

function generateAllianceSchema(alliance: AllianceData, id: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: alliance.name,
    alternateName: alliance.tag ? `[${alliance.tag}]` : undefined,
    description: alliance.description,
    url: `${BASE_URL}/alliances/${id}`,
    memberOf: {
      "@type": "Organization",
      name: "Wurm Online Community",
    },
    numberOfEmployees: {
      "@type": "QuantitativeValue",
      value: alliance.member_count,
      maxValue: alliance.max_members,
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const alliance = await fetchAlliance(resolvedParams.id);

  if (!alliance) {
    return generatePageMetadata({
      title: "Alliance Not Found",
      description: "This alliance could not be found on Wurm Tools.",
      path: `/alliances/${resolvedParams.id}`,
      noIndex: true,
    });
  }

  const tagDisplay = alliance.tag ? ` [${alliance.tag}]` : "";

  return generatePageMetadata({
    title: `${alliance.name}${tagDisplay} - Wurm Online Alliance`,
    description:
      alliance.description ||
      `Join ${alliance.name}${tagDisplay} on Wurm Online. ${alliance.member_count}/${alliance.max_members} members. Led by ${alliance.leader_username}.`,
    keywords: [
      "Wurm Online alliance",
      alliance.name,
      alliance.tag || "",
      "Wurm guild",
      "alliance recruitment",
    ].filter(Boolean),
    path: `/alliances/${resolvedParams.id}`,
  });
}

export default async function AllianceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const alliance = await fetchAlliance(resolvedParams.id);

  if (!alliance) {
    return children;
  }

  const schema = generateAllianceSchema(alliance, resolvedParams.id);

  return (
    <>
      <JsonLd data={schema} />
      {children}
    </>
  );
}
