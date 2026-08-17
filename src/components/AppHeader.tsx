"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type Props = {
  href?: string;
  showLanguageSwitcher?: boolean;
  children?: ReactNode;
};

export default function AppHeader({ href = "/", showLanguageSwitcher = true, children }: Props) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-20 flex w-full shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white p-3 md:px-4 md:py-3">
      <Link href={href} className="flex items-center gap-2 text-base font-semibold md:text-lg">
        <svg width="24" height="24" viewBox="0 0 100 100" aria-hidden="true">
          <polygon
            points="82,50 66,22.29 34,22.29 18,50 34,77.71 66,77.71"
            fill="none"
            stroke="#4f46e5"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="82" cy="50" r="7" fill="#a5b4fc" />
          <circle cx="66" cy="22.29" r="7" fill="#a5b4fc" />
          <circle cx="34" cy="22.29" r="7" fill="#a5b4fc" />
          <circle cx="18" cy="50" r="7" fill="#a5b4fc" />
          <circle cx="34" cy="77.71" r="7" fill="#a5b4fc" />
          <circle cx="66" cy="77.71" r="7" fill="#a5b4fc" />
          <circle cx="50" cy="50" r="13" fill="#4f46e5" />
        </svg>
        {t.common.brand}
      </Link>
      <div className="flex items-center gap-2">
        {showLanguageSwitcher && <LanguageSwitcher />}
        {children}
      </div>
    </header>
  );
}
