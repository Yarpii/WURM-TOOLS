import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Submit Recipe",
  description:
    "Contribute to Wurm Tools by submitting missing recipes. Help the community by adding crafting recipes to our database.",
  keywords: [
    "submit recipe",
    "Wurm recipes",
    "contribute",
    "community contribution",
    "recipe database",
  ],
  path: "/recipes/submit",
});

export default function RecipeSubmitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
