import React, { useState, useEffect } from 'react';
import { CATEGORIES, ServiceCategory } from '../data/categories';
import { Search, ChevronLeft, MapPin, User, Phone, CheckCircle2, AlertCircle, Star, Sparkles, Navigation, Map, Calendar, Briefcase, Globe } from 'lucide-react';
import * as Icons from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { calculateDistance } from '../utils/distance';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import AIAssistantModal from './AIAssistantModal';

interface Provider {
  id: string;
  shopName: string;
  categoryId: string;
  location: { lat: number; lng: number };
  rating: number;
  ratingCount: number;
  distance?: number;
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [step, setStep] = useState<'categories' | 'location' | 'providers' | 'booking'>('categories');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  
  const [customLocation, setCustomLocation] = useState('');
  const [locError, setLocError] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const translatedCategories = CATEGORIES.map(cat => ({
    ...cat,
    translatedName: t(`cat_${cat.id}`, cat.name)
  }));

  const filteredCategories = translatedCategories.filter(cat => 
    cat.translatedName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    cat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategorySelect = (cat: typeof translatedCategories[0]) => {
    setSelectedCategory(cat);
    setStep('location');
    setLocError('');
    setCustomLocation('');
  };

  const requestCurrentLocation = async () => {
    setLoadingProviders(true);
    setLocError('');
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported by your browser');
      }
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      await fetchProviders(coords);
    } catch (err: any) {
      setLoadingProviders(false);
      setLocError(t('failed_location'));
    }
  };

  const searchCustomLocation = async () => {
    if (!customLocation.trim()) return;
    setLoadingProviders(true);
    setLocError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customLocation)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        await fetchProviders(coords);
      } else {
        throw new Error("Location not found");
      }
    } catch (err: any) {
      setLoadingProviders(false);
      setLocError('Could not find that location. Please try another city name.');
    }
  };

  const fetchProviders = async (coords: {lat: number, lng: number}) => {
    if (!selectedCategory) return;
    try {
      const q = query(collection(db, 'providers'), where('categoryId', '==', selectedCategory.id));
      const snapshot = await getDocs(q);
      
      const found: Provider[] = [];
      snapshot.forEach(doc => {
        const p = { id: doc.id, ...doc.data() } as Provider;
        const dist = calculateDistance(coords.lat, coords.lng, p.location.lat, p.location.lng);
        // Do not limit distance tightly, since it's a global app.
        // We'll just sort by nearest first.
        p.distance = dist;
        found.push(p);
      });
      
      // Sort by nearest first
      found.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      // Show top 20 nearest globally
      setProviders(found.slice(0, 20));
      setStep('providers');
    } catch (error) {
      console.error(error);
      setLocError('Error loading nearby services.');
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !selectedProvider || !customerName || !customerPhone) return;

    setBookingStatus('submitting');
    setErrorMsg('');
    try {
      await addDoc(collection(db, 'bookings'), {
        providerId: selectedProvider.id,
        categoryId: selectedCategory.id,
        serviceName: selectedCategory.name,
        customerName,
        customerPhone,
        appointmentTime,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setBookingStatus('success');
      setCustomerName('');
      setCustomerPhone('');
      setAppointmentTime('');
    } catch (error) {
      console.error('Error booking service:', error);
      setBookingStatus('idle');
      setErrorMsg('Failed to book. Please try again.');
    }
  };

  // Rendering Icon dynamically
  const IconComponent = ({ name, className }: { name: string, className?: string }) => {
    const Icon = (Icons as any)[name] || Icons.HelpCircle;
    return <Icon className={className} />;
  };

  if (bookingStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500 font-medium mb-8">
            Your request has been sent to <strong>{selectedProvider?.shopName}</strong>. They will contact you shortly.
          </p>
          <button 
            onClick={() => {
              setBookingStatus('idle');
              setSelectedProvider(null);
              setStep('categories');
              setSelectedCategory(null);
            }}
            className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            {t('complete', 'Done')}
          </button>
        </div>
      </div>
    );
  }

  const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2" onClick={() => { setStep('categories'); setSelectedCategory(null); setSelectedProvider(null); }} style={{cursor: 'pointer'}}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">{t('app_title')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <Link to="/owner" className="group relative px-5 py-2.5 md:px-6 md:py-3 font-bold text-white rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all overflow-hidden flex items-center gap-2">
            <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out"></div>
            <Briefcase className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="relative text-sm md:text-base">{t('register_login')}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {step === 'categories' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="pt-6 pb-8 text-center max-w-2xl mx-auto flex flex-col items-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 leading-tight">
                {t('where_need').replace('{{category}}', '')}
              </h2>
              
              <div className="flex flex-col items-center gap-3 mb-4">
                <button 
                  onClick={() => setShowAiModal(true)}
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white rounded-full px-6 py-3 font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{t('ask_ai', 'Ask AI')}</span>
                </button>
                <p className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  This is about the AI
                </p>
              </div>

              <p className="text-lg text-gray-500 font-medium">
                Will find professional near this location.
              </p>
            </div>

            <div className="relative max-w-2xl mx-auto mb-10 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input 
                  type="text" 
                  placeholder={t('select_service')} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4.5 pl-14 pr-4 text-lg font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {filteredCategories.map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat)}
                  className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-3xl hover:border-blue-200 hover:bg-blue-50 hover:shadow-md transition-all text-center group aspect-square shadow-sm"
                >
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-300">
                    <IconComponent name={cat.icon} className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm leading-tight px-1">{cat.translatedName}</h4>
                </button>
              ))}
            </div>
            {filteredCategories.length === 0 && (
              <div className="py-12 text-center text-gray-500 font-medium text-lg">
                No services found matching "{searchTerm}"
              </div>
            )}
          </div>
        )}

        {step === 'location' && selectedCategory && (
          <div className="max-w-xl mx-auto w-full animate-in fade-in slide-in-from-right-8 duration-300">
            <button 
              onClick={() => setStep('categories')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-bold transition-colors bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm w-fit"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('back')}
            </button>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xl shadow-gray-100/50 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('where_need', {category: t(`cat_${selectedCategory.id}`)})}</h2>
              <p className="text-gray-500 font-medium mb-8">{t('find_professionals')}</p>

              {loadingProviders ? (
                <div className="py-8 flex flex-col items-center justify-center text-gray-500">
                  <div className="w-10 h-10 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="font-bold">Locating...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={requestCurrentLocation}
                    className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-5 h-5" />
                    {t('use_current_location')}
                  </button>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 font-bold text-sm">{t('or')}</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <Map className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder={t('enter_city')} 
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchCustomLocation()}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <button 
                      onClick={searchCustomLocation}
                      disabled={!customLocation.trim()}
                      className="w-full bg-gray-900 text-white rounded-xl py-4 font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
                    >
                      {t('search_location')}
                    </button>
                  </div>
                </div>
              )}

              {locError && (
                <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl text-sm border border-red-100 text-left">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="font-bold">{locError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'providers' && selectedCategory && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
            <button 
              onClick={() => setStep('location')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-bold transition-colors bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm w-fit"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('back')}
            </button>
            
            <div className="mb-8 flex items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">{t(`cat_${selectedCategory.id}`)}</h2>
                <p className="text-gray-500 mt-1 font-medium flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  {t('available_providers')}
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center hidden sm:flex">
                <IconComponent name={selectedCategory.icon} className="w-7 h-7 text-blue-600" />
              </div>
            </div>

            {providers.length === 0 ? (
              <div className="bg-white border border-gray-200 border-dashed rounded-3xl p-16 text-center shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <MapPin className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('no_providers')}</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {providers.map(p => (
                  <div key={p.id} className="bg-white border border-gray-100 rounded-3xl p-6 hover:border-blue-200 hover:shadow-lg transition-all flex flex-col shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-xl leading-tight">{p.shopName}</h3>
                        <div className="flex items-center gap-1.5 text-sm mt-2 font-bold bg-yellow-50 text-yellow-700 w-fit px-2.5 py-1 rounded-lg">
                          <Star className="w-4 h-4 fill-current" />
                          <span>{p.rating.toFixed(1)}</span>
                          <span className="opacity-75 font-medium">({p.ratingCount} reviews)</span>
                        </div>
                      </div>
                      <div className="bg-blue-50 text-blue-700 text-sm font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0">
                        <MapPin className="w-4 h-4" />
                        {p.distance?.toFixed(1)} km
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedProvider(p);
                        setStep('booking');
                      }}
                      className="mt-auto w-full bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-100 rounded-xl py-3.5 font-bold transition-all"
                    >
                      {t('book_now')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'booking' && selectedProvider && (
          <div className="max-w-xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-300">
            <button 
              onClick={() => setStep('providers')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-bold transition-colors bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm w-fit"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('back')}
            </button>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xl shadow-gray-100/50">
              <div className="mb-8">
                <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">Book {selectedProvider.shopName}</h3>
                <p className="text-gray-500 mt-2 font-medium">Please provide your details to confirm the appointment.</p>
              </div>

              <form onSubmit={handleBooking} className="flex flex-col gap-5">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    required
                    placeholder="Your Full Name" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="tel" 
                    required
                    placeholder="Your Phone Number" 
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="datetime-local" 
                    required
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-700"
                  />
                </div>
                
                {errorMsg && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl text-sm mt-2 border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="font-bold">{errorMsg}</p>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={bookingStatus === 'submitting'}
                  className="w-full bg-blue-600 text-white rounded-xl py-4.5 font-bold text-lg hover:bg-blue-700 transition-all disabled:opacity-70 mt-4 shadow-lg shadow-blue-200"
                >
                  {bookingStatus === 'submitting' ? 'Confirming...' : 'Confirm Appointment'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <AIAssistantModal 
        isOpen={showAiModal} 
        onClose={() => setShowAiModal(false)} 
        onSelectCategory={handleCategorySelect}
      />
    </div>
  );
                }
