import React, { useEffect, useState } from "react";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "ar", name: "العربية" },
  { code: "zh-CN", name: "中文" },
];

const LanguageSwitcher = ({ className = "" }) => {
  const [currentLang, setCurrentLang] = useState(() => {
    try {
      const match = document.cookie.match(/(?:^|; )googtrans=([^;]*)/);
      if (match) {
        const parts = decodeURIComponent(match[1]).split("/");
        return parts[parts.length - 1] || "en";
      }
    } catch (e) {}
    return "en";
  });

  useEffect(() => {
    // Global error listener to suppress Google Translate network glitches (ERR_NETWORK_CHANGED, translate-pa, etc.)
    const handleGlobalError = (event) => {
      if (
        event.message?.includes("translate") ||
        event.filename?.includes("translate") ||
        event.message?.includes("google") ||
        event.message?.includes("La")
      ) {
        event.preventDefault();
        return true;
      }
    };

    const handleUnhandledRejection = (event) => {
      if (
        event.reason?.message?.includes("translate") ||
        event.reason?.stack?.includes("translate") ||
        event.reason?.message?.includes("La")
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // Safely load Google Translate script if not present
    if (!window.googleTranslateElementInit) {
      window.googleTranslateElementInit = () => {
        try {
          if (window.google?.translate?.TranslateElement) {
            new window.google.translate.TranslateElement(
              {
                pageLanguage: "en",
                includedLanguages: "en,hi,es,fr,ar,zh-CN",
                layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false,
              },
              "google_translate_element"
            );
          }
        } catch (err) {
          console.warn("Google Translate init silenced error:", err.message);
        }
      };
    }

    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.type = "text/javascript";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.onerror = () => {
        console.warn("Google Translate script load warning (network offline/changed)");
      };
      document.body.appendChild(script);
    } else if (window.google?.translate?.TranslateElement) {
      try {
        window.googleTranslateElementInit();
      } catch (e) {}
    }

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  const handleLanguageChange = (e) => {
    const langCode = e.target.value;
    setCurrentLang(langCode);

    try {
      // 1. Set googtrans cookie for domain
      const domain = window.location.hostname;
      document.cookie = `googtrans=/en/${langCode}; path=/; domain=${domain}`;
      document.cookie = `googtrans=/en/${langCode}; path=/`;

      // 2. Try updating Google Translate select element if initialized in DOM
      const gtSelect = document.querySelector(".goog-te-combo");
      if (gtSelect) {
        gtSelect.value = langCode;
        gtSelect.dispatchEvent(new Event("change"));
      } else {
        // Fallback: reload page to apply cookie translation cleanly
        window.location.reload();
      }
    } catch (err) {
      console.warn("Language change fallback:", err.message);
      window.location.reload();
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-charcoal-200 bg-white hover:bg-surface-50 text-charcoal-700 text-xs font-semibold shadow-soft-xs transition-all ${className}`}>
      <Globe className="w-3.5 h-3.5 text-brand-600 shrink-0" />
      <select
        value={currentLang}
        onChange={handleLanguageChange}
        className="bg-transparent text-xs font-bold text-charcoal-800 outline-none cursor-pointer pr-1"
        aria-label="Select Language"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
      {/* Hidden container for Google Translate engine */}
      <div id="google_translate_element" className="hidden"></div>
    </div>
  );
};

export default LanguageSwitcher;
