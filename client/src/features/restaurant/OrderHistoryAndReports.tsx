import React, { useState, useEffect } from 'react';
import {
  FileText,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Search,
  Filter,
  Loader2,
  Calendar
} from 'lucide-react';
import api from '../../shared/api';

interface AnalyticsSummary {
  totalOrders: number;
  activeOrders: number;
  servedOrders: number;
  rejectedOrders: number;
  cancelledOrders: number;
  acceptanceRate: number;
  avgPrepMinutes: number;
  totalServedRevenue: number;
}

interface HistoricalOrder {
  _id: string;
  orderReference: string;
  customer: {
    name: string;
    phone: string;
  };
  items: {
    nameSnapshot: string;
    quantity: number;
    subtotal: number;
  }[];
  pricing: {
    totalAmount: number;
  };
  scheduling: {
    expectedArrivalTime: string;
    acceptedAt?: string;
    actualReadyTime?: string;
    servedAt?: string;
  };
  status: string;
  rejectionReason?: string;
  cancellationReason?: string;
  createdAt: string;
}

export const OrderHistoryAndReports: React.FC = () => {
  const [orders, setOrders] = useState<HistoricalOrder[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SERVED' | 'REJECTED' | 'CANCELLED'>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, analyticsRes] = await Promise.all([
          api.get('/restaurant/orders?statusFilter=HISTORY'),
          api.get('/restaurant/analytics/summary')
        ]);
        setOrders(ordersRes.data.data.orders);
        setAnalytics(analyticsRes.data.data);
      } catch (err: any) {
        console.error('Failed to load history & analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      searchQuery === '' ||
      o.orderReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm font-semibold text-stone-600">Loading order history and metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Served Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-stone-900">₹{analytics.totalServedRevenue}</p>
            <span className="text-[11px] text-stone-400 mt-1 block">From completed dine-in orders</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Acceptance Rate</span>
              <TrendingUp className="w-4 h-4 text-brand-600" />
            </div>
            <p className="text-2xl font-extrabold text-stone-900">{analytics.acceptanceRate}%</p>
            <span className="text-[11px] text-stone-400 mt-1 block">Kitchen order acceptance</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Avg Prep Speed</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-stone-900">
              {analytics.avgPrepMinutes > 0 ? `~${analytics.avgPrepMinutes}m` : 'N/A'}
            </p>
            <span className="text-[11px] text-stone-400 mt-1 block">Accepted to Ready time</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Orders Served</span>
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-extrabold text-stone-900">{analytics.servedOrders}</p>
            <span className="text-[11px] text-stone-400 mt-1 block">
              {analytics.rejectedOrders} rejected / {analytics.cancelledOrders} cancelled
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order # or guest name..."
            className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 self-start sm:self-auto text-xs font-bold">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'ALL'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Past
          </button>
          <button
            onClick={() => setStatusFilter('SERVED')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'SERVED'
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Served
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setStatusFilter('CANCELLED')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'CANCELLED'
                ? 'bg-stone-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-900">No Past Orders Found</h3>
          <p className="text-xs text-stone-500 mt-1">Completed orders will appear here for audit and reporting.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden divide-y divide-stone-100">
          {filteredOrders.map((order) => {
            const createdDate = new Date(order.createdAt).toLocaleString([], {
              dateStyle: 'short',
              timeStyle: 'short'
            });

            return (
              <div key={order._id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-stone-900 text-sm">
                      #{order.orderReference}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        order.status === 'SERVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <p className="text-stone-500">
                    Guest: <strong className="text-stone-700">{order.customer.name}</strong> • Placed on {createdDate}
                  </p>

                  <div className="text-stone-600 flex flex-wrap gap-1 mt-1">
                    {order.items.map((i, idx) => (
                      <span key={idx} className="bg-stone-50 px-2 py-0.5 rounded border border-stone-200 text-[11px]">
                        {i.quantity}x {i.nameSnapshot}
                      </span>
                    ))}
                  </div>

                  {order.rejectionReason && (
                    <p className="text-rose-600 text-[11px] mt-1 italic">
                      Rejection Reason: &ldquo;{order.rejectionReason}&rdquo;
                    </p>
                  )}
                </div>

                <div className="text-right sm:self-center flex-shrink-0">
                  <span className="text-base font-extrabold text-stone-900 block">
                    ₹{order.pricing.totalAmount}
                  </span>
                  <span className="text-[10px] text-stone-400">Total Charged</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
