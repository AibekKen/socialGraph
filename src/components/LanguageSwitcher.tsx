"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t, ready } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-300 text-xs font-semibold uppercase text-indigo-700 hover:bg-indigo-50"
        aria-label={t.common.language}
        title={t.common.language}
      >
        {ready ? locale : ""}
      </button>

      {open && (
        <ul className="absolute right-0 top-full z-40 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white text-sm shadow-lg">
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setLocale(l);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-left hover:bg-gray-50 ${
                  l === locale ? "font-medium text-indigo-700" : "text-gray-700"
                }`}
              >
                {LOCALE_LABELS[l]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
