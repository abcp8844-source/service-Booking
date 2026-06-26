import React, { useState, useEffect } from 'react';
import { CATEGORIES, ServiceCategory } from '../data/categories';
import { Search, ChevronLeft, MapPin, User, Phone, CheckCircle2, AlertCircle, Star, Sparkles, Navigation, Map, Calendar, Briefcase, Globe, HelpCircle, Share2 } from 'lucide-react';
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

  const filteredCategories = CATEGORIES.filter(cat => 
    t(`cat_${cat.id}`, cat.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const requestCurrentLocation = async () => {
    setLoadingProviders(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
      await fetchProviders({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setLoadingProviders(false);
      setLocError('ERR-001');
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
        p.distance = calculateDistance(coords.lat, coords.lng, p.location.lat, p.location.lng);
        found.push(p);
      });
      found.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setProviders(found.slice(0, 20));
      setStep('providers');
    } catch {
      setLocError('ERR-503');
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStatus('submitting');
    try {
      await addDoc(collection(db, 'bookings'), {
        providerId: selectedProvider?.id,
        customerName,
        customerPhone,
        appointmentTime,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setBookingStatus('success');
    } catch {
      setBookingStatus('idle');
      setErrorMsg('ERR-002');
    }
  };

  const IconComponent = ({ name }: { name: string }) => {
    const Icon = (Icons as any)[name] || Icons.HelpCircle;
    return <Icon className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold">{t('app_title')}</h1>
        <LanguageSelector />
      </header>

      <main className="flex-1 max-w-5xl mx-auto p-6">
        {step === 'categories' && (
          <div className="space-y-6">
            <button onClick={() => setShowAiModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold">
              {t('ask_ai')}
            </button>
            <input 
              placeholder={t('select_service')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-4 border rounded-2xl"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredCategories.map((cat) => (
                <button key={cat.id} onClick={() => { setSelectedCategory(cat); setStep('location'); }} className="p-4 bg-white border rounded-3xl">
                  <IconComponent name={cat.icon} />
                  <span className="font-bold">{t(`cat_${cat.id}`, cat.name)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {step === 'location' && (
           <div className="space-y-4">
             <button onClick={() => setStep('categories')} className="p-2 border rounded-full"><ChevronLeft /></button>
             <button onClick={requestCurrentLocation} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">{t('use_current_location')}</button>
           </div>
        )}
        
        {step === 'providers' && (
           <div className="space-y-4">
             <button onClick={() => setStep('location')} className="p-2 border rounded-full"><ChevronLeft /></button>
             {providers.map(p => (
               <div key={p.id} className="p-6 bg-white rounded-3xl border">
                 <h3 className="font-bold text-xl">{p.shopName}</h3>
                 <button onClick={() => { setSelectedProvider(p); setStep('booking'); }} className="mt-4 w-full bg-blue-50 py-3 rounded-xl font-bold">{t('book_now')}</button>
               </div>
             ))}
           </div>
        )}

        {step === 'booking' && (
          <form onSubmit={handleBooking} className="p-8 bg-white rounded-3xl border space-y-4">
             <input required placeholder="Name" onChange={(e) => setCustomerName(e.target.value)} className="w-full p-4 border rounded-xl" />
             <input required placeholder="Phone" onChange={(e) => setCustomerPhone(e.target.value)} className="w-full p-4 border rounded-xl" />
             <input type="datetime-local" required onChange={(e) => setAppointmentTime(e.target.value)} className="w-full p-4 border rounded-xl" />
             <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Confirm</button>
             {errorMsg && <p className="text-red-500 font-bold">{errorMsg}</p>}
          </form>
        )}
      </main>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        <Link to="/support" className="p-3 bg-white border border-gray-200 rounded-full shadow-lg hover:scale-110 transition-transform">
          <HelpCircle className="w-6 h-6 text-blue-600" />
        </Link>
        <button onClick={() => navigator.share({title: 'App', url: window.location.href})} className="p-3 bg-blue-600 rounded-full shadow-lg hover:scale-110 transition-transform">
          <Share2 className="w-6 h-6 text-white" />
        </button>
      </div>

      <AIAssistantModal isOpen={showAiModal} onClose={() => setShowAiModal(false)} onSelectCategory={(cat) => { setSelectedCategory(cat); setStep('location'); }} />
    </div>
  );
}
