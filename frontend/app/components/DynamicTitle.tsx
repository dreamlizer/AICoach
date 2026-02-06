"use client";

import { useEffect } from "react";
import { useLanguage } from "@/context/language-context";

export function DynamicTitle() {
  const { t } = useLanguage();

  useEffect(() => {
    document.title = t("appTitle");
  }, [t]);

  return null;
}
