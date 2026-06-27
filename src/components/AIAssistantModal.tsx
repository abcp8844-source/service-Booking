import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { CATEGORIES, ServiceCategory } from '../data/categories';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: ServiceCategory) => void;
}

export default function AIAssistantModal({ isOpen, onClose, onSelectCategory }: AIAssistantModalProps) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'ai'|'user', content: string}[]>([
    { role: 'ai', content: t('hello_ai', 'Hello! I am your AI assistant. Tell me what service you need.') }
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
      // In a real app we'd call the backend:
      const res = await fetch('/api/ai/suggest-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery, lang: i18n.language })
      });
      
      const data = await res.json();
      
      if (data && data.categoryName) {
        // Try to match the category
        const matched = CATEGORIES.find(c => 
          c.name.toLowerCase() === data.categoryName.toLowerCase() ||
          t(`cat_${c.id}`).toLowerCase().includes(data.categoryName.toLowerCase()) ||
          c.description.toLowerCase().includes(data.categoryName.toLowerCase())
        );

        if (matched) {
          setMessages(prev => [...prev, { 
            role: 'ai', 
            content: `${data.reasoning}\n\nI suggest: **${t(`cat_${matched.id}`)}**.` 
          }]);
          
          setTimeout(() => {
            onSelectCategory(matched);
            onClose();
          }, 3000);
        } else {
          setMessages(prev => [...prev, { 
            role: 'ai', 
            content: `I think you need "${data.categoryName}", but I couldn't find an exact match in our list.` 
          }]);
        }
      } else {
         setMessages(prev => [...prev, { 
            role: 'ai', 
            content: "I couldn't quite understand that. Could you try rephrasing?" 
          }]);
      }
    } catch (error) {
      console.error("AI error:", error);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: "Sorry, I'm having trouble connecting right now." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[500px] border border-gray-100">
        <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-4 flex items-center justify-between text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md shadow-inner">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">{t('ai_assistant', 'Gemini AI Assistant')}</h3>
              <p className="text-blue-50 text-xs font-medium">Find services in any language</p>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50/50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl p-3.5 text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-white border border-gray-100 shadow-sm text-gray-700 rounded-tl-sm'
              }`}>
                {msg.content.split('\n').map((line, j) => (
                  <p key={j} className={j > 0 ? 'mt-2' : ''}>
                    {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </p>
                ))}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('ask_ai', 'Ask AI...')}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="submit"
              disabled={!query.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
}
