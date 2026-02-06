"use client";

import { useInfoSections } from "./InfoSectionsProvider";

interface InfoSectionProps {
  children: React.ReactNode;
}

export default function InfoSection({ children }: InfoSectionProps) {
  const { showInfoSections } = useInfoSections();

  if (!showInfoSections) return null;

  return <>{children}</>;
}
