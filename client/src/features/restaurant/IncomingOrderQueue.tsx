import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  BellOff,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Utensils,
  Phone,
  User,
  Loader2,
  Sparkles,
  ChevronRight,
  Flame,
  ArrowRight
} from 'lucide-react';
import api from '../../shared/api';

interface OrderItemSnapshot {
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  subtotal: number;
}

interface IncomingOrder {
  _id: string;
  orderReference: string;
  customer: {
    name: string;
    phone: string;
    specialInstructions?: string;
  };
  items: OrderItemSnapshot[];
  pricing: {
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
  };
  scheduling: {
    expectedArrivalTime: string;
  };
  status: string;
  createdAt: string;
}

// Web Audio API synthetic bell synthesizer for incoming order alerts
function playChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    // Two-tone bell chime
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
  } catch (e) {
    console.error('Audio chime error:', e);
  }
}

export const IncomingOrderQueue: React.FC<{ onRefreshNeeded?: () => void }> = ({ onRefreshNeeded }) => {
  const [orders, setOrders] = useState<IncomingOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject Modal State
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Custom Prep Time Modal State
  const [customPrepOrderId, setCustomPrepOrderId] = useState<string | null>(null);
  const [customPrepMinutes, setCustomPrepMinutes] = useState<string>('30');

  const prevPendingCountRef = useRef<number>(0);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/restaurant/orders?statusFilter=PENDING');
      const pendingOrders = res.data.data.orders;
      setOrders(pendingOrders);

      // Play audio chime if new orders arrived
      if (pendingOrders.length > prevPendingCountRef.current && prevPendingCountRef.current !== 0) {
        if (isAudioEnabled) playChime();
      }
      prevPendingCountRef.current = pendingOrders.length;
    } catch (err: any) {
      console.error('Failed to fetch pending orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000); // Poll every 4 seconds
    return () => clearInterval(interval);
  }, [isAudioEnabled]);

  const handleAccept = async (orderId: string, prepDurationMinutes: number) => {
    setActionLoading(orderId);
    try {
      await api.post(`/restaurant/orders/${orderId}/accept`, {
        prepDurationMinutes
      });
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
      prevPendingCountRef.current = Math.max(0, prevPendingCountRef.current - 1);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectOrderId || !rejectReason.trim()) return;

    setActionLoading(rejectOrderId);
    try {
      await api.post(`/restaurant/orders/${rejectOrderId}/reject`, {
        reason: rejectReason.trim()
      });
      setOrders((prev) => prev.filter((o) => o._id !== rejectOrderId));
      prevPendingCountRef.current = Math.max(0, prevPendingCountRef.current - 1);
      setRejectOrderId(null);
      setRejectReason('');
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject order');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm font-semibold text-stone-600">Connecting to live order queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Header & Sound Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center relative">
            <Bell className="w-5 h-5" />
            {orders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-600 text-white font-extrabold text-[10px] flex items-center justify-center animate-pulse">
                {orders.length}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Incoming Order Requests ({orders.length} Pending)
            </h2>
            <p className="text-xs text-stone-500">
              Review guest ETA, confirm kitchen availability, and accept with preparation timing.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              isAudioEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-stone-100 text-stone-500 border-stone-200'
            }`}
          >
            {isAudioEnabled ? (
              <>
                <Bell className="w-3.5 h-3.5 text-emerald-600" />
                <span>Audio Alert Active</span>
              </>
            ) : (
              <>
                <BellOff className="w-3.5 h-3.5" />
                <span>Audio Muted</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-stone-50 text-stone-300 mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-stone-900">Incoming Queue is Clear</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
            No pending order requests awaiting confirmation. When a customer submits an order, it will appear here immediately with an audio chime.
          </p>
        </div>
      ) : (
        /* Orders Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {orders.map((order) => {
            const arrivalDate = new Date(order.scheduling.expectedArrivalTime);
            const minutesUntilArrival = Math.round(
              (arrivalDate.getTime() - Date.now()) / (1000 * 60)
            );
            const formattedETA = arrivalDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={order._id}
                className="bg-white rounded-3xl border-2 border-brand-200 p-5 sm:p-6 shadow-md shadow-brand-500/5 flex flex-col justify-between space-y-4 animate-slideUp"
              >
                <div>
                  {/* Top Bar: Reference & Arrival Timing */}
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                      <span className="text-xs font-bold text-brand-600 tracking-wider uppercase block">
                        Pending Confirmation
                      </span>
                      <span className="text-lg font-extrabold text-stone-900">
                        #{order.orderReference}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                        <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        ETA {formattedETA} ({minutesUntilArrival}m left)
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="py-2.5 flex items-center justify-between text-xs text-stone-600">
                    <span className="font-bold text-stone-800 flex items-center">
                      <User className="w-3.5 h-3.5 mr-1 text-stone-400" />
                      {order.customer.name}
                    </span>
                    <a
                      href={`tel:${order.customer.phone}`}
                      className="text-brand-600 hover:underline flex items-center font-semibold"
                    >
                      <Phone className="w-3.5 h-3.5 mr-1" />
                      {order.customer.phone}
                    </a>
                  </div>

                  {/* Items List Snapshot */}
                  <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 divide-y divide-stone-100 text-xs my-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between">
                        <span className="font-bold text-stone-800">
                          {item.quantity}x {item.nameSnapshot}
                        </span>
                        <span className="font-semibold text-stone-600">₹{item.subtotal}</span>
                      </div>
                    ))}
                    <div className="pt-2 flex justify-between font-extrabold text-stone-900 text-sm">
                      <span>Total Amount:</span>
                      <span className="text-brand-600">₹{order.pricing.totalAmount}</span>
                    </div>
                  </div>

                  {/* Special Cooking Notes */}
                  {order.customer.specialInstructions && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
                      <strong className="block text-[10px] uppercase tracking-wider text-amber-800">
                        Customer Special Instructions:
                      </strong>
                      <p className="italic mt-0.5">&ldquo;{order.customer.specialInstructions}&rdquo;</p>
                    </div>
                  )}
                </div>

                {/* Accept / Reject Action Buttons */}
                <div className="pt-3 border-t border-stone-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase tracking-wider">
                    <span>Accept & Set Prep Duration:</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {[15, 25, 35].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        disabled={actionLoading === order._id}
                        onClick={() => handleAccept(order._id, mins)}
                        className="py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50"
                      >
                        +{mins}m
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={actionLoading === order._id}
                      onClick={() => setCustomPrepOrderId(order._id)}
                      className="py-2.5 rounded-xl font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition"
                    >
                      Custom
                    </button>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      disabled={actionLoading === order._id}
                      onClick={() => setRejectOrderId(order._id)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition"
                    >
                      Reject Order Request...
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectOrderId && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Decline Order Request</h3>
            <p className="text-xs text-stone-500 mb-4">
              Please specify a clear reason. The customer will see this message immediately on their tracking screen.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-2">
                {[
                  'Kitchen is at maximum capacity during peak service',
                  'One or more ordered items are currently sold out',
                  'Cannot prepare food within requested arrival time',
                  'Restaurant is temporarily pausing new orders'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition ${
                      rejectReason === preset
                        ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Or Custom Reason:
                </label>
                <textarea
                  rows={2}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this order cannot be accepted..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectOrderId(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectReason.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Prep Time Modal */}
      {customPrepOrderId && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">Custom Preparation Time</h3>
            <p className="text-xs text-stone-500 mb-4">
              Set estimated preparation duration in minutes for this order.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Preparation Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={customPrepMinutes}
                  onChange={(e) => setCustomPrepMinutes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCustomPrepOrderId(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAccept(customPrepOrderId, Number(customPrepMinutes) || 20);
                    setCustomPrepOrderId(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
                >
                  Accept Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
