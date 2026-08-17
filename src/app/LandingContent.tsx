"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import AppHeader from "@/components/AppHeader";

function NetworkPreview() {
  const { t } = useTranslation();
  return (
    <svg
      viewBox="0 0 360 275"
      className="mx-auto h-auto w-full"
      role="img"
      aria-label={t.landing.svgAlt}
    >
      <defs>
        <radialGradient id="meGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="matchGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <clipPath id="clipMe"><circle cx="90" cy="140" r="20" /></clipPath>
        <clipPath id="clipA"><circle cx="200" cy="60" r="15" /></clipPath>
        <clipPath id="clipM"><circle cx="220" cy="150" r="15" /></clipPath>
        <clipPath id="clipD"><circle cx="150" cy="215" r="15" /></clipPath>
        <clipPath id="clipK"><circle cx="290" cy="90" r="17" /></clipPath>
      </defs>

      <rect x="60" y="8" width="130" height="26" rx="13" fill="#ffffff" stroke="#d1d5db" />
      <circle cx="76" cy="21" r="4.5" fill="none" stroke="#9ca3af" strokeWidth="1.6" />
      <line x1="79.2" y1="24.2" x2="82.5" y2="27.5" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" />
      <text x="90" y="25" fontSize="11" fill="#374151">
        {t.landing.demoQuery}
      </text>

      <line x1="90" y1="140" x2="200" y2="60" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="90" y1="140" x2="220" y2="150" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="90" y1="140" x2="150" y2="215" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="200" y1="60" x2="290" y2="90" stroke="#f59e0b" strokeWidth="2" />
      <line x1="220" y1="150" x2="290" y2="90" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />

      <circle cx="90" cy="140" r="34" fill="url(#meGlow)" />
      <image href="https://i.pravatar.cc/72?img=13" x="70" y="120" width="40" height="40" clipPath="url(#clipMe)" preserveAspectRatio="xMidYMid slice" />
      <circle cx="90" cy="140" r="20" fill="none" stroke="#4f46e5" strokeWidth="2.5" />
      <rect x="76" y="160" width="28" height="14" rx="7" fill="#4f46e5" />
      <text x="90" y="170" textAnchor="middle" fontSize="10" fontWeight="600" fill="#ffffff">
        {t.landing.demoMe}
      </text>

      <image href="https://i.pravatar.cc/64?img=12" x="185" y="45" width="30" height="30" clipPath="url(#clipA)" preserveAspectRatio="xMidYMid slice" />
      <circle cx="200" cy="60" r="15" fill="none" stroke="#ffffff" strokeWidth="2" />

      <image href="https://i.pravatar.cc/64?img=32" x="205" y="135" width="30" height="30" clipPath="url(#clipM)" preserveAspectRatio="xMidYMid slice" />
      <circle cx="220" cy="150" r="15" fill="none" stroke="#ffffff" strokeWidth="2" />

      <image href="https://i.pravatar.cc/64?img=45" x="135" y="200" width="30" height="30" clipPath="url(#clipD)" preserveAspectRatio="xMidYMid slice" opacity="0.75" />
      <circle cx="150" cy="215" r="15" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.75" />

      <circle cx="290" cy="90" r="27" fill="url(#matchGlow)" />
      <image href="https://i.pravatar.cc/68?img=68" x="273" y="73" width="34" height="34" clipPath="url(#clipK)" preserveAspectRatio="xMidYMid slice" />
      <circle cx="290" cy="90" r="17" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
      <rect x="298" y="98" width="57" height="16" rx="8" fill="#f59e0b" />
      <text x="326.5" y="109" textAnchor="middle" fontSize="10" fontWeight="600" fill="#ffffff">
        {t.landing.demoMatch}
      </text>
    </svg>
  );
}

function ValueIcon({ path }: { path: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {path}
      </svg>
    </span>
  );
}

export default function LandingContent() {
  const { t, ready } = useTranslation();

  if (!ready) return null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gray-50 md:h-auto md:min-h-dvh md:overflow-visible">
      <AppHeader />

      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-3 text-center md:overflow-visible md:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-2 flex justify-center md:mb-4">
          <NetworkPreview />
        </div>

        <div className="w-full text-left md:mx-auto md:w-fit">
          <h1 className="mb-1 text-xl font-semibold text-gray-900 md:mb-2 md:text-3xl">
            {t.landing.h1}
          </h1>
          <p className="mb-3 text-sm text-gray-500 md:mb-8 md:text-lg">
            {t.landing.subtitle}
          </p>

          <div className="mb-3 flex flex-col items-start space-y-1.5 md:mb-8 md:space-y-4">
            <div className="flex items-center gap-2 md:gap-3">
              <ValueIcon path={<><path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" y1="12" x2="16" y2="12" /></>} />
              <div className="text-sm font-medium text-gray-900 md:text-base">{t.landing.value1}</div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <ValueIcon path={<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>} />
              <div className="text-sm font-medium text-gray-900 md:text-base">{t.landing.value2}</div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <ValueIcon path={<><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="7" r="2.5" /><circle cx="12" cy="17" r="2.5" /><line x1="8.8" y1="8.5" x2="15.2" y2="8.5" /><line x1="8" y1="9" x2="10.5" y2="15" /><line x1="16" y1="9" x2="13.5" y2="15" /></>} />
              <div className="text-sm font-medium text-gray-900 md:text-base">{t.landing.value3}</div>
            </div>
          </div>
        </div>

        <div className="w-full md:mx-auto md:max-w-xs">
          <Link
            href="/signup"
            className="mb-2 block min-h-[44px] rounded bg-indigo-600 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
          >
            {t.landing.signup}
          </Link>
          <Link
            href="/login"
            className="block min-h-[44px] rounded border border-gray-300 px-3 py-2.5 text-center text-sm text-gray-700 hover:bg-gray-50"
          >
            {t.landing.login}
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
