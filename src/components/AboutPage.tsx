import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, FileText, PhoneCall, Mail, MapPin, Sparkles } from 'lucide-react';

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-10">
        
        {/* Header Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 px-4 py-2 rounded-full mb-4 shadow-sm animate-bounce">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('about', 'About Gemini Booking')}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            {t('about_title', 'Terms, Privacy & Support')}
          </h1>
          <p className="text-lg text-gray-500 font-medium mt-3 max-w-2xl mx-auto">
            {t('about_subtitle', 'We connect you with high-quality professionals in your area using smart location features.')}
          </p>
        </div>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Section: Terms of Service */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 hover:shadow-md transition-all flex flex-col">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              {t('terms_service', 'Terms of Service')}
            </h2>
            <div className="text-gray-600 text-sm leading-relaxed space-y-3.5 flex-1">
              <p className="font-semibold text-gray-800">1. {t('tos_1_title', 'Platform Services')}</p>
              <p>{t('tos_1_desc', 'Our platform acts as an intermediate channel connecting service seekers with local business providers. Bookings made are directly negotiated between user and provider.')}</p>
              
              <p className="font-semibold text-gray-800">2. {t('tos_2_title', 'Accuracy of Listings')}</p>
              <p>{t('tos_2_desc', 'Providers are solely responsible for updating their accurate shop details, primary services, and current location metrics.')}</p>

              <p className="font-semibold text-gray-800">3. {t('tos_3_title', 'Fair Usage')}</p>
              <p>{t('tos_3_desc', 'Please respect appointments and cancel in advance if you cannot arrive. Repeated empty bookings may result in platform restrictions.')}</p>
            </div>
          </div>

          {/* Section: Privacy Policy */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 hover:shadow-md transition-all flex flex-col">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              {t('privacy_policy', 'Privacy Policy')}
            </h2>
            <div className="text-gray-600 text-sm leading-relaxed space-y-3.5 flex-1">
              <p className="font-semibold text-gray-800">1. {t('priv_1_title', 'Location Data')}</p>
              <p>{t('priv_1_desc', 'We access your live geolocation coordinates only with your explicit permission to suggest the nearest service providers. We do not track or save your continuous location history.')}</p>

              <p className="font-semibold text-gray-800">2. {t('priv_2_title', 'Booking Information')}</p>
              <p>{t('priv_2_desc', 'We securely process customer names, telephone numbers, and appointment schedule records in Firebase database. This is visible only to the specific provider you book.')}</p>

              <p className="font-semibold text-gray-800">3. {t('priv_3_title', 'Data Retention')}</p>
              <p>{t('priv_3_desc', 'You can request to delete your historical bookings and business listings anytime by contacting our team.')}</p>
            </div>
          </div>
        </div>

        {/* Contact Us Full-Width Card */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-3xl shadow-xl mt-8 p-8 md:p-10 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10 scale-150">
            <PhoneCall className="w-96 h-96" />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold mb-4">{t('contact_us', 'Need Assistance? Contact Us')}</h2>
            <p className="text-indigo-100 max-w-xl font-medium text-base mb-8">
              {t('contact_desc', 'Whether you are a customer searching for services, or a business owner experiencing setup difficulties, we are here to support you round-the-clock.')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all">
                <Mail className="w-6 h-6 text-indigo-200 shrink-0" />
                <div>
                  <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">{t('email', 'Email')}</p>
                  <a href="mailto:support@service-booking.com" className="text-sm font-semibold hover:underline">
                    support@booking.com
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all">
                <PhoneCall className="w-6 h-6 text-indigo-200 shrink-0" />
                <div>
                  <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">{t('phone', 'Phone Support')}</p>
                  <a href="tel:+1234567890" className="text-sm font-semibold hover:underline">
                    +1 (234) 567-890
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all">
                <MapPin className="w-6 h-6 text-indigo-200 shrink-0" />
                <div>
                  <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">{t('location', 'Global HQ')}</p>
                  <p className="text-sm font-semibold">
                    Silicon Valley, California
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
