"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

const DATE_LOCALES: Record<string, string> = {
  ru: "ru-RU",
  kk: "kk-KZ",
  en: "en-US",
};

export default function PrivacyContent() {
  const { t, locale, ready } = useTranslation();

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed text-gray-700">
      <Link href="/signup" className="mb-6 inline-block text-indigo-600 hover:underline">
        {t.legal.back}
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-gray-900">{t.legal.title}</h1>
      <p className="mb-6 text-xs text-gray-400">
        {t.legal.lastUpdated(new Date().toLocaleDateString(DATE_LOCALES[locale]))}
      </p>

      <h2 className="mb-2 mt-6 font-medium text-gray-900">{t.legal.section1.title}</h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        {t.legal.section1.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2 className="mb-2 mt-6 font-medium text-gray-900">{t.legal.section2.title}</h2>
      <p className="mb-4">{t.legal.section2.body}</p>

      <h2 className="mb-2 mt-6 font-medium text-gray-900">{t.legal.section3.title}</h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        {t.legal.section3.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2 className="mb-2 mt-6 font-medium text-gray-900">{t.legal.section4.title}</h2>
      <p className="mb-4">{t.legal.section4.body}</p>

      <h2 className="mb-2 mt-6 font-medium text-gray-900">{t.legal.section5.title}</h2>
      <p className="mb-4">
        {t.legal.section5.before}{" "}
        <Link href="/profile" className="text-indigo-600 hover:underline">
          {t.legal.section5.linkText}
        </Link>
        {t.legal.section5.after}
      </p>

      <h2 className="mb-2 mt-6 font-medium text-gray-900">{t.legal.section6.title}</h2>
      <p className="mb-4">{t.legal.section6.body}</p>
    </div>
  );
}
