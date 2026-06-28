'use client';

import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User, MapPin, Link as LinkIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { ServiceCategory } from '../data/categories';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: ServiceCategory) => void;
}

export default function AIAssistantModal({ isOpen, onClose, onSelectCategory }: AIAssistantModalProps) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'ai'|'user', content: string}[]>([
    { role: 'ai', content: "Welcome to Booking Service! I can help you find the best nearby shops and book appointments. How can I assist you?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQuery = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/suggest-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery })
      });
      
      const data = await res.json();
      
      // اب AI کا جواب 'reply' کی صورت میں آئے گا جو لوکیشن اور دکانوں کے لنکس پر مشتمل ہوگا
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: data.reply || "I am ready to help. Please confirm if this is the service you are looking for by typing 'Yes'." 
      }]);

    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: "I'm having trouble connecting. If you have an urgent issue like login, please visit our 'Contact Us' page for emergency support." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[600px] border border-gray-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6" />
              <div>
                <h3 className="font-bold text-lg">Booking Service Assistant</h3>
                <p className="text-blue-100 text-xs">Appointments & Shop Locations</p>
              </div>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-indigo-600'} text-white`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && <div className="text-xs text-gray-500 animate-pulse text-center">Assistant is finding best shops for you...</div>}
        </div>

        <div className="p-4 bg-white border-t">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.g., Find nearby Electrician..."
              className="w-full bg-gray-100 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="submit" className="absolute right-2 top-2 p-1.5 text-indigo-600"><Send className="w-5 h-5" /></button>
          </form>
        </div>
      </div>
    </div>
  );
}
