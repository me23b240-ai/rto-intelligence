// lib/i18n.ts
"use client";
import { useState, useEffect } from "react";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";

const DICTS: Record<string, Record<string, string>> = { en, hi };
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },   // stub — falls back to English until messages/ta.json is added
  { code: "te", label: "తెలుగు" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "mr", label: "मराठी" },
  { code: "bn", label: "বাংলা" },
];

export function useTranslation() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("rto-lang");
    if (saved) setLang(saved);
  }, []);

  function changeLang(code: string) {
    setLang(code);
    localStorage.setItem("rto-lang", code);
  }

  function t(key: string): string {
    const dict = DICTS[lang] ?? DICTS.en;
    return dict[key] ?? DICTS.en[key] ?? key;
  }

  return { t, lang, changeLang };
}