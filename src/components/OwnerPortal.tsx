import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, setDoc, getDoc, where, deleteDoc } from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase';
import { LogOut, CheckCircle2, Clock, XCircle, Briefcase, MapPin, Loader2, Bell, Volume2, VolumeX, ShieldAlert, Check, Calendar, Phone, RefreshCw, Trash2, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../data/categories';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import LanguageSelector from './LanguageSelector';

interface Booking {
  id: string;
  categoryId: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  appointmentTime?: string;
  status: string;
  createdAt: any;
}

interface ProviderProfile {
  id: string;
  shopName: string;
  categoryId: string;
  location: { lat: number; lng: number };
  rating: number;
  ratingCount: number;
}

// Custom dynamic bell chime using Web Audio API (cross-device & offline support)
const playNotificationChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const now = ctx.currentTime;
    
    // High chime 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // High chime 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.25); // C6
    
    gain2.gain.setValueAtTime(0.12, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.4);
    
    osc2.start(now + 0.1);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.warn('Audio playback blocked or failed:', e);
  }
};

export default function OwnerPortal() {
  const { t } = useTranslation();
  const [user, setUser] = useState(auth.currentUser);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile creation form state
  const [shopName, setShopName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loc, setLoc] = useState<{lat: number; lng: number} | null>(null);
  const [locError, setLocError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Notification and Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationAlert, setNotificationAlert] = useState<string | null>(null);
  const knownBookingIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // 7-Day Memory Keep & Auto Cleanup states
  const [cleanedUpCount, setCleanedUpCount] = useState(0);
  const cleanupExecutedRef = useRef(false);

  // Secure Obfuscated Error states for professional enterprise style
  const [secureError, setSecureError] = useState<{ userMsg: string; code: string } | null>(null);

  const sanitizeAndGetSecureError = (error: any): { userMsg: string; code: string } => {
    const errCode = error?.code || 'unknown';
    const rawMsg = error?.message || '';
    
    // Developer warning inside Console only so standard users never see raw domains or auth setup structures
    console.warn("[DEV DIAGNOSTIC INFO]");
    console.warn(`- Error Code: ${errCode}`);
    console.warn(`- Details: ${rawMsg}`);
    console.warn(`- Current Hostname: ${window.location.hostname}`);
    console.warn(`- Suggestion: If code is 'auth/unauthorized-domain', add "${window.location.hostname}" to your Firebase Console -> Authentication -> Settings -> Authorized Domains.`);
    
    let userMsg = "A security or network connection exception occurred. Please try again or contact your vendor if the issue persists.";
    let code = "SEC-ERR-500";
    
    if (errCode === 'auth/unauthorized-domain') {
      userMsg = "Authentication Domain Check Failed: Current deployment domain is restricted. Security administration has been logged.";
      code = "SEC-ERR-403";
    } else if (errCode === 'auth/popup-closed-by-user') {
      userMsg = "The authentication window was terminated. Please re-initiate login.";
      code = "SEC-ERR-101";
    } else if (errCode === 'auth/cancelled-popup-request') {
      userMsg = "Operation was pre-empted by another session request.";
      code = "SEC-ERR-102";
    } else if (errCode === 'auth/network-request-failed') {
      userMsg = "Network timeout or lost connectivity detected. Check your signal strength.";
      code = "SEC-ERR-301";
    } else if (errCode?.includes('permission-denied') || rawMsg?.toLowerCase().includes('permission')) {
      userMsg = "Security Access Violation: Your security credentials do not authorize this profile action.";
      code = "SEC-ERR-401";
    } else if (errCode === 'profile/save-failed') {
      userMsg = "Database Sync Failed: Unable to record profile data to the secure cloud. Try refreshing.";
      code = "SEC-ERR-601";
    }
    
    return { userMsg, code };
  };

  const getDaysAgo = (createdAt: any) => {
    if (!createdAt) return "Just now";
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const diffTime = Math.abs(new Date().getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const runAutoCleanup = async (currentBookings: Booking[]) => {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - 7); // Cutoff at exactly 7 days

    let deleted = 0;
    for (const booking of currentBookings) {
      let bookingDate: Date | null = null;
      if (booking.createdAt) {
        if (booking.createdAt.toDate) {
          bookingDate = booking.createdAt.toDate();
        } else if (booking.createdAt.seconds) {
          bookingDate = new Date(booking.createdAt.seconds * 1000);
        } else {
          bookingDate = new Date(booking.createdAt);
        }
      }

      if (bookingDate && bookingDate < cutoffDate) {
        try {
          await deleteDoc(doc(db, 'bookings', booking.id));
          deleted++;
        } catch (err) {
          console.error("Auto-delete failed for:", booking.id, err);
        }
      }
    }
    if (deleted > 0) {
      setCleanedUpCount(prev => prev + deleted);
    }
  };

  useEffect(() => {
    if (bookings.length > 0 && !cleanupExecutedRef.current) {
      cleanupExecutedRef.current = true;
      runAutoCleanup(bookings);
    }
  }, [bookings]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const profileRef = doc(db, 'providers', u.uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            setProfile({ id: profileSnap.id, ...profileSnap.data() } as ProviderProfile);
            
            // Real-time listener for bookings matching this business provider ID
            const q = query(
              collection(db, 'bookings'), 
              where('providerId', '==', u.uid), 
              orderBy('createdAt', 'desc')
            );
            
            const unsubscribeDb = onSnapshot(q, (snapshot) => {
              const bs: Booking[] = [];
              snapshot.forEach(doc => bs.push({ id: doc.id, ...doc.data() } as Booking));
              setBookings(bs);
              setLoading(false);
            }, (err) => {
              console.error("Error fetching bookings:", err);
              setLoading(false);
            });
            return () => unsubscribeDb();
          } else {
            setLoading(false);
          }
        } catch (err) {
          console.error("Error loading profile details:", err);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setBookings([]);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Listen for NEW bookings in real-time to trigger play notification chimes
  useEffect(() => {
    if (bookings.length > 0) {
      let foundNewPending = false;
      let newCustomerName = '';
      const currentIds = new Set<string>();

      bookings.forEach(b => {
        currentIds.add(b.id);
        if (b.status === 'pending' && !knownBookingIdsRef.current.has(b.id)) {
          foundNewPending = true;
          newCustomerName = b.customerName;
        }
      });

      // Update ref with all current IDs
      knownBookingIdsRef.current = currentIds;

      if (foundNewPending) {
        if (!isFirstLoadRef.current) {
          if (soundEnabled) {
            playNotificationChime();
          }
          setNotificationAlert(
            newCustomerName 
              ? `New booking request from ${newCustomerName}!` 
              : "New incoming booking request received!"
          );
        }
      }
      isFirstLoadRef.current = false;
    } else {
      isFirstLoadRef.current = false;
    }
  }, [bookings, soundEnabled]);

  const handleLogin = async () => {
    setSecureError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      const secure = sanitizeAndGetSecureError(error);
      setSecureError(secure);
    }
  };

  const handleLogout = () => {
    setSecureError(null);
    auth.signOut();
  };

  // Status transitions
  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { status });
      // Play a positive action click chime
      if (soundEnabled) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(660, now + 0.1);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.1);
        }
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const captureLocation = () => {
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoc({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (err) => {
        setLocError(t('failed_location'));
      }
    );
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !shopName || !categoryId || !loc) return;
    setSavingProfile(true);
    try {
      const newProfile = {
        id: user.uid,
        shopName,
        categoryId,
        location: loc,
        rating: 5.0,
        ratingCount: 0
      };
      await setDoc(doc(db, 'providers', user.uid), newProfile);
      setProfile(newProfile as ProviderProfile);
      
      // Load bookings right after profile creation
      const q = query(
        collection(db, 'bookings'), 
        where('providerId', '==', user.uid), 
        orderBy('createdAt', 'desc')
      );
      onSnapshot(q, (snapshot) => {
        const bs: Booking[] = [];
        snapshot.forEach(doc => bs.push({ id: doc.id, ...doc.data() } as Booking));
        setBookings(bs);
      });
    } catch (err: any) {
      const secure = sanitizeAndGetSecureError({ code: 'profile/save-failed', message: err?.message || 'Failed to save profile' });
      setSecureError(secure);
    }
    setSavingProfile(false);
  };

  // Stats calculation
  const totalCount = bookings.length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const acceptedCount = bookings.filter(b => b.status === 'accepted').length;
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Auth Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-blue-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
            <Briefcase className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('owner_portal', 'Business Login')}</h2>
          <p className="text-gray-500 mb-8 font-medium text-sm leading-relaxed">
            {t('setup_business', 'Sign in with your Google Account to establish your professional listing, track incoming location-based customer booking requests, and organize schedules.')}
          </p>

          {secureError && (
            <div className="mb-6 p-4.5 bg-red-50 border border-red-100 rounded-2xl text-left flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2.5 text-red-700">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm tracking-wide">System Security Check ({secureError.code})</span>
              </div>
              <p className="text-red-600 text-xs font-semibold leading-relaxed">
                {secureError.userMsg}
              </p>
              <button 
                onClick={() => setSecureError(null)}
                className="text-red-500 hover:text-red-700 text-xs font-bold text-right self-end bg-red-100/50 px-3 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-4 font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>{t('register_login', 'Sign in with Google')}</span>
          </motion.button>
        </div>
      </div>
    );
  }

  // Setup Profile Screen
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{t('setup_business', 'Setup Your Business')}</h2>
          <p className="text-gray-500 mb-6 text-sm font-medium leading-relaxed">{t('enter_shop_details', 'Enter your shop details so customers nearby can find you.')}</p>
          
          {secureError && (
            <div className="mb-6 p-4.5 bg-red-50 border border-red-100 rounded-2xl text-left flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2.5 text-red-700">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm tracking-wide">Secure Save Failed ({secureError.code})</span>
              </div>
              <p className="text-red-600 text-xs font-semibold leading-relaxed">
                {secureError.userMsg}
              </p>
              <button 
                onClick={() => setSecureError(null)}
                className="text-red-500 hover:text-red-700 text-xs font-bold text-right self-end bg-red-100/50 px-3 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <form onSubmit={saveProfile} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">{t('business_name', 'Business Name')}</label>
              <input 
                type="text" 
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 font-semibold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none transition-all"
                placeholder="e.g. City Auto Mechanic"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">{t('primary_service', 'Primary Service')}</label>
              <select 
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-4 font-semibold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none transition-all"
              >
                <option value="" disabled>{t('select_service', 'Select a Service')}</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{t(`cat_${cat.id}`, cat.name)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">{t('business_location', 'Business Location')}</label>
              {loc ? (
                <div className="bg-green-50 text-green-700 px-4 py-3.5 rounded-xl flex items-center gap-2 font-bold border border-green-100 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Location Captured!</span>
                </div>
              ) : (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={captureLocation}
                  className="w-full bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-900 rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 font-bold transition-all shadow-sm cursor-pointer"
                >
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  <span>{t('capture_location', 'Capture Shop Location')}</span>
                </motion.button>
              )}
              {locError && <p className="text-red-500 text-sm mt-2 font-semibold">{locError}</p>}
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="submit" 
              disabled={savingProfile || !loc}
              className="w-full bg-indigo-600 text-white rounded-xl py-4 font-extrabold hover:bg-indigo-700 transition-all disabled:opacity-50 mt-2 shadow-lg shadow-indigo-100 cursor-pointer"
            >
              {savingProfile ? 'Saving...' : t('complete_setup', 'Complete Setup')}
            </motion.button>
          </form>
        </div>
      </div>
    );
  }

  // Main Dashboard Panel
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        
        {/* Real-time Toast Alert Notification (with sound option) */}
        {notificationAlert && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl px-5 py-4 mb-6 shadow-lg flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center animate-bounce">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-extrabold text-sm tracking-wide uppercase opacity-90">Notification Alert</p>
                <p className="font-bold text-base">{notificationAlert}</p>
              </div>
            </div>
            <button 
              onClick={() => setNotificationAlert(null)}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              {t('close', 'Dismiss')}
            </button>
          </div>
        )}

        {/* Business Header Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
              <Briefcase className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{profile.shopName}</h1>
              <p className="text-sm font-semibold text-gray-500 flex items-center gap-1.5 mt-1">
                <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {t(`cat_${profile.categoryId}`)}
                </span>
                <span>•</span>
                <span>Active Terminal</span>
              </p>
            </div>
          </div>
                   {/* Controls Bar (Logout, Notification bell sound status indicator) */}
          <div className="flex items-center gap-3 w-full sm:w-auto self-stretch sm:self-auto">
            {/* Sound Toggle controls */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) {
                  playNotificationChime();
                }
              }}
              title={soundEnabled ? "Mute notification sound" : "Enable notification sound"}
              className={`p-3 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                soundEnabled 
                  ? 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100' 
                  : 'bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </motion.button>

            {/* Manual sound trigger test */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={playNotificationChime}
              title="Test chime sound"
              className="p-3 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all flex items-center justify-center cursor-pointer"
            >
              <Bell className="w-5 h-5 animate-pulse" />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className="flex-1 sm:flex-initial text-sm font-bold text-red-600 hover:text-red-700 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 px-5 py-3 rounded-xl transition-all border border-red-100 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>{t('logout', 'Logout')}</span>
            </motion.button>
          </div>
        </div>

        {/* Business Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('total_bookings', 'Total Requests')}</p>
            <p className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">{totalCount}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Pending</p>
            <p className="text-2xl md:text-3xl font-extrabold text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Accepted</p>
            <p className="text-2xl md:text-3xl font-extrabold text-blue-600 mt-1">{acceptedCount}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm">
            <p className="text-xs font-bold text-green-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl md:text-3xl font-extrabold text-green-600 mt-1">{completedCount}</p>
          </div>
        </div>

        {/* 7-Day Memory Keeper & History Analytics Board */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 mb-8 shadow-xl border border-indigo-900/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <ShieldCheck className="w-48 h-48" />
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 relative z-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 bg-indigo-500/20 text-indigo-300 font-extrabold text-xs px-3 py-1 rounded-full w-fit mb-3 border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>7-Day Memory Keeper active</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
                Business Memory & Analytics
              </h2>
              <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed">
                To keep your terminal clean and fast, bookings are preserved for up to 7 days. Expired bookings are automatically deleted from Firebase to refresh space.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center shrink-0">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-center min-w-[120px]">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session Purged</p>
                <p className="text-2xl font-black mt-1 text-indigo-300">
                  {cleanedUpCount} <span className="text-xs font-bold text-slate-400">orders</span>
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-center min-w-[120px]">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Memory</p>
                <p className="text-2xl font-black mt-1 text-emerald-400">
                  {totalCount} <span className="text-xs font-bold text-slate-400">active</span>
                </p>
              </div>
            </div>
          </div>

          {/* History Timeline of Accepted & Cancelled Bookings */}
          <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>7-Day Memory Logs ({bookings.filter(b => b.status !== 'pending').length} historical entries)</span>
            </h3>

            {bookings.filter(b => b.status !== 'pending').length === 0 ? (
              <p className="text-sm text-slate-400 font-semibold italic">No historical actions logged in the past 7 days yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {bookings.filter(b => b.status !== 'pending').map(b => (
                  <div key={b.id} className="bg-white/5 border border-white/5 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-extrabold text-white text-sm">{b.customerName}</p>
                      <p className="text-slate-400 font-semibold mt-1">
                        {b.serviceName} • {getDaysAgo(b.createdAt)}
                      </p>
                    </div>
                    <div>
                      {b.status === 'accepted' && (
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-black uppercase tracking-wider text-[9px]">
                          Accepted
                        </span>
                      )}
                      {b.status === 'completed' && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-black uppercase tracking-wider text-[9px]">
                          Completed
                        </span>
                      )}
                      {b.status === 'cancelled' && (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-black uppercase tracking-wider text-[9px]">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bookings Request Management List */}
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 mb-4">
            <span>{t('recent_bookings', 'Recent Booking Requests')}</span>
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {pendingCount}
              </span>
            )}
          </h2>

          {bookings.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{t('no_bookings', 'No bookings yet.')}</h3>
              <p className="text-gray-500 text-sm font-medium">When customers book your services, requests will instantly sound and populate here in real-time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {bookings.map(booking => (
                <div 
                  key={booking.id} 
                  className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden ${
                    booking.status === 'pending' ? 'border-amber-200 ring-2 ring-amber-500/5 bg-amber-50/5' : 'border-gray-100'
                  }`}
                >
                  {/* Status ribbon accent */}
                  {booking.status === 'pending' && <div className="absolute top-0 right-0 left-0 h-1.5 bg-amber-400"></div>}
                  {booking.status === 'accepted' && <div className="absolute top-0 right-0 left-0 h-1.5 bg-blue-500"></div>}
                  {booking.status === 'completed' && <div className="absolute top-0 right-0 left-0 h-1.5 bg-green-500"></div>}
                  {booking.status === 'cancelled' && <div className="absolute top-0 right-0 left-0 h-1.5 bg-red-400"></div>}

                  <div>
                    <div className="flex justify-between items-start mb-4 pt-1">
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-lg leading-snug">{booking.customerName}</h3>
                        <p className="text-gray-500 text-sm font-semibold flex items-center gap-1 mt-1">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{booking.customerPhone}</span>
                        </p>
                      </div>
                      
                      {/* Status Icon */}
                      <div className="shrink-0">
                        {booking.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                        {booking.status === 'accepted' && (
                          <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200">
                            <Check className="w-3 h-3" />
                            <span>Accepted</span>
                          </span>
                        )}
                        {booking.status === 'completed' && (
                          <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Completed</span>
                          </span>
                        )}
                        {booking.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">
                            <XCircle className="w-3 h-3" />
                            <span>Cancelled</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Booking appointment schedule */}
                    {booking.appointmentTime && (
                      <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-3 mb-4 text-xs font-bold text-gray-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Scheduled Appointment</p>
                          <p className="mt-0.5 font-semibold text-gray-800">
                            {new Date(booking.appointmentTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="pt-3 border-t border-gray-100 flex gap-2.5 mt-4">
                    
                    {/* Status is Pending: Can Accept or Decline */}
                    {booking.status === 'pending' && (
                      <>
                        <motion.button 
                          whileHover={{ scale: 1.03, y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => updateStatus(booking.id, 'accepted')}
                          className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{t('accept', 'Accept')}</span>
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.03, y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => updateStatus(booking.id, 'cancelled')}
                          className="flex-1 bg-red-50 text-red-600 border border-red-100 rounded-xl py-3 text-sm font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>{t('decline', 'Decline')}</span>
                        </motion.button>
                      </>
                    )}

                    {/* Status is Accepted: Can Complete or Cancel */}
                    {booking.status === 'accepted' && (
                      <>
                        <motion.button 
                          whileHover={{ scale: 1.03, y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => updateStatus(booking.id, 'completed')}
                          className="flex-1 bg-green-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-green-700 transition-all shadow-md shadow-green-100 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t('complete', 'Complete')}</span>
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.03, y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => updateStatus(booking.id, 'cancelled')}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>{t('decline', 'Cancel')}</span>
                        </motion.button>
                      </>
                    )}

                    {/* Status is Completed or Cancelled (Static Badge/History) */}
                    {(booking.status === 'completed' || booking.status === 'cancelled') && (
                      <span className={`text-sm font-extrabold text-center py-3 rounded-xl w-full flex items-center justify-center gap-1 ${
                        booking.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {booking.status === 'completed' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{t('completed', 'Completed')}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>{t('declined', 'Cancelled')}</span>
                          </>
                        )}
                      </span>
                    )}

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
