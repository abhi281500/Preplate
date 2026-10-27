import React from 'react';
import { Link } from 'react-router-dom';
import { Utensils, Clock, MessageSquare, ShieldCheck, ArrowRight, Store, ChefHat, CheckCircle2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-stone-900">Preplate</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
                SaaS Platform
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-stone-700 hover:text-stone-900 px-3 py-2 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg shadow-sm shadow-brand-600/30 transition"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs sm:text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
              <span>Zero table-wait dining for modern restaurants & highway eateries</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold text-stone-900 tracking-tight max-w-4xl mx-auto leading-[1.15]">
              Fresh food ready <span className="text-brand-600 underline decoration-brand-200">the moment</span> your guests arrive.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
              Empower highway travelers, office diners, and campus students to order ahead with ETA coordination. Reduce dining wait times without aggregator commission cuts.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-base font-bold text-white bg-brand-600 hover:bg-brand-700 px-8 py-3.5 rounded-xl shadow-lg shadow-brand-600/25 transition"
              >
                <span>Onboard Your Restaurant</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/r/highway-dhaba"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-base font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 px-6 py-3.5 rounded-xl transition"
              >
                <Store className="w-5 h-5 text-stone-500" />
                <span>View Demo Restaurant</span>
              </Link>
            </div>

            {/* Feature Highlights Grid */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-orange-100 text-brand-600 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">ETA & Prep Synchronization</h3>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                  Guests choose expected arrival time. Kitchen confirms with realistic preparation buffers so meals are served fresh and hot.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">WhatsApp-Assisted Flow</h3>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                  Pre-formatted deep links let guests notify the restaurant instantly with itemized summaries and live tracking links.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                  <ChefHat className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">Touch-Friendly KDS & 86ing</h3>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                  Kitchen display designed for busy rushes. 1-click &ldquo;Sold Out&rdquo; toggles prevent overselling out-of-stock dishes immediately.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Pilot Showcase */}
        <section className="bg-stone-100 py-16 border-t border-b border-stone-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider mb-2">
                Simulated Sandbox
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900">Explore Demo Restaurant Environments</h2>
              <p className="mt-2 text-stone-600">Test the pre-arrival guest ordering flow directly with sample menus in safe practice environments.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  Demo
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      Highway Dhaba
                    </span>
                    <span className="text-xs text-stone-500 mr-12">Slug: highway-dhaba</span>
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 mt-3">Highway Dhaba Express</h3>
                  <p className="text-sm text-stone-600 mt-1">Authentic Punjabi cuisine on the Delhi-Jaipur highway.</p>
                  <div className="mt-4 flex items-center text-xs text-stone-500 space-x-4">
                    <span className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1" /> 20m Prep Buffer</span>
                    <span className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1" /> 25% Advance + Counter</span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <Link
                    to="/r/highway-dhaba"
                    className="text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center"
                  >
                    Open Demo Menu <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-stone-200 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  Demo
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                      Urban Cafe
                    </span>
                    <span className="text-xs text-stone-500 mr-12">Slug: urban-spice</span>
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 mt-3">Urban Spice Cafe</h3>
                  <p className="text-sm text-stone-600 mt-1">Artisanal coffees and healthy lunch bowls in Cyber Hub.</p>
                  <div className="mt-4 flex items-center text-xs text-stone-500 space-x-4">
                    <span className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1" /> 15m Prep Buffer</span>
                    <span className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1" /> Quick Pre-Order</span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <Link
                    to="/r/urban-spice"
                    className="text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center"
                  >
                    Open Demo Menu <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 space-y-4 sm:space-y-0">
          <p>© {new Date().getFullYear()} Preplate SaaS. Multi-tenant restaurant pre-arrival coordination platform.</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span className="text-stone-400">100% Refund on Restaurant Rejection</span>
            <span className="text-stone-300">|</span>
            <Link to="/login" className="hover:text-stone-900 font-medium">Restaurant Portal</Link>
            <span className="text-stone-300">|</span>
            <Link to="/register" className="hover:text-stone-900 font-medium">Onboard Restaurant</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
