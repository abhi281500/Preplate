import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store,
  LogOut,
  UtensilsCrossed,
  Settings,
  ExternalLink,
  ChefHat,
  Bell,
  FileText,
  Clock
} from 'lucide-react';
import { useAuth } from '../../shared/AuthContext';
import { IncomingOrderQueue } from './IncomingOrderQueue';
import { KitchenDisplaySystem } from '../kitchen/KitchenDisplaySystem';
import { MenuManager } from './MenuManager';
import { OrderHistoryAndReports } from './OrderHistoryAndReports';
import { RestaurantProfileSettings } from './RestaurantProfileSettings';
import api from '../../shared/api';

export const RestaurantDashboard: React.FC = () => {
  const { user, restaurant, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'queue' | 'kds' | 'menu' | 'history' | 'settings'>('queue');
  const [pendingCount, setPendingCount] = useState<number>(0);

  const fetchQueueSummary = async () => {
    try {
      const res = await api.get('/restaurant/orders?statusFilter=PENDING');
      setPendingCount(res.data.data.queueSummary?.pendingCount || 0);
    } catch (e) {
      // Quiet fail on background poll
    }
  };

  useEffect(() => {
    fetchQueueSummary();
    const interval = setInterval(fetchQueueSummary, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-stone-50 selection:bg-brand-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-brand-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-stone-900 leading-tight">
                  {restaurant?.name || 'Restaurant Workspace'}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Active Pilot
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Tenant: {restaurant?.tenantId || user?.tenantId}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {restaurant?.slug && (
              <Link
                to={`/r/${restaurant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl border border-brand-200 transition"
              >
                <span>Customer Storefront</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Link>
            )}

            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-stone-800">{user?.name}</p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">{user?.role?.replace('_', ' ')}</p>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-stone-200 pb-3 overflow-x-auto scrollbar-none">
          {/* Tab 1: Live Queue */}
          <button
            onClick={() => setActiveTab('queue')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition relative ${
              activeTab === 'queue'
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Incoming Order Queue</span>
            {pendingCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'queue' ? 'bg-white text-brand-700' : 'bg-brand-600 text-white animate-pulse'
                }`}
              >
                {pendingCount}
              </span>
            )}
          </button>

          {/* Tab 2: Kitchen Display System */}
          <button
            onClick={() => setActiveTab('kds')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'kds'
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Kitchen Display (KDS)</span>
          </button>

          {/* Tab 3: Menu & 86ing */}
          <button
            onClick={() => setActiveTab('menu')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'menu'
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Menu & Stock Availability (86ing)</span>
          </button>

          {/* Tab 4: History & Reports */}
          <button
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'history'
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Order History & Metrics</span>
          </button>

          {/* Tab 5: Settings */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'settings'
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings & Operating Hours</span>
          </button>
        </div>

        {/* Tab Content Rendering */}
        {activeTab === 'queue' && <IncomingOrderQueue onRefreshNeeded={fetchQueueSummary} />}
        {activeTab === 'kds' && <KitchenDisplaySystem />}
        {activeTab === 'menu' && <MenuManager />}
        {activeTab === 'history' && <OrderHistoryAndReports />}
        {activeTab === 'settings' && <RestaurantProfileSettings />}
      </main>
    </div>
  );
};
