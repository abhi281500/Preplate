import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Utensils, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../shared/api';
import { useAuth } from '../../shared/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isExpired = searchParams.get('expired') === '1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user, restaurant } = res.data.data;
      login(token, user, restaurant);

      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin/super');
      } else {
        navigate('/admin/restaurant');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCreds = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Utensils className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-stone-900">Preplate</span>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-stone-900">
          Sign in to your dashboard
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          Or{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-500">
            register a new restaurant account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-stone-200 sm:rounded-2xl sm:px-10">
          {isExpired && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>Your session has expired. Please log in again.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-stone-700">Email Address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                  placeholder="name@restaurant.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Quick Demo Logins for Pair Programming & Testing */}
          <div className="mt-6 pt-6 border-t border-stone-200">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider text-center mb-3">
              Quick Test Credentials
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fillDemoCreds('owner@highwaydhaba.com', 'DhabaOwner@123')}
                className="w-full text-left text-xs bg-stone-50 hover:bg-stone-100 p-2.5 rounded-lg border border-stone-200 text-stone-700 transition"
              >
                <span className="font-bold text-stone-900 block">Restaurant Owner (Highway Dhaba)</span>
                <span>owner@highwaydhaba.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCreds('superadmin@preplate.io', 'Admin@Preplate2026!')}
                className="w-full text-left text-xs bg-stone-50 hover:bg-stone-100 p-2.5 rounded-lg border border-stone-200 text-stone-700 transition"
              >
                <span className="font-bold text-stone-900 block">Super Admin</span>
                <span>superadmin@preplate.io</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
