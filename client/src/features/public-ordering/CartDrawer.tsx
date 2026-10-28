import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Clock,
  User,
  Phone,
  FileText,
  CreditCard,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useCart } from './CartContext';
import api from '../../shared/api';

interface CartDrawerProps {
  slug: string;
  orderBufferMinutes: number;
  minimumOrderAmount: number;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  slug,
  orderBufferMinutes,
  minimumOrderAmount
}) => {
  const navigate = useNavigate();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    taxAmount,
    totalAmount,
    totalCount,
    isDrawerOpen,
    setIsDrawerOpen
  } = useCart();

  // Arrival Time Selection
  const defaultBuffer = orderBufferMinutes || 20;
  const [selectedMinutesFromNow, setSelectedMinutesFromNow] = useState<number>(defaultBuffer + 10);
  const [customArrivalTime, setCustomArrivalTime] = useState<string>('');
  const [useCustomTime, setUseCustomTime] = useState<boolean>(false);

  // Customer Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PAY_AT_RESTAURANT' | 'UPI_ON_ARRIVAL'>('PAY_AT_RESTAURANT');

  // Customer Phone OTP State
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const advancePercent = 25;
  const requiredAdvance = Math.ceil((totalAmount * advancePercent) / 100);
  const remainingBalance = totalAmount - requiredAdvance;

  const handleSendOtp = async () => {
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number before requesting verification.');
      return;
    }
    setErrorMessage(null);
    setIsSendingOtp(true);
    setOtpNotice(null);
    try {
      const res = await api.post('/auth/otp/send', {
        phone: customerPhone.trim(),
        purpose: 'CUSTOMER_CHECKOUT'
      });
      setOtpChallengeId(res.data.data.challengeId);
      setIsOtpSent(true);
      if (res.data.data.testCode) {
        setOtpNotice(`Code sent! (Test Sandbox Code: ${res.data.data.testCode})`);
      } else {
        setOtpNotice('Verification code sent to your phone.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpChallengeId || otpCode.length !== 6) {
      setErrorMessage('Please enter the 6-digit code received on your phone.');
      return;
    }
    setErrorMessage(null);
    setIsVerifyingOtp(true);
    try {
      const res = await api.post('/auth/otp/verify', {
        challengeId: otpChallengeId,
        phone: customerPhone.trim(),
        code: otpCode.trim(),
        purpose: 'CUSTOMER_CHECKOUT'
      });
      setVerificationToken(res.data.data.verificationToken);
      setIsPhoneVerified(true);
      setOtpNotice('✓ Phone verified successfully');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (!isDrawerOpen) return null;

  // Calculate selected arrival Date
  const computedArrivalDate = useCustomTime && customArrivalTime
    ? new Date(customArrivalTime)
    : new Date(Date.now() + selectedMinutesFromNow * 60 * 1000);

  const formattedArrivalTime = computedArrivalDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    if (minimumOrderAmount > 0 && subtotal < minimumOrderAmount) {
      setErrorMessage(`Minimum order subtotal is ₹${minimumOrderAmount}. Current: ₹${subtotal}`);
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.post(`/public/restaurants/${slug}/orders`, {
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          specialInstructions: specialInstructions.trim() || undefined,
          verificationToken: verificationToken || undefined
        },
        items: items.map((i) => ({ menuItemId: i.id, quantity: i.quantity })),
        expectedArrivalTime: computedArrivalDate.toISOString(),
        paymentMethod
      });

      const { orderReference } = res.data.data;
      clearCart();
      setIsDrawerOpen(false);
      navigate(`/r/${slug}/order/${orderReference}`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit order request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-stone-900">Your Pre-Arrival Cart ({totalCount})</h2>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {items.length === 0 ? (
            <div className="py-16 text-center text-stone-400 space-y-3">
              <ShoppingBag className="w-12 h-12 mx-auto stroke-1" />
              <p className="text-sm font-semibold">Your cart is currently empty</p>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="text-xs font-bold text-brand-600 hover:underline"
              >
                Browse Restaurant Menu
              </button>
            </div>
          ) : (
            <>
              {/* Item List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Selected Dishes</h3>
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-white">
                  {items.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between text-sm">
                      <div className="flex-1 pr-3">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          ></span>
                          <span className="font-bold text-stone-900 leading-snug">{item.name}</span>
                        </div>
                        <span className="text-xs text-stone-500 block mt-0.5">₹{item.price} each</span>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1.5 bg-stone-100 rounded-lg p-1 border border-stone-200">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 rounded text-stone-600 hover:bg-white transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-bold text-xs text-stone-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 rounded text-stone-600 hover:bg-white transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="w-14 text-right font-bold text-stone-900 text-sm">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrival Time Selector */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-brand-600" />
                    <span>Expected Arrival Time</span>
                  </h3>
                  <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                    Min buffer: {defaultBuffer}m
                  </span>
                </div>

                <div className="p-3 bg-brand-50/50 border border-brand-100 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-600">Selected ETA:</span>
                    <span className="font-extrabold text-brand-800 text-sm">{formattedArrivalTime}</span>
                  </div>

                  {/* Quick relative buttons */}
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {[
                      { label: `+${defaultBuffer}m`, mins: defaultBuffer },
                      { label: '+35m', mins: Math.max(35, defaultBuffer) },
                      { label: '+50m', mins: Math.max(50, defaultBuffer) },
                      { label: '+1h 15m', mins: Math.max(75, defaultBuffer) }
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => {
                          setSelectedMinutesFromNow(btn.mins);
                          setUseCustomTime(false);
                        }}
                        className={`py-1.5 rounded-lg font-bold border transition ${
                          !useCustomTime && selectedMinutesFromNow === btn.mins
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Time Toggle */}
                  <div className="pt-2 border-t border-brand-100 flex items-center justify-between text-xs">
                    <label className="text-stone-600 cursor-pointer flex items-center space-x-1.5">
                      <input
                        type="checkbox"
                        checked={useCustomTime}
                        onChange={(e) => setUseCustomTime(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                      />
                      <span>Pick specific custom time</span>
                    </label>

                    {useCustomTime && (
                      <input
                        type="datetime-local"
                        value={customArrivalTime}
                        onChange={(e) => setCustomArrivalTime(e.target.value)}
                        className="text-xs px-2 py-1 bg-white border border-stone-300 rounded-lg"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Guest Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Diner Information</h3>
                <div className="space-y-2.5">
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your Full Name"
                      className="block w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative rounded-xl shadow-sm flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        disabled={isPhoneVerified}
                        value={customerPhone}
                        onChange={(e) => {
                          const numeric = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setCustomerPhone(numeric);
                          setIsPhoneVerified(false);
                          setIsOtpSent(false);
                          setVerificationToken(null);
                        }}
                        placeholder="10-digit Mobile (e.g. 9876543210)"
                        className="block w-full pl-9 pr-24 py-2 border border-stone-300 rounded-xl text-xs font-semibold focus:ring-brand-500 focus:border-brand-500 disabled:bg-stone-100 disabled:text-stone-500"
                      />
                      {!isPhoneVerified ? (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp || customerPhone.length !== 10}
                          className="absolute right-1.5 px-2.5 py-1 text-[11px] font-bold bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg disabled:opacity-40 transition"
                        >
                          {isSendingOtp ? 'Sending...' : isOtpSent ? 'Resend' : 'Verify'}
                        </button>
                      ) : (
                        <span className="absolute right-2 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded flex items-center">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-[10px] px-1">
                      <span className={customerPhone.length === 10 ? 'text-emerald-600 font-bold' : 'text-stone-400'}>
                        {customerPhone.length === 10 ? '✓ Valid 10-digit Mobile' : `Numeric only: ${customerPhone.length}/10 digits`}
                      </span>
                      {customerPhone.length === 10 && !isPhoneVerified && !isOtpSent && (
                        <span className="text-brand-600 font-bold">Tap Verify for OTP</span>
                      )}
                    </div>

                    {/* Inline OTP Challenge Entry */}
                    {isOtpSent && !isPhoneVerified && (
                      <div className="p-3 bg-stone-100 rounded-xl space-y-2 border border-stone-200">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-stone-700">Enter 6-digit verification code:</span>
                          {otpNotice && <span className="text-brand-600 font-bold">{otpNotice}</span>}
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="6-digit OTP"
                            className="w-32 px-3 py-1.5 text-center text-sm font-bold tracking-widest border border-stone-300 rounded-lg focus:ring-brand-500"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={isVerifyingOtp || otpCode.length !== 6}
                            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition"
                          >
                            {isVerifyingOtp ? 'Checking...' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute top-2.5 left-3 flex items-center pointer-events-none text-stone-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <textarea
                      rows={2}
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="Special instructions (e.g. Mild spicy, table for 2 near window)"
                      className="block w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Payment Method</h3>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center space-x-3">
                  <CreditCard className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-stone-900">25% Advance Confirmation</p>
                    <p className="text-stone-500 text-[11px]">Pay 25% to reserve kitchen prep; balance 75% settled on arrival.</p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-stone-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>GST & Service Taxes (5%)</span>
                  <span className="font-bold text-stone-900">₹{taxAmount}</span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-extrabold text-stone-900">
                  <span>Total Order Value</span>
                  <span className="text-stone-900 text-base">₹{totalAmount}</span>
                </div>
                <div className="pt-2 border-t border-dashed border-stone-300 space-y-1">
                  <div className="flex justify-between text-brand-700 font-bold">
                    <span>Required Advance (25%)</span>
                    <span>₹{requiredAdvance}</span>
                  </div>
                  <div className="flex justify-between text-stone-500 text-[11px]">
                    <span>Remaining Balance on Arrival</span>
                    <span>₹{remainingBalance}</span>
                  </div>
                </div>
              </div>

              {/* Operational & Refund Protection Notice */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed space-y-1">
                <p>
                  <strong>100% Refund Guarantee:</strong> If the restaurant is unable to accept your pre-arrival order, your 25% advance deposit will be immediately refunded in full.
                </p>
                <p className="text-amber-800/80">
                  Once accepted, kitchen coordinates fresh preparation for your expected arrival at {formattedArrivalTime}.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Drawer Bottom Action */}
        {items.length > 0 && (
          <div className="p-4 border-t border-stone-200 bg-white">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitOrder}
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-600/25 flex items-center justify-center space-x-2 disabled:opacity-50 transition active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Order Request...</span>
                </>
              ) : (
                <>
                  <span>Submit Order (₹{requiredAdvance} Advance)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
