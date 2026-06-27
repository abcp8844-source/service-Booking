import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-80 bg-gray-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between z-50 animate-in slide-in-from-bottom-5">
      <div className="flex flex-col pr-4">
        <span className="font-semibold text-sm">Install Service Book</span>
        <span className="text-xs text-gray-400 mt-0.5">Add to home screen for quick access</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={handleInstallClick}
          className="bg-white text-gray-900 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          Install
        </button>
        <button 
          onClick={() => setShowPrompt(false)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
