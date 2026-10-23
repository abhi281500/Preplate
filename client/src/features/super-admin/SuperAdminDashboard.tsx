import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../shared/AuthContext';

export const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-stone-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Preplate SaaS Super Admin</h1>
              <p className="text-xs text-stone-400">Global SaaS Control Plane</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-stone-200">{user?.name}</p>
              <p className="text-[10px] text-stone-400">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center text-xs font-bold text-stone-300 bg-stone-800 hover:bg-stone-700 px-3 py-1.5 rounded-lg transition"
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
              <h2 className="text-lg font-bold text-stone-900">SaaS Platform Core Initialized</h2>
              <p className="text-xs text-stone-600">Global Super Admin authorization verified.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
