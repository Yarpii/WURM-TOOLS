import type { Metadata } from "next";
import { BASE_URL, generatePageMetadata, generateProfileSchema } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

interface CharacterData {
  id: number;
  name: string;
  server?: string;
  religion?: string;
  bio?: string;
  avatar_url?: string;
  deed_name?: string;
}

async function fetchCharacter(id: string): Promise<CharacterData | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/characters/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.character || null;
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
  const character = await fetchCharacter(resolvedParams.id);

  if (!character) {
    return generatePageMetadata({
      title: "Character Not Found",
      description: "This character could not be found on Wurm Tools.",
      path: `/characters/${resolvedParams.id}`,
      noIndex: true,
    });
  }

  const serverInfo = character.server ? ` on ${character.server}` : "";
  const deedInfo = character.deed_name ? ` at ${character.deed_name}` : "";

  return generatePageMetadata({
    title: `${character.name} - Wurm Online Character`,
    description:
      character.bio ||
      `View ${character.name}'s character profile${serverInfo}${deedInfo}. Check skills, orders, and treasure hunts on Wurm Tools.`,
    keywords: [
      "Wurm Online character",
      character.name,
      character.server || "Wurm server",
      "character profile",
      "Wurm player",
    ],
    path: `/characters/${resolvedParams.id}`,
    ogImage: character.avatar_url
      ? { url: character.avatar_url, alt: `${character.name} avatar` }
      : undefined,
    type: "profile",
  });
}

export default async function CharacterLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const character = await fetchCharacter(resolvedParams.id);

  if (!character) {
    return children;
  }

  const schema = generateProfileSchema({
    name: character.name,
    description: character.bio,
    url: `/characters/${resolvedParams.id}`,
    image: character.avatar_url,
  });

  return (
    <>
      <JsonLd data={schema} />
      {children}
    </>
  );
}
