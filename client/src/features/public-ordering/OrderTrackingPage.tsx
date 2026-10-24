import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Utensils,
  Clock,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  Phone,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import api from '../../shared/api';

interface OrderItemSnapshot {
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  subtotal: number;
}

interface OrderData {
  orderReference: string;
  status:
    | 'PENDING_CONFIRMATION'
    | 'ACCEPTED'
    | 'PREPARING'
    | 'READY'
    | 'SERVED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'EXPIRED';
  rejectionReason?: string;
  cancellationReason?: string;
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
    estimatedReadyTime?: string;
    actualReadyTime?: string;
    acceptedAt?: string;
    servedAt?: string;
  };
  payment: {
    method: string;
    status: string;
  };
  restaurant: {
    name: string;
    whatsappNumber: string;
  };
  whatsAppLink: string;
  createdAt: string;
}

const STATUS_STEPS = [
  { key: 'PENDING_CONFIRMATION', label: 'Requested', desc: 'Awaiting restaurant review' },
  { key: 'ACCEPTED', label: 'Accepted', desc: 'Kitchen confirmed preparation' },
  { key: 'PREPARING', label: 'Preparing', desc: 'Chef is cooking your order' },
  { key: 'READY', label: 'Ready', desc: 'Packed / plated for your arrival' },
  { key: 'SERVED', label: 'Served', desc: 'Order completed' }
];

export const OrderTrackingPage: React.FC = () => {
  const { slug, orderReference } = useParams<{ slug: string; orderReference: string }>();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/public/restaurants/${slug}/orders/${orderReference}`);
      setOrder(res.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load order tracking details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Poll status every 5 seconds until terminal status reached
    const interval = setInterval(() => {
      if (order && ['SERVED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(order.status)) {
        clearInterval(interval);
        return;
      }
      fetchOrder();
    }, 5000);

    return () => clearInterval(interval);
  }, [slug, orderReference, order?.status]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order request?')) return;
    setIsCancelling(true);
    try {
      await api.post(`/public/restaurants/${slug}/orders/${orderReference}/cancel`, {
        reason: 'Cancelled by customer via tracking page'
      });
      fetchOrder();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600 mb-3" />
        <p className="text-sm font-semibold text-stone-600">Connecting to live order tracker...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900">Order Not Found</h1>
        <p className="text-stone-600 mt-2 text-sm max-w-md">{error || 'Could not locate this order reference.'}</p>
        <Link
          to={`/r/${slug}`}
          className="mt-6 inline-flex items-center text-sm font-bold text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Restaurant Menu
        </Link>
      </div>
    );
  }

  const isTerminal = ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(order.status);
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);

  const formattedETA = new Date(order.scheduling.expectedArrivalTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const formattedReadyTime = order.scheduling.estimatedReadyTime
    ? new Date(order.scheduling.estimatedReadyTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  return (
    <div className="min-h-screen bg-stone-50 pb-20 selection:bg-brand-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to={`/r/${slug}`}
            className="inline-flex items-center text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Menu
          </Link>
          <span className="text-xs font-bold text-stone-900">{order.restaurant.name}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        {/* Main Status Hero Card */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-bold mb-4">
            <span>Order #{order.orderReference}</span>
          </div>

          {/* Dynamic Status Header */}
          {order.status === 'PENDING_CONFIRMATION' && (
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
                Order Request Submitted
              </h1>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Awaiting confirmation from <strong className="text-stone-800">{order.restaurant.name}</strong>. The restaurant will review kitchen capacity and set estimated preparation timing.
              </p>
            </div>
          )}

          {order.status === 'ACCEPTED' && (
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
                Order Accepted!
              </h1>
              <p className="text-xs text-stone-600 max-w-md mx-auto">
                The restaurant accepted your order.
                {formattedReadyTime && (
                  <span className="block font-bold text-blue-700 text-sm mt-1">
                    Estimated Ready Time: {formattedReadyTime}
                  </span>
                )}
              </p>
            </div>
          )}

          {order.status === 'PREPARING' && (
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center animate-spin">
                <Utensils className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
                Chef is Preparing Your Food
              </h1>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Your dishes are actively being prepared in the kitchen to match your arrival at {formattedETA}.
              </p>
            </div>
          )}

          {order.status === 'READY' && (
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-emerald-700 tracking-tight">
                Order is Hot & Ready!
              </h1>
              <p className="text-xs text-stone-600 max-w-md mx-auto">
                Please proceed to the restaurant counter or show reference <strong>#{order.orderReference}</strong> to staff.
              </p>
            </div>
          )}

          {order.status === 'SERVED' && (
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
                Order Completed
              </h1>
              <p className="text-xs text-stone-500">Thank you for ordering with Preplate. Enjoy your meal!</p>
            </div>
          )}

          {order.status === 'REJECTED' && (
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <XCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
                Order Request Declined
              </h1>
              <p className="text-xs text-rose-700 max-w-md mx-auto">
                Reason: {order.rejectionReason || 'Kitchen is at maximum capacity or items are unavailable.'}
              </p>
            </div>
          )}

          {order.status === 'CANCELLED' && (
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 text-stone-500 mx-auto flex items-center justify-center">
                <XCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
                Order Cancelled
              </h1>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                {order.cancellationReason || 'This order was cancelled.'}
              </p>
            </div>
          )}

          {/* Stepper Progress Bar (if not in terminal rejected/cancelled) */}
          {!isTerminal && (
            <div className="mt-8 pt-8 border-t border-stone-100">
              <div className="flex items-center justify-between relative">
                {STATUS_STEPS.map((step, idx) => {
                  const isPassed = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;

                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center relative z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                          isCurrent
                            ? 'bg-brand-600 text-white ring-4 ring-brand-100 shadow-md'
                            : isPassed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-200 text-stone-500'
                        }`}
                      >
                        {isPassed && !isCurrent ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-bold mt-2 text-center ${
                          isCurrent ? 'text-brand-600 font-extrabold' : isPassed ? 'text-stone-900' : 'text-stone-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action: WhatsApp Direct Communication */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-600/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Notify Restaurant on WhatsApp</h3>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                Send your order reference & ETA directly to the restaurant staff. Tap below and hit &ldquo;Send&rdquo; in WhatsApp.
              </p>
            </div>
          </div>

          <a
            href={order.whatsAppLink}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-5 py-3 rounded-xl shadow-md shadow-emerald-600/25 transition active:scale-95 flex-shrink-0"
          >
            <span>Open WhatsApp Summary</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Order Details & Summary Card */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">Order Summary</h3>
              <p className="text-xs text-stone-500">Expected Arrival: <strong className="text-stone-800">{formattedETA}</strong></p>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-500 block">Payment Method</span>
              <span className="text-xs font-bold text-stone-800">{order.payment.method.replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Immutable Items Snapshot */}
          <div className="divide-y divide-stone-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-900">{item.quantity}x {item.nameSnapshot}</span>
                  <span className="text-stone-400 block text-[11px]">₹{item.priceSnapshot} each</span>
                </div>
                <span className="font-bold text-stone-900">₹{item.subtotal}</span>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="p-4 bg-stone-50 rounded-2xl space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span className="font-bold text-stone-900">₹{order.pricing.subtotal}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>GST Taxes (5%)</span>
              <span className="font-bold text-stone-900">₹{order.pricing.taxAmount}</span>
            </div>
            <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-extrabold text-stone-900">
              <span>Total Payable</span>
              <span className="text-brand-600 text-base">₹{order.pricing.totalAmount}</span>
            </div>
          </div>

          {/* Special Instructions */}
          {order.customer.specialInstructions && (
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
              <span className="font-bold text-stone-700 block mb-0.5">Special Cooking / Table Instructions:</span>
              <p className="text-stone-600 italic">&ldquo;{order.customer.specialInstructions}&rdquo;</p>
            </div>
          )}

          {/* Cancellation Option (Only available before acceptance) */}
          {order.status === 'PENDING_CONFIRMATION' && (
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">Need to cancel before kitchen acceptance?</span>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelOrder}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Order Request'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
