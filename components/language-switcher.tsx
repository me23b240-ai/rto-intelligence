// components/language-switcher.tsx
"use client";
import { useTranslation, SUPPORTED_LANGUAGES } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, changeLang } = useTranslation();
  return (
    <select
      value={lang}
      onChange={(e) => changeLang(e.target.value)}
      className="border rounded-md px-2 py-1 text-sm bg-background"
      aria-label="Select language"
    >
      {SUPPORTED_LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}