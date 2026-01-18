import type { Metadata } from "next";
import { BASE_URL, generatePageMetadata, generateProfileSchema } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

interface MemberData {
  id: number;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  wurm_server?: string;
  location?: string;
}

async function fetchMember(id: string): Promise<MemberData | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/members/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const member = await fetchMember(resolvedParams.id);

  if (!member) {
    return generatePageMetadata({
      title: "Member Not Found",
      description: "This member profile could not be found on Wurm Tools.",
      path: `/members/${resolvedParams.id}`,
      noIndex: true,
    });
  }

  const displayName = member.display_name || member.username;
  const serverInfo = member.wurm_server ? ` playing on ${member.wurm_server}` : "";

  return generatePageMetadata({
    title: `${displayName} - Community Member`,
    description:
      member.bio ||
      `View ${displayName}'s profile on Wurm Tools${serverInfo}. Connect with fellow Wurm Online players.`,
    keywords: [
      "Wurm Online player",
      displayName,
      member.wurm_server || "Wurm server",
      "community member",
      "player profile",
    ],
    path: `/members/${resolvedParams.id}`,
    ogImage: member.avatar_url
      ? { url: member.avatar_url, alt: `${displayName} avatar` }
      : undefined,
    type: "profile",
  });
}

export default async function MemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const member = await fetchMember(resolvedParams.id);

  if (!member) {
    return children;
  }

  const displayName = member.display_name || member.username;
  const schema = generateProfileSchema({
    name: displayName,
    description: member.bio,
    url: `/members/${resolvedParams.id}`,
    image: member.avatar_url,
  });

  return (
    <>
      <JsonLd data={schema} />
      {children}
    </>
  );
}
