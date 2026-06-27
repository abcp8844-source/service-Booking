import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find(l => i18n.language?.startsWith(l.code)) || languages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl py-2 px-3 md:px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none hover:bg-gray-100 transition-colors shadow-sm"
      >
        <Globe className="w-4 h-4 text-gray-500" />
        <span className="text-base leading-none">{currentLang.flag}</span>
        <span className="hidden md:inline">{currentLang.name}</span>
        <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden transform right-0 origin-top-right">
          <div className="py-2 max-h-64 overflow-y-auto">
            {languages.map((lang) => {
              const isActive = i18n.language?.startsWith(lang.code);
              return (
                <button
                  key={lang.code}
                  onClick={() => selectLanguage(lang.code)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 font-medium'
                  }`}
                >
                  <span className="text-lg leading-none">{lang.flag}</span>
                  {lang.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
