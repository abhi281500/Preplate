import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Utensils, Clock, Store, ArrowLeft } from 'lucide-react';

export const PublicMenuPortal: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center text-sm font-semibold text-stone-600 hover:text-stone-900">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Preplate
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
              <Utensils className="w-4 h-4" />
            </div>
            <span className="font-bold text-stone-900 capitalize">{slug?.replace('-', ' ')}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 capitalize">
            {slug?.replace('-', ' ')}
          </h1>
          <p className="mt-2 text-stone-600 text-sm max-w-md mx-auto">
            Welcome to the pre-arrival ordering portal for <strong className="text-stone-800">{slug}</strong>.
          </p>
          <div className="mt-6 inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Phase 1 Foundation Connected — Phase 2 Menu Engine Implements Full Interactive Menu</span>
          </div>
        </div>
      </div>
    </div>
  );
};
