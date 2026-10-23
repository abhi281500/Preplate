import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Utensils, Store, Phone, MessageSquare, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../shared/api';
import { useAuth } from '../../shared/AuthContext';

export const RegisterRestaurantPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    restaurantName: '',
    slug: '',
    contactPhone: '',
    whatsappNumber: '',
    ownerName: '',
    email: '',
    password: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleNameChange = (name: string) => {
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData((prev) => ({
      ...prev,
      restaurantName: name,
      slug: prev.slug === '' || prev.slug === prev.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-') ? generatedSlug : prev.slug
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/register-restaurant', formData);
      const { token, user, restaurant } = res.data.data;
      login(token, user, restaurant);
      navigate('/admin/restaurant');
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.map((e: any) => `${e.field}: ${e.message}`).join(', '));
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please check inputs.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <Link to="/" className="flex items-center justify-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Utensils className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-stone-900">Preplate</span>
        </Link>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-stone-900">
          Onboard Your Restaurant
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-500">
            Sign in to existing account
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-stone-200 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">Restaurant Name</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Store className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.restaurantName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                    placeholder="Grand Highway Dhaba"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">URL Slug</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="block w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                    placeholder="grand-highway-dhaba"
                  />
                </div>
                <p className="mt-1 text-xs text-stone-500">Menu URL: /r/{formData.slug || 'your-slug'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">Contact Phone</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="block w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                    placeholder="+919876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">WhatsApp Number</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    className="block w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                    placeholder="+919876543210"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <h3 className="text-sm font-bold text-stone-800 mb-3">Owner Account Details</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">Owner Full Name</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="block w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                      placeholder="Vikramaditya Rao"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">Email Address</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="block w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                      placeholder="vikram@granddhaba.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">Password</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="block w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering Restaurant...
                  </span>
                ) : (
                  'Complete Registration & Launch'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
