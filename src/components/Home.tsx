import React, { useState, useEffect } from 'react';
import { CATEGORIES, ServiceCategory } from '../data/categories';
import { Search, ChevronLeft, MapPin, User, Phone, CheckCircle2, AlertCircle, Star, Sparkles, Navigation, Map, Calendar, Briefcase, Globe } from 'lucide-react';
import * as Icons from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { calculateDistance } from '../utils/distance';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
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
      console.warn("[DEV DIAGNOSTIC] Geolocation acquisition failed:", err);
      setLocError("Location Access Check Failed (Code: ERR-LOC-401). Please verify permissions or enter location manually.");
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
      console.warn("[DEV DIAGNOSTIC] Custom search resolving failed:", err);
      setLocError("Address Query Unresolved (Code: ERR-GEO-404). Try searching with a broader city name.");
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
    } catch (error: any) {
      console.error("[DEV DIAGNOSTIC] Error fetching provider listing:", error);
      setLocError("Directory Sync Issue (Code: ERR-DB-502). System query timed out. Check firestore indexing.");
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
    } catch (error: any) {
      console.error('[DEV DIAGNOSTIC] Error posting booking record:', error);
      setBookingStatus('idle');
      setErrorMsg("Transaction Record Error (Code: ERR-TX-603). Failed to book. Check database write security rules.");
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
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setBookingStatus('idle');
              setSelectedProvider(null);
              setStep('categories');
              setSelectedCategory(null);
            }}
            className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 cursor-pointer"
          >
            {t('complete', 'Done')}
          </motion.button>
        </div>
      </div>
    );
  }

  const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {step === 'categories' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Elegant Spacious Header */}
            <div className="pt-10 pb-12 text-center max-w-3xl mx-auto flex flex-col items-center">
              <h2 className="text-4xl md:text-5xl font-black text-gray-950 tracking-tight mb-4 leading-tight bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 bg-clip-text text-transparent">
                {t('where_need').replace('{{category}}', '')}
              </h2>
              <p className="text-gray-500 font-medium text-base md:text-lg max-w-lg">
                {t('find_professionals_near_you', 'Discover and book elite local service providers instantly.')}
              </p>
            </div>

            {/* Combined Search & AI Bar - Sleek & Modern */}
            <div className="relative max-w-2xl mx-auto mb-14 flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder={t('select_service', 'Search for services (e.g. Mechanic, Salon, Plumber)...')} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-200/80 rounded-2xl py-4 pl-13 pr-4 text-base font-semibold focus:outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-500 shadow-sm transition-all text-gray-800"
                />
              </div>
              <motion.button 
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAiModal(true)}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl px-6 py-4 font-extrabold flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10 cursor-pointer text-sm shrink-0 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
                <span>{t('ask_ai', 'Consult AI Assistant')}</span>
              </motion.button>
            </div>

            {/* Beautiful Spacious Category Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
              {filteredCategories.map((cat, idx) => (
                <motion.button 
                  key={cat.id}
                  whileHover={{ 
                    scale: 1.05, 
                    y: -4, 
                    boxShadow: "0 12px 20px -8px rgba(99, 102, 241, 0.15)"
                  }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 350, damping: 18 }}
                  onClick={() => handleCategorySelect(cat)}
                  className="flex flex-col items-center justify-center p-6 bg-white border border-gray-100 rounded-3xl hover:border-indigo-100 transition-all text-center group aspect-square shadow-sm cursor-pointer"
                >
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-50 group-hover:scale-110 transition-all duration-300">
                    <IconComponent name={cat.icon} className="w-6 h-6 text-gray-600 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <h4 className="font-extrabold text-gray-900 text-sm md:text-base leading-tight px-1 group-hover:text-indigo-900 transition-colors">
                    {cat.translatedName}
                  </h4>
                </motion.button>
              ))}
            </div>
            {filteredCategories.length === 0 && (
              <div className="py-16 text-center text-gray-400 font-bold text-lg animate-pulse">
                No services found matching "{searchTerm}"
              </div>
            )}
          </div>
        )}

        {step === 'location' && selectedCategory && (
          <div className="max-w-xl mx-auto w-full animate-in fade-in slide-in-from-right-8 duration-300 pb-20">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep('categories')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 font-bold transition-colors bg-white px-5 py-2.5 rounded-full border border-gray-200 shadow-sm w-fit cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('back')}
            </motion.button>

            <div className="bg-white border border-gray-150 rounded-3xl p-8 md:p-10 shadow-xl shadow-indigo-100/30 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2 leading-tight">
                {t('where_need', {category: t(`cat_${selectedCategory.id}`)})}
              </h2>
              <p className="text-gray-400 font-semibold mb-10 text-sm md:text-base">{t('find_professionals')}</p>

              {loadingProviders ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                  <div className="w-10 h-10 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="font-bold">Locating nearby service providers...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5 pt-2">
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={requestCurrentLocation}
                    className="w-full bg-blue-600 text-white rounded-2xl py-4.5 font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Navigation className="w-5 h-5" />
                    {t('use_current_location')}
                  </motion.button>

                  <div className="relative flex items-center py-4">
                    <div className="flex-grow border-t border-gray-100"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-300 font-extrabold text-xs uppercase tracking-widest">{t('or')}</span>
                    <div className="flex-grow border-t border-gray-100"></div>
                  </div>

                  <div className="flex flex-col gap-3 mt-2">
                    <div className="relative">
                      <Map className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder={t('enter_city', 'Enter your city or area...')} 
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchCustomLocation()}
                        className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl py-4 pl-12 pr-4 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-gray-850"
                      />
                    </div>
                    <motion.button 
                      whileHover={customLocation.trim() ? { scale: 1.02, y: -1 } : {}}
                      whileTap={customLocation.trim() ? { scale: 0.98 } : {}}
                      onClick={searchCustomLocation}
                      disabled={!customLocation.trim()}
                      className="w-full bg-gray-950 text-white rounded-2xl py-4 font-extrabold text-base hover:bg-gray-900 transition-all disabled:opacity-40 cursor-pointer"
                    >
                      {t('search_location')}
                    </motion.button>
                  </div>
                </div>
              )}

              {locError && (
                <div className="mt-8 flex items-center gap-2.5 text-red-600 bg-red-50 p-4 rounded-2xl text-sm border border-red-100 text-left animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="font-semibold">{locError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'providers' && selectedCategory && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300 pb-20">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep('location')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 font-bold transition-colors bg-white px-5 py-2.5 rounded-full border border-gray-200 shadow-sm w-fit cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('back')}
            </motion.button>
            
            <div className="mb-10 flex items-center justify-between bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div>
                <h2 className="text-3xl font-black text-gray-900 leading-tight">{t(`cat_${selectedCategory.id}`)}</h2>
                <p className="text-gray-400 mt-2 font-bold text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  {t('available_providers')}
                </p>
              </div>
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center hidden sm:flex">
                <IconComponent name={selectedCategory.icon} className="w-7 h-7 text-indigo-600" />
              </div>
            </div>

            {providers.length === 0 ? (
              <div className="bg-white border border-gray-200 border-dashed rounded-3xl p-20 text-center shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('no_providers')}</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {providers.map(p => (
                  <div key={p.id} className="bg-white border border-gray-100 rounded-3xl p-8 hover:border-indigo-150 hover:shadow-xl transition-all flex flex-col shadow-sm">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="font-black text-gray-950 text-2xl leading-tight">{p.shopName}</h3>
                        <div className="flex items-center gap-1.5 text-sm mt-3 font-extrabold bg-amber-50 text-amber-700 w-fit px-3 py-1 rounded-xl">
                          <Star className="w-4 h-4 fill-current text-amber-500" />
                          <span>{p.rating.toFixed(1)}</span>
                          <span className="opacity-75 font-semibold">({p.ratingCount} reviews)</span>
                        </div>
                      </div>
                      <div className="bg-indigo-50 text-indigo-700 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 shrink-0 uppercase tracking-wider">
                        <MapPin className="w-4 h-4" />
                        {p.distance?.toFixed(1)} km
                      </div>
                    </div>
                    {/* Position Button Lower with mt-auto and extra space */}
                    <div className="mt-8 pt-4">
                      <motion.button 
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedProvider(p);
                          setStep('booking');
                        }}
                        className="w-full bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-100 rounded-xl py-4 font-bold transition-all text-base cursor-pointer"
                      >
                        {t('book_now')}
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'booking' && selectedProvider && (
          <div className="max-w-xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-300 pb-20">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep('providers')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 font-bold transition-colors bg-white px-5 py-2.5 rounded-full border border-gray-200 shadow-sm w-fit cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('back')}
            </motion.button>

            <div className="bg-white border border-gray-150 rounded-3xl p-8 md:p-10 shadow-xl shadow-indigo-100/30">
              <div className="mb-10">
                <h3 className="text-3xl font-black text-gray-950 leading-tight">Book {selectedProvider.shopName}</h3>
                <p className="text-gray-400 mt-2 font-semibold">Please provide your details below to finalize the appointment.</p>
              </div>

              <form onSubmit={handleBooking} className="flex flex-col gap-6">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    required
                    placeholder="Your Full Name" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl py-4 pl-12 pr-4 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-gray-800"
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
                    className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl py-4 pl-12 pr-4 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-gray-800"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="datetime-local" 
                    required
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl py-4 pl-12 pr-4 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-gray-700"
                  />
                </div>
                
                {errorMsg && (
                  <div className="flex items-center gap-2.5 text-red-600 bg-red-50 p-4 rounded-2xl text-sm border border-red-100 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="font-semibold">{errorMsg}</p>
                  </div>
                )}

                {/* Adjusting the Action Button Lower as requested */}
                <div className="mt-8 pt-6 border-t border-gray-50">
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={bookingStatus === 'submitting'}
                    className="w-full bg-blue-600 text-white rounded-2xl py-4.5 font-bold text-lg hover:bg-blue-700 transition-all disabled:opacity-70 shadow-lg shadow-blue-500/10 cursor-pointer"
                  >
                    {bookingStatus === 'submitting' ? 'Confirming...' : 'Confirm Appointment'}
                  </motion.button>
                </div>
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


