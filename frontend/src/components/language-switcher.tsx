"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex gap-2">
      <Button
        variant={i18n.language === "en" ? "default" : "outline"}
        size="sm"
        onClick={() => changeLanguage("en")}
      >
        English
      </Button>
      <Button
        variant={i18n.language === "amh" ? "default" : "outline"}
        size="sm"
        onClick={() => changeLanguage("amh")}
      >
        አማርኛ
      </Button>
    </div>
  );
};
