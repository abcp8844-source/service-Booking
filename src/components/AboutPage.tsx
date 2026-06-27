import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, FileText, Sparkles, Mail, MessageSquare } from 'lucide-react';

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-10">
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 px-4 py-2 rounded-full mb-4 shadow-sm">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <span className="text-sm font-bold text-indigo-600">
              {t('about')}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            {t('about_title')}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
            <FileText className="w-8 h-8 text-blue-600 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('about_us')}</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('about_us_desc')}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
            <Shield className="w-8 h-8 text-purple-600 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('terms_of_service')}</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('terms_desc')}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col md:col-span-2">
            <Shield className="w-8 h-8 text-emerald-600 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('privacy_policy')}</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('privacy_desc')}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl shadow-xl mt-8 p-8 md:p-12 text-center">
          <h2 className="text-3xl font-extrabold mb-4">{t('contact_us')}</h2>
          <p className="text-blue-100 max-w-lg mx-auto mb-8 font-medium">
            {t('contact_desc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:abcp8844@gmail.com" 
               className="flex items-center justify-center gap-2 bg-white text-blue-700 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg">
              <Mail className="w-5 h-5" />
              {t('admin_contact')}
            </a>

            <a href="https://wa.me/message/H4KM5YQEOMITE1" target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-center gap-2 bg-transparent border-2 border-white/30 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition-all">
              <MessageSquare className="w-5 h-5" />
              {t('emergency_support')}
            </a>
          </div>
        </div>

      </main>
    </div>
  );
}
