/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './components/Home';
import OwnerPortal from './components/OwnerPortal';
import AboutPage from './components/AboutPage';
import PWAInstallPrompt from './components/PWAInstallPrompt';

export default function App() {
  return (
    <BrowserRouter>
      <PWAInstallPrompt />
      <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans">
        {/* Global Nav Bar with Gemini Logo & Language switching */}
        <Navigation />
        
        {/* Route screens */}
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/owner" element={<OwnerPortal />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
