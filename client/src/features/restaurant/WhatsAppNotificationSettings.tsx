import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Send,
  Zap,
  Info,
  Clock,
  Smartphone,
  ShieldCheck,
  Radio
} from 'lucide-react';
import api from '../../shared/api';

interface NotificationLogItem {
  _id: string;
  orderReference: string;
  recipientPhone: string;
  channel: 'WHATSAPP_CLICK_TO_CHAT' | 'WHATSAPP_CLOUD_API';
  purpose: 'ORDER_REQUEST_CREATED' | 'ORDER_ACCEPTED' | 'ORDER_REJECTED' | 'ORDER_READY';
  deliveryState: 'PREFILLED_LINK_GENERATED' | 'DISPATCHED' | 'DELIVERED' | 'READ' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
}

interface NotificationSummary {
  totalLogged: number;
  clickToChatCount: number;
  cloudApiCount: number;
}

interface SettingsData {
  whatsappNumber: string;
  activeChannelMode: 'WHATSAPP_CLICK_TO_CHAT' | 'WHATSAPP_CLOUD_API';
  isCloudApiConfigured: boolean;
  channelFeatures: {
    clickToChat: {
      available: boolean;
      status: string;
      description: string;
    };
    cloudApi: {
      available: boolean;
      status: string;
      description: string;
    };
  };
}

export const WhatsAppNotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [logs, setLogs] = useState<NotificationLogItem[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [activeTemplateTab, setActiveTemplateTab] = useState<'request' | 'accepted' | 'ready'>('request');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, logsRes] = await Promise.all([
        api.get('/restaurant/notifications/settings'),
        api.get('/restaurant/notifications')
      ]);

      if (settingsRes.data.success) {
        setSettings(settingsRes.data.data);
        setPhoneInput(settingsRes.data.data.whatsappNumber || '');
      }

      if (logsRes.data.success) {
        setLogs(logsRes.data.data.logs || []);
        setSummary(logsRes.data.data.summary || null);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to fetch WhatsApp notification settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.put('/restaurant/notifications/settings', {
        whatsappNumber: phoneInput
      });

      if (res.data.success) {
        setSuccessMsg('WhatsApp notification number saved successfully.');
        fetchData();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update WhatsApp number');
    } finally {
      setSaving(false);
    }
  };

  const getCleanTestLink = () => {
    const cleaned = phoneInput.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    const testText = encodeURIComponent(
      '👋 Hello from Preplate! Your WhatsApp notification configuration is active.'
    );
    return `https://wa.me/${phoneWithCountry}?text=${testText}`;
  };

  const formatBadge = (state: string) => {
    switch (state) {
      case 'READ':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'DISPATCHED':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'PREFILLED_LINK_GENERATED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'FAILED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const formatPurpose = (purpose: string) => {
    switch (purpose) {
      case 'ORDER_REQUEST_CREATED':
        return 'Order Request Placed';
      case 'ORDER_ACCEPTED':
        return 'Order Accepted Confirmation';
      case 'ORDER_REJECTED':
        return 'Order Rejected Notice';
      case 'ORDER_READY':
        return 'Food Ready for Pickup/Table';
      default:
        return purpose;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm font-semibold text-stone-600">Loading WhatsApp configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header and Architecture Overview Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">WhatsApp Notification Hub</h2>
              <p className="text-xs text-stone-500">
                Pre-arrival communication architecture & audit logs for customer coordination.
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center space-x-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3.5 py-2 rounded-xl transition self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* Dual Mode Architecture Explainer */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mode 1: Click-to-WhatsApp (Active Pilot Default) */}
          <div className="relative rounded-xl border-2 border-emerald-500 bg-emerald-50/30 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  Mode 1: Click-to-WhatsApp (Active Default)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                Zero Setup Barrier
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Generates instant pre-filled WhatsApp deep links (<code className="text-[11px] bg-white px-1 py-0.5 rounded border border-emerald-200">wa.me</code>) containing exact order references, items, guest arrival time, and tracking link.
            </p>
            <div className="text-[11px] text-emerald-900 bg-emerald-100/60 rounded-lg p-2.5 space-y-1">
              <div className="font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Zero Meta API verification delays & zero per-conversation costs.</span>
              </div>
              <div className="font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Works immediately across mobile web browsers and desktop WhatsApp Web.</span>
              </div>
            </div>
          </div>

          {/* Mode 2: Meta WhatsApp Cloud API */}
          <div className="relative rounded-xl border border-stone-200 bg-stone-50/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-stone-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Mode 2: Meta Cloud API (Scale Tier)
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  settings?.isCloudApiConfigured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                {settings?.isCloudApiConfigured ? 'Active & Verified' : 'Post-Pilot Option'}
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Direct automated server-to-server messaging via Meta Graph API v20.0 with automated two-way webhooks tracking real-time delivery status (<code className="text-[11px] bg-stone-200 px-1 py-0.5 rounded">SENT</code> → <code className="text-[11px] bg-stone-200 px-1 py-0.5 rounded">DELIVERED</code> → <code className="text-[11px] bg-stone-200 px-1 py-0.5 rounded">READ</code>).
            </p>
            <div className="text-[11px] text-stone-500 bg-stone-200/50 rounded-lg p-2.5">
              <span>Requires verified Meta Business Manager, phone number registration, and approved template namespace. Available for franchise tier.</span>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Number Configuration & Diagnostic Link */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-stone-900">Restaurant WhatsApp Dispatch Number</h3>
          <p className="text-xs text-stone-500">
            Incoming order requests from customers are sent directly to this WhatsApp contact.
          </p>
        </div>

        {successMsg && (
          <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSavePhone} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-stone-700">
              WhatsApp Phone Number (with Country Code)
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+919876543210 or 9876543210"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
              />
            </div>
            <p className="text-[11px] text-stone-400">
              For India numbers, 10-digit numbers automatically map to +91 country prefix.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-sm transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save WhatsApp Number'}</span>
            </button>

            {phoneInput.trim().length >= 10 && (
              <a
                href={getCleanTestLink()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs py-2.5 px-4 rounded-xl whitespace-nowrap transition"
                title="Test sending a WhatsApp message to verify number"
              >
                <span>Test Link</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
          </div>
        </form>
      </div>

      {/* Standardized Message Templates Preview */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-stone-900">Standardized Communication Message Formats</h3>
          <p className="text-xs text-stone-500">
            Preplate formats every notification with immutable order references and verifiable timestamps.
          </p>
        </div>

        {/* Template Tabs */}
        <div className="flex items-center space-x-2 border-b border-stone-100 pb-2">
          <button
            onClick={() => setActiveTemplateTab('request')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTemplateTab === 'request'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            1. New Order Request (Customer → Restaurant)
          </button>
          <button
            onClick={() => setActiveTemplateTab('accepted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTemplateTab === 'accepted'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            2. Order Accepted (Restaurant → Customer)
          </button>
          <button
            onClick={() => setActiveTemplateTab('ready')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTemplateTab === 'ready'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            3. Order Ready (Kitchen → Customer)
          </button>
        </div>

        {/* WhatsApp Chat Bubble Mockup */}
        <div className="bg-stone-100 rounded-xl p-5 border border-stone-200">
          <div className="max-w-md bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 text-xs font-mono whitespace-pre-wrap leading-relaxed text-stone-800">
            {activeTemplateTab === 'request' && (
              <>
                🛎️ *NEW PREPLATE ORDER REQUEST*{"\n"}
                *Ref:* ORD-20261024-8841{"\n"}
                *Guest:* Rahul Sharma (+919876543210){"\n"}
                *Expected Arrival:* 01:30 PM (in 25 mins){"\n"}
                *Dining Mode:* DINE_IN (Table requested){"\n"}
                {"\n"}
                *Items Ordered:*{"\n"}
                - 2x Paneer Butter Masala (₹560.00){"\n"}
                - 4x Butter Naan (₹160.00){"\n"}
                - 1x Sweet Lassi (₹80.00){"\n"}
                {"\n"}
                *Subtotal:* ₹800.00{"\n"}
                *GST (5%):* ₹40.00{"\n"}
                *Grand Total:* ₹840.00 (PAY_AT_RESTAURANT){"\n"}
                {"\n"}
                🔗 *Open Live Kitchen Queue to Accept:*{"\n"}
                https://preplate.app/restaurant/orders?ref=ORD-20261024-8841
              </>
            )}

            {activeTemplateTab === 'accepted' && (
              <>
                ✅ *ORDER CONFIRMED & IN PREPARATION*{"\n"}
                {"\n"}
                Hello Rahul Sharma, your order *ORD-20261024-8841* has been accepted by Highway Dhaba Express!{"\n"}
                {"\n"}
                ⏱️ *Est. Ready Time:* 01:25 PM{"\n"}
                📍 *Arrival Address:* NH 44 Highway Express Mile 42{"\n"}
                {"\n"}
                Our kitchen will begin preparation so your meal is fresh and hot when you arrive.{"\n"}
                {"\n"}
                Track live status anytime:{"\n"}
                https://preplate.app/order/ORD-20261024-8841
              </>
            )}

            {activeTemplateTab === 'ready' && (
              <>
                🍲 *YOUR FOOD IS READY!*{"\n"}
                {"\n"}
                Hello Rahul Sharma, your order *ORD-20261024-8841* is freshly prepared and ready for you at Highway Dhaba Express!{"\n"}
                {"\n"}
                Please head to the counter or show this reference to your server.{"\n"}
                Enjoy your meal!
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notification Audit Log Table */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Notification Dispatch History & Audit Trail</h3>
            <p className="text-xs text-stone-500">
              Verifiable log of every WhatsApp link generated and cloud API dispatch attempt.
            </p>
          </div>

          {summary && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-stone-100 font-bold text-stone-700">
                Total: {summary.totalLogged}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 font-bold text-purple-700 border border-purple-200">
                Click-to-Chat: {summary.clickToChatCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 font-bold text-emerald-700 border border-emerald-200">
                Cloud API: {summary.cloudApiCount}
              </span>
            </div>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl space-y-2">
            <MessageSquare className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-bold text-stone-600">No notification logs recorded yet</p>
            <p className="text-[11px] text-stone-400">
              When orders are placed, accepted, or marked ready, dispatch logs will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Delivery State</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {logs.map((item) => (
                  <tr key={item._id} className="hover:bg-stone-50 transition">
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {item.orderReference}
                    </td>
                    <td className="py-3 px-4 text-stone-600 font-mono">
                      {item.recipientPhone || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-stone-700">
                        {item.channel === 'WHATSAPP_CLICK_TO_CHAT'
                          ? 'Click-to-Chat (wa.me)'
                          : 'Meta Cloud API'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      {formatPurpose(item.purpose)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${formatBadge(
                          item.deliveryState
                        )}`}
                      >
                        {item.deliveryState.replace(/_/g, ' ')}
                      </span>
                      {item.errorMessage && (
                        <p className="text-[10px] text-rose-600 mt-0.5">{item.errorMessage}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-stone-500 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      <span className="block text-[10px] text-stone-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
