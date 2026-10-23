import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, LogOut, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../shared/AuthContext';

export const RestaurantDashboard: React.FC = () => {
  const { user, restaurant, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-stone-900 leading-tight">
                {restaurant?.name || 'Restaurant Workspace'}
              </h1>
              <p className="text-xs text-stone-500">Tenant ID: {restaurant?.tenantId || user?.tenantId}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-stone-800">{user?.name}</p>
              <p className="text-[10px] text-stone-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Phase 1 Security & Tenant Isolation Active</h2>
              <p className="text-xs text-stone-600">Authenticated as {user?.email} with strict server-side scoping.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <span className="text-xs font-bold text-stone-500 uppercase">Restaurant Slug</span>
              <p className="text-base font-extrabold text-stone-900 mt-1">/r/{restaurant?.slug || 'pending'}</p>
            </div>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <span className="text-xs font-bold text-stone-500 uppercase">Tenant Security Boundary</span>
              <p className="text-base font-extrabold text-emerald-600 mt-1">Scoped & Verified</p>
            </div>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <span className="text-xs font-bold text-stone-500 uppercase">Upcoming Phase</span>
              <p className="text-base font-extrabold text-brand-600 mt-1">Phase 2: Menu CRUD</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
