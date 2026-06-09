"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTutorial } from "@/lib/tutorials/useTutorial";

export default function TutorialWrapper() {
  const pathname = usePathname();
  const { hasTutorial } = useTutorial(pathname);

  useEffect(() => {
    if (!hasTutorial) return;
  }, [hasTutorial, pathname]);

  return null;
}
