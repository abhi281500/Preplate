import React, { useState, useEffect } from 'react';
import { Store, Clock, Phone, MessageSquare, MapPin, CheckCircle2, AlertCircle, Loader2, Save } from 'lucide-react';
import api from '../../shared/api';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export const RestaurantProfileSettings: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/restaurant/profile');
        setProfile(res.data.data);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOperatingHoursChange = (dayIndex: number, field: string, value: any) => {
    setProfile((prev: any) => {
      const updatedHours = [...prev.operatingHours];
      const targetIndex = updatedHours.findIndex((h) => h.dayOfWeek === dayIndex);
      if (targetIndex >= 0) {
        updatedHours[targetIndex] = { ...updatedHours[targetIndex], [field]: value };
      }
      return { ...prev, operatingHours: updatedHours };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put('/restaurant/profile', {
        name: profile.name,
        tagline: profile.tagline,
        contactPhone: profile.contactPhone,
        whatsappNumber: profile.whatsappNumber,
        address: profile.address,
        operatingHours: profile.operatingHours,
        settings: profile.settings
      });
      setProfile(res.data.data);
      triggerToast('Restaurant settings and hours successfully saved!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm font-semibold text-stone-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-stone-900">Restaurant Details & Branding</h2>
            <p className="text-xs text-stone-500">Public profile details displayed on your pre-arrival ordering portal.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase">Restaurant Name</label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase">Public URL Slug</label>
              <input
                type="text"
                disabled
                value={`/r/${profile.slug}`}
                className="mt-1 w-full px-3 py-2 border border-stone-200 bg-stone-50 text-stone-500 rounded-xl text-sm cursor-not-allowed"
              />
              <p className="text-[10px] text-stone-400 mt-1">Slug is permanently bound to your tenant identity.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase">Tagline / Culinary Specialty</label>
            <input
              type="text"
              value={profile.tagline || ''}
              onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
              placeholder="e.g. Authentic Punjabi taste on the highway, hot and ready upon arrival"
              className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase">Contact Phone</label>
              <input
                type="tel"
                required
                value={profile.contactPhone}
                onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase">WhatsApp Order Number</label>
              <input
                type="tel"
                required
                value={profile.whatsappNumber}
                onChange={(e) => setProfile({ ...profile, whatsappNumber: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Operating & Arrival Buffer Settings */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-stone-900">Pre-Arrival Timing & Readiness Coordination</h2>
            <p className="text-xs text-stone-500">Configure how early customers can submit requests and payment rules.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase">
                Order Prep Buffer (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={180}
                required
                value={profile.settings?.orderBufferMinutes ?? 20}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    settings: { ...profile.settings, orderBufferMinutes: Number(e.target.value) }
                  })
                }
                className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
              />
              <p className="text-[10px] text-stone-400 mt-1">Minimum advance time required for customer ETA.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase">
                Auto-Reject Timeout (Mins)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                required
                value={profile.settings?.autoRejectTimeoutMinutes ?? 15}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    settings: { ...profile.settings, autoRejectTimeoutMinutes: Number(e.target.value) }
                  })
                }
                className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
              />
              <p className="text-[10px] text-stone-400 mt-1">Time before unconfirmed requests expire automatically.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase">
                Minimum Order Amount (₹)
              </label>
              <input
                type="number"
                min={0}
                value={profile.settings?.minimumOrderAmount ?? 0}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    settings: { ...profile.settings, minimumOrderAmount: Number(e.target.value) }
                  })
                }
                className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
              />
              <p className="text-[10px] text-stone-400 mt-1">Minimum cart total to submit an order.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase">
              UPI VPA / ID for Counter Display (Optional)
            </label>
            <input
              type="text"
              value={profile.settings?.upiId || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  settings: { ...profile.settings, upiId: e.target.value }
                })
              }
              placeholder="e.g. restaurantname@okhdfcbank"
              className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        {/* Operating Hours Table */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-stone-900">Weekly Operating Hours</h2>
            <p className="text-xs text-stone-500">Orders will only be accepted within configured open hours.</p>
          </div>

          <div className="divide-y divide-stone-100">
            {DAYS_OF_WEEK.map((dayName, idx) => {
              const schedule = profile.operatingHours?.find((h: any) => h.dayOfWeek === idx) || {
                dayOfWeek: idx,
                openTime: '10:00',
                closeTime: '22:00',
                isOpen: true
              };

              return (
                <div key={dayName} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="w-28 font-bold text-stone-800">{dayName}</div>

                  <div className="flex items-center space-x-3">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={schedule.isOpen}
                        onChange={(e) => handleOperatingHoursChange(idx, 'isOpen', e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                      />
                      <span className="ml-2 font-medium text-stone-700">
                        {schedule.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </label>

                    {schedule.isOpen ? (
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="time"
                          value={schedule.openTime}
                          onChange={(e) => handleOperatingHoursChange(idx, 'openTime', e.target.value)}
                          className="px-2 py-1 border border-stone-300 rounded-lg text-xs"
                        />
                        <span className="text-stone-400">to</span>
                        <input
                          type="time"
                          value={schedule.closeTime}
                          onChange={(e) => handleOperatingHoursChange(idx, 'closeTime', e.target.value)}
                          className="px-2 py-1 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>
                    ) : (
                      <span className="text-stone-400 italic">Not accepting orders</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center space-x-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 px-6 py-2.5 rounded-xl shadow-md shadow-brand-600/30 transition disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
