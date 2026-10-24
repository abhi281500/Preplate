import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Flame,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Check,
  Utensils,
  Loader2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import api from '../../shared/api';

interface OrderItemSnapshot {
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  subtotal: number;
}

interface KDSTicket {
  _id: string;
  orderReference: string;
  customer: {
    name: string;
    phone: string;
    specialInstructions?: string;
  };
  items: OrderItemSnapshot[];
  pricing: {
    totalAmount: number;
  };
  scheduling: {
    expectedArrivalTime: string;
    estimatedReadyTime?: string;
    acceptedAt?: string;
    actualReadyTime?: string;
  };
  status: 'ACCEPTED' | 'PREPARING' | 'READY';
  createdAt: string;
}

export const KitchenDisplaySystem: React.FC = () => {
  const [tickets, setTickets] = useState<KDSTicket[]>([]);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACCEPTED' | 'PREPARING' | 'READY'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const fetchKDSTickets = async () => {
    try {
      const res = await api.get('/restaurant/orders?statusFilter=ACTIVE');
      setTickets(res.data.data.orders);
    } catch (err: any) {
      console.error('Failed to fetch KDS tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKDSTickets();
    const interval = setInterval(fetchKDSTickets, 4000); // 4-second continuous sync
    return () => clearInterval(interval);
  }, []);

  const handleAdvanceStatus = async (ticket: KDSTicket) => {
    let nextStatus: 'PREPARING' | 'READY' | 'SERVED';
    if (ticket.status === 'ACCEPTED') nextStatus = 'PREPARING';
    else if (ticket.status === 'PREPARING') nextStatus = 'READY';
    else nextStatus = 'SERVED';

    setActionLoading(ticket._id);
    try {
      await api.post(`/restaurant/orders/${ticket._id}/status`, { nextStatus });
      fetchKDSTickets();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update kitchen status');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleCheckItem = (ticketId: string, itemIdx: number) => {
    const key = `${ticketId}-${itemIdx}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredTickets = tickets.filter((t) => {
    if (filterTab === 'ALL') return true;
    return t.status === filterTab;
  });

  const acceptedCount = tickets.filter((t) => t.status === 'ACCEPTED').length;
  const preparingCount = tickets.filter((t) => t.status === 'PREPARING').length;
  const readyCount = tickets.filter((t) => t.status === 'READY').length;

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm font-semibold text-stone-600">Loading kitchen display tickets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KDS Header & Sub-Tabs */}
      <div className="bg-stone-900 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">
              Kitchen Display System (KDS)
            </h2>
            <p className="text-xs text-stone-400">
              Live preparation tickets synchronized with customer arrival times.
            </p>
          </div>
        </div>

        {/* Tab Filter Pills */}
        <div className="flex items-center space-x-1.5 bg-stone-800 p-1 rounded-xl text-xs font-bold self-stretch sm:self-auto overflow-x-auto">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterTab === 'ALL' ? 'bg-brand-600 text-white' : 'text-stone-400 hover:text-white'
            }`}
          >
            All Active ({tickets.length})
          </button>
          <button
            onClick={() => setFilterTab('ACCEPTED')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterTab === 'ACCEPTED' ? 'bg-blue-600 text-white' : 'text-stone-400 hover:text-white'
            }`}
          >
            To Cook ({acceptedCount})
          </button>
          <button
            onClick={() => setFilterTab('PREPARING')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterTab === 'PREPARING' ? 'bg-purple-600 text-white' : 'text-stone-400 hover:text-white'
            }`}
          >
            Cooking ({preparingCount})
          </button>
          <button
            onClick={() => setFilterTab('READY')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterTab === 'READY' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
            }`}
          >
            Ready ({readyCount})
          </button>
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-900">No Active Kitchen Tickets</h3>
          <p className="text-xs text-stone-500 mt-1">All accepted orders have been served!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map((ticket) => {
            const arrivalDate = new Date(ticket.scheduling.expectedArrivalTime);
            const minutesLeft = Math.round((arrivalDate.getTime() - Date.now()) / (1000 * 60));
            const formattedETA = arrivalDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });

            // Urgency color
            const isUrgent = minutesLeft <= 15 && minutesLeft >= 0;
            const isOverdue = minutesLeft < 0;

            return (
              <div
                key={ticket._id}
                className={`rounded-3xl border-2 p-5 shadow-sm flex flex-col justify-between transition ${
                  ticket.status === 'READY'
                    ? 'border-emerald-400 bg-emerald-50/20'
                    : ticket.status === 'PREPARING'
                    ? 'border-purple-400 bg-purple-50/20'
                    : 'border-blue-300 bg-white'
                }`}
              >
                <div>
                  {/* Top Bar: Reference, Status Badge & ETA Timer */}
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <div>
                      <span className="text-lg font-extrabold text-stone-900">
                        #{ticket.orderReference}
                      </span>
                      <span className="text-xs text-stone-500 block">{ticket.customer.name}</span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : isUrgent
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        ETA {formattedETA} {isOverdue ? '(Due Now)' : `(${minutesLeft}m)`}
                      </span>

                      <span
                        className={`block text-[10px] font-bold uppercase mt-1 ${
                          ticket.status === 'READY'
                            ? 'text-emerald-700'
                            : ticket.status === 'PREPARING'
                            ? 'text-purple-700'
                            : 'text-blue-700'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  {/* Checklist of Items for Kitchen Staff */}
                  <div className="py-3 space-y-2">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      Tap items to cross off:
                    </p>
                    <div className="space-y-1.5">
                      {ticket.items.map((item, idx) => {
                        const isDone = checkedItems[`${ticket._id}-${idx}`];

                        return (
                          <div
                            key={idx}
                            onClick={() => toggleCheckItem(ticket._id, idx)}
                            className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition flex items-center justify-between ${
                              isDone
                                ? 'bg-stone-100 border-stone-200 text-stone-400 line-through'
                                : 'bg-white border-stone-200 text-stone-900 hover:border-brand-300 shadow-sm'
                            }`}
                          >
                            <span className="flex items-center">
                              <span
                                className={`w-4 h-4 rounded-md border mr-2 flex items-center justify-center text-[10px] ${
                                  isDone
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-stone-300 bg-white'
                                }`}
                              >
                                {isDone && <Check className="w-3 h-3" />}
                              </span>
                              <span>{item.quantity}x {item.nameSnapshot}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cooking Instructions Highlight */}
                  {ticket.customer.specialInstructions && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-3">
                      <strong className="block text-[10px] uppercase tracking-wider text-amber-800">
                        Kitchen Special Instructions:
                      </strong>
                      <p className="italic mt-0.5">&ldquo;{ticket.customer.specialInstructions}&rdquo;</p>
                    </div>
                  )}
                </div>

                {/* Main Tap Action Button */}
                <div className="pt-3 border-t border-stone-200">
                  <button
                    type="button"
                    disabled={actionLoading === ticket._id}
                    onClick={() => handleAdvanceStatus(ticket)}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs shadow-md flex items-center justify-center space-x-2 transition active:scale-98 disabled:opacity-50 text-white ${
                      ticket.status === 'ACCEPTED'
                        ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/25'
                        : ticket.status === 'PREPARING'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                        : 'bg-stone-900 hover:bg-stone-800 shadow-stone-900/25'
                    }`}
                  >
                    {actionLoading === ticket._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : ticket.status === 'ACCEPTED' ? (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>Start Cooking (Move to Preparing)</span>
                      </>
                    ) : ticket.status === 'PREPARING' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Mark Ready for Pickup</span>
                      </>
                    ) : (
                      <>
                        <Utensils className="w-4 h-4" />
                        <span>Hand Over (Mark Served)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
