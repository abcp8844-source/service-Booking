import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Briefcase, Info, Sparkles } from 'lucide-react';
import LanguageSelector from './LanguageSelector';

export default function Navigation() {
  const { t } = useTranslation();

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40 px-4 md:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Brand Logo with Premium Gemini Spark Design */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <svg className="w-9 h-9 animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C12 2 12.5 7.5 15 10C17.5 12.5 22 12 22 12C22 12 17.5 12.5 15 15C12.5 17.5 12 22 12 22C12 22 11.5 16.5 9 14C6.5 11.5 2 12 2 12C2 12 6.5 11.5 9 9C11.5 6.5 12 2 12 2Z" fill="url(#geminiGrad)" />
            <path d="M18 4C18 4 18.25 5.5 19 6.25C19.75 7 21 7 21 7C21 7 19.75 7.25 19 8C18.25 8.75 18 10 18 10C18 10 17.75 8.75 17 8C16.25 7.25 15 7C15 7C15 7 16.25 7 17 6.25C17.75 5.5 18 4 18 4Z" fill="url(#geminiGradSmall)" />
            <defs>
              <linearGradient id="geminiGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
              <linearGradient id="geminiGradSmall" x1="15" y1="4" x2="21" y2="10" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div>
          <span className="font-extrabold text-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            Gemini Booking
          </span>
          <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
            AI Active
          </span>
        </div>
      </div>

      {/* Main Tabs (Navigation Links) */}
      <div className="flex items-center bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shadow-inner w-full sm:w-auto overflow-x-auto gap-1">
        <NavLink 
          to="/" 
          className={({ isActive }) => `flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-1 sm:flex-none ${
            isActive 
              ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50 scale-[1.02]' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t('user_panel', 'User Panel')}</span>
        </NavLink>

        <NavLink 
          to="/owner" 
          className={({ isActive }) => `flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-1 sm:flex-none ${
            isActive 
              ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50 scale-[1.02]' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>{t('owner_portal', 'Owner Portal')}</span>
        </NavLink>

        <NavLink 
          to="/about" 
          className={({ isActive }) => `flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-1 sm:flex-none ${
            isActive 
              ? 'bg-white text-purple-600 shadow-sm border border-gray-200/50 scale-[1.02]' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>{t('about', 'About')}</span>
        </NavLink>
      </div>

      {/* Language Selector & Actions */}
      <div className="flex items-center gap-3">
        <LanguageSelector />
      </div>
    </nav>
  );
}
