import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  LogOut,
  Building2,
  CreditCard,
  History,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Edit2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sliders,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../shared/AuthContext';
import api from '../../shared/api';

interface OverviewMetrics {
  totalRestaurants: number;
  activeRestaurants: number;
  suspendedRestaurants: number;
  pendingApprovalRestaurants: number;
  totalGMV: number;
  totalSuccessfulOrders: number;
  totalAllOrders: number;
  estimatedMRR: number;
}

interface OverviewData {
  metrics: OverviewMetrics;
  ordersByStatus: Record<string, number>;
  planBreakdown: Record<string, { name: string; count: number; monthlyRevenue: number }>;
  recentOrders: any[];
  recentAuditLogs: any[];
}

interface RestaurantTenant {
  _id: string;
  tenantId: string;
  name: string;
  slug: string;
  contactPhone: string;
  whatsappNumber: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL';
  subscriptionId?: {
    _id: string;
    planId: {
      _id: string;
      planKey: string;
      name: string;
      priceINR: number;
      billingCycle: string;
    };
    status: string;
  };
  owner?: {
    name: string;
    email: string;
    status: string;
  };
  stats: {
    totalOrders: number;
    totalRevenue: number;
  };
  createdAt: string;
}

interface SubscriptionPlanItem {
  _id: string;
  planKey: string;
  name: string;
  description?: string;
  priceINR: number;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  features: {
    maxMenuItems: number;
    maxStaffAccounts: number;
    analyticsAccess: boolean;
    prioritySupport: boolean;
  };
  isActive: boolean;
  activeSubscribers: number;
}

interface AuditLogItem {
  _id: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  tenantId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
  userId?: {
    name: string;
    email: string;
  };
}

export const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'restaurants' | 'plans' | 'audit'>('overview');

  // Overview state
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Restaurants state
  const [restaurants, setRestaurants] = useState<RestaurantTenant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);

  // Status moderation modal state
  const [selectedRest, setSelectedRest] = useState<RestaurantTenant | null>(null);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Plan re-assignment modal state
  const [isPlanAssignModalOpen, setIsPlanAssignModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Subscription Plans state
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanItem | null>(null);
  const [planForm, setPlanForm] = useState({
    planKey: '',
    name: '',
    description: '',
    priceINR: 499,
    billingCycle: 'MONTHLY' as 'MONTHLY' | 'ANNUAL',
    maxMenuItems: 50,
    maxStaffAccounts: 3,
    analyticsAccess: true,
    prioritySupport: false,
    isActive: true
  });
  const [planSubmitting, setPlanSubmitting] = useState(false);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Feedback notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch Overview
  const fetchOverview = async () => {
    try {
      setLoadingOverview(true);
      const res = await api.get('/super/analytics/overview');
      if (res.data.success) {
        setOverview(res.data.data);
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to load platform overview', 'error');
    } finally {
      setLoadingOverview(false);
    }
  };

  // 2. Fetch Restaurants
  const fetchRestaurants = async () => {
    try {
      setLoadingRestaurants(true);
      let url = '/super/restaurants?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;

      const res = await api.get(url);
      if (res.data.success) {
        setRestaurants(res.data.data.restaurants || []);
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to fetch restaurants', 'error');
    } finally {
      setLoadingRestaurants(false);
    }
  };

  // 3. Fetch Plans
  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const res = await api.get('/super/plans');
      if (res.data.success) {
        setPlans(res.data.data.plans || []);
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to fetch subscription plans', 'error');
    } finally {
      setLoadingPlans(false);
    }
  };

  // 4. Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const res = await api.get('/super/audit-logs?limit=50');
      if (res.data.success) {
        setAuditLogs(res.data.data.logs || []);
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to load audit logs', 'error');
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
    if (activeTab === 'restaurants') {
      fetchRestaurants();
      fetchPlans();
    }
    if (activeTab === 'plans') fetchPlans();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  // Handle status update
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRest) return;
    setStatusSubmitting(true);
    try {
      const res = await api.patch(`/super/restaurants/${selectedRest._id}/status`, {
        status: newStatus,
        reason: statusReason.trim() || 'Super admin manual status update'
      });
      if (res.data.success) {
        showToast(`Tenant ${selectedRest.name} status updated to ${newStatus}`);
        setIsStatusModalOpen(false);
        fetchRestaurants();
        fetchOverview();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update restaurant status', 'error');
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Handle plan assignment
  const handleAssignPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRest || !selectedPlanId) return;
    setAssignSubmitting(true);
    try {
      const res = await api.patch(`/super/restaurants/${selectedRest._id}/plan`, {
        planId: selectedPlanId,
        status: 'ACTIVE'
      });
      if (res.data.success) {
        showToast(`Plan successfully updated for ${selectedRest.name}`);
        setIsPlanAssignModalOpen(false);
        fetchRestaurants();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to assign plan', 'error');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Handle create or update plan
  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanSubmitting(true);
    try {
      if (editingPlan) {
        // Update existing plan
        const res = await api.put(`/super/plans/${editingPlan._id}`, {
          name: planForm.name,
          description: planForm.description,
          priceINR: Number(planForm.priceINR),
          billingCycle: planForm.billingCycle,
          features: {
            maxMenuItems: Number(planForm.maxMenuItems),
            maxStaffAccounts: Number(planForm.maxStaffAccounts),
            analyticsAccess: planForm.analyticsAccess,
            prioritySupport: planForm.prioritySupport
          },
          isActive: planForm.isActive
        });
        if (res.data.success) {
          showToast(`Subscription plan ${planForm.name} updated successfully`);
          setIsPlanModalOpen(false);
          fetchPlans();
        }
      } else {
        // Create new plan
        const res = await api.post('/super/plans', {
          planKey: planForm.planKey.trim().toUpperCase(),
          name: planForm.name.trim(),
          description: planForm.description.trim(),
          priceINR: Number(planForm.priceINR),
          billingCycle: planForm.billingCycle,
          features: {
            maxMenuItems: Number(planForm.maxMenuItems),
            maxStaffAccounts: Number(planForm.maxStaffAccounts),
            analyticsAccess: planForm.analyticsAccess,
            prioritySupport: planForm.prioritySupport
          },
          isActive: planForm.isActive
        });
        if (res.data.success) {
          showToast(`New plan ${planForm.name} created successfully`);
          setIsPlanModalOpen(false);
          fetchPlans();
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save plan', 'error');
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleOpenEditPlan = (plan: SubscriptionPlanItem) => {
    setEditingPlan(plan);
    setPlanForm({
      planKey: plan.planKey,
      name: plan.name,
      description: plan.description || '',
      priceINR: plan.priceINR,
      billingCycle: plan.billingCycle,
      maxMenuItems: plan.features?.maxMenuItems || 50,
      maxStaffAccounts: plan.features?.maxStaffAccounts || 3,
      analyticsAccess: Boolean(plan.features?.analyticsAccess),
      prioritySupport: Boolean(plan.features?.prioritySupport),
      isActive: plan.isActive
    });
    setIsPlanModalOpen(true);
  };

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      planKey: '',
      name: '',
      description: '',
      priceINR: 499,
      billingCycle: 'MONTHLY',
      maxMenuItems: 50,
      maxStaffAccounts: 3,
      analyticsAccess: true,
      prioritySupport: false,
      isActive: true
    });
    setIsPlanModalOpen(true);
  };

  const handleArchivePlan = async (planId: string, planName: string) => {
    if (!window.confirm(`Are you sure you want to deactivate plan '${planName}'? Existing subscribers will retain access.`)) return;
    try {
      const res = await api.delete(`/super/plans/${planId}`);
      if (res.data.success) {
        showToast(`Plan ${planName} archived`);
        fetchPlans();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to archive plan', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-lg shadow-brand-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold tracking-tight text-white">Preplate SaaS</h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-stone-400">Multi-Tenant Platform Control Plane</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-stone-200">{user?.name || 'Platform Administrator'}</p>
              <p className="text-[10px] text-stone-400 font-mono">{user?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center text-xs font-bold text-stone-300 bg-stone-800 hover:bg-stone-700 px-3.5 py-2 rounded-xl transition border border-stone-700/60"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-stone-800 pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'overview'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Platform Overview & GMV</span>
          </button>

          <button
            onClick={() => setActiveTab('restaurants')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'restaurants'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Restaurant Tenants ({overview?.metrics.totalRestaurants ?? '...'})</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'plans'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Subscription Plans</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'audit'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Platform Audit Log</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: PLATFORM OVERVIEW & GMV */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Platform GMV */}
              <div className="bg-stone-800/60 border border-stone-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Gross Merchandise Value</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  ₹{(overview?.metrics.totalGMV || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-stone-400">
                  Total food order volume placed across all tenant storefronts.
                </p>
              </div>

              {/* Metric 2: Estimated MRR */}
              <div className="bg-stone-800/60 border border-stone-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Estimated Monthly Recurring</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  ₹{(overview?.metrics.estimatedMRR || 0).toLocaleString('en-IN')}/mo
                </div>
                <p className="text-[11px] text-stone-400">
                  From active restaurant subscriptions (excluding free trial pilots).
                </p>
              </div>

              {/* Metric 3: Total Orders */}
              <div className="bg-stone-800/60 border border-stone-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Orders Processed</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {overview?.metrics.totalAllOrders || 0}
                </div>
                <p className="text-[11px] text-stone-400">
                  {overview?.metrics.totalSuccessfulOrders || 0} accepted/completed ({' '}
                  {overview?.metrics.totalAllOrders
                    ? Math.round(
                        ((overview?.metrics.totalSuccessfulOrders || 0) / overview?.metrics.totalAllOrders) * 100
                      )
                    : 100}
                  % success rate).
                </p>
              </div>

              {/* Metric 4: Registered Tenants */}
              <div className="bg-stone-800/60 border border-stone-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Active Tenants</span>
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {overview?.metrics.activeRestaurants || 0}
                  <span className="text-xs text-stone-400 font-normal"> / {overview?.metrics.totalRestaurants || 0} total</span>
                </div>
                <p className="text-[11px] text-stone-400">
                  {overview?.metrics.suspendedRestaurants || 0} suspended accounts.
                </p>
              </div>
            </div>

            {/* Split Grid: Status Breakdown & Plan Subscription Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Status Breakdown */}
              <div className="bg-stone-800/60 border border-stone-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-brand-500" />
                  <span>Platform Order Pipeline Breakdown</span>
                </h3>

                <div className="space-y-3">
                  {Object.entries(overview?.ordersByStatus || {}).map(([st, count]) => (
                    <div key={st} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-stone-300 font-semibold">{st.replace(/_/g, ' ')}</span>
                        <span className="text-stone-400 font-bold">{count}</span>
                      </div>
                      <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            st === 'SERVED' || st === 'READY'
                              ? 'bg-emerald-500'
                              : st === 'CANCELLED' || st === 'REJECTED'
                              ? 'bg-rose-500'
                              : 'bg-brand-500'
                          }`}
                          style={{
                            width: `${
                              overview?.metrics.totalAllOrders
                                ? Math.max(5, (count / overview.metrics.totalAllOrders) * 100)
                                : 0
                            }%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subscription Plan Distribution */}
              <div className="bg-stone-800/60 border border-stone-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <span>Active Subscription Plan Breakdown</span>
                </h3>

                {Object.keys(overview?.planBreakdown || {}).length === 0 ? (
                  <p className="text-xs text-stone-400 py-6 text-center">No active paid subscriptions recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(overview?.planBreakdown || {}).map(([key, item]) => (
                      <div key={key} className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{item.name}</p>
                          <p className="text-[11px] text-stone-400 font-mono">Key: {key}</p>
                        </div>
                        <div className="text-right font-mono">
                          <p className="text-xs font-bold text-emerald-400">{item.count} Restaurants</p>
                          <p className="text-[11px] text-stone-400">₹{item.monthlyRevenue.toLocaleString('en-IN')}/mo</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Cross-Platform Activity Stream */}
            <div className="bg-stone-800/60 border border-stone-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <History className="w-4 h-4 text-stone-400" />
                <span>Recent Platform Activity Stream</span>
              </h3>

              <div className="divide-y divide-stone-800 text-xs">
                {(overview?.recentAuditLogs || []).map((audit) => (
                  <div key={audit._id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-2 h-2 rounded-full bg-brand-500" />
                      <div>
                        <span className="font-bold text-stone-200">{audit.action}</span>
                        <span className="text-stone-400 ml-2">on {audit.resource}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-stone-500">
                      {new Date(audit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: RESTAURANT TENANT DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            {/* Search and Moderation Toolbar */}
            <div className="bg-stone-800/60 border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchRestaurants()}
                    placeholder="Search by restaurant name, slug, or phone..."
                    className="w-full pl-10 pr-4 py-2 bg-stone-900 border border-stone-700/60 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-stone-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setTimeout(fetchRestaurants, 0);
                    }}
                    className="bg-stone-900 border border-stone-700/60 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                  </select>
                </div>
              </div>

              <button
                onClick={fetchRestaurants}
                className="inline-flex items-center space-x-2 text-xs font-bold text-stone-300 bg-stone-800 hover:bg-stone-700 px-3.5 py-2 rounded-xl border border-stone-700/60 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>

            {/* Restaurant Directory Table */}
            <div className="bg-stone-800/60 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-900/80 border-b border-stone-800 text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Restaurant</th>
                      <th className="py-3 px-4">Owner Contact</th>
                      <th className="py-3 px-4">Subscription Plan</th>
                      <th className="py-3 px-4 text-right">Orders</th>
                      <th className="py-3 px-4 text-right">GMV (₹)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 text-stone-300">
                    {loadingRestaurants ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-stone-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                          <span>Loading restaurant tenants...</span>
                        </td>
                      </tr>
                    ) : restaurants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-stone-500">
                          No restaurant tenants found matching your query.
                        </td>
                      </tr>
                    ) : (
                      restaurants.map((rest) => (
                        <tr key={rest._id} className="hover:bg-stone-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-xs">{rest.name}</div>
                            <div className="text-[11px] text-stone-500 font-mono">
                              /r/{rest.slug} • {rest.tenantId}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <div className="text-stone-300">{rest.owner?.email || 'No owner assigned'}</div>
                            <div className="text-[11px] text-stone-500">{rest.contactPhone}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {rest.subscriptionId?.planId?.name || 'Starter Pilot Plan'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-200">
                            {rest.stats?.totalOrders || 0}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                            ₹{(rest.stats?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                rest.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : rest.status === 'SUSPENDED'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {rest.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {/* Change Plan Button */}
                            <button
                              onClick={() => {
                                setSelectedRest(rest);
                                setSelectedPlanId(rest.subscriptionId?.planId?._id || (plans[0]?._id || ''));
                                setIsPlanAssignModalOpen(true);
                              }}
                              className="text-[11px] font-bold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 px-2.5 py-1 rounded-lg border border-stone-700 transition"
                            >
                              Plan
                            </button>

                            {/* Moderation Status Button */}
                            <button
                              onClick={() => {
                                setSelectedRest(rest);
                                setNewStatus(rest.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
                                setStatusReason('');
                                setIsStatusModalOpen(true);
                              }}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition border ${
                                rest.status === 'ACTIVE'
                                  ? 'text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30'
                                  : 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30'
                              }`}
                            >
                              {rest.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </button>

                            {/* View Customer Storefront Link */}
                            <Link
                              to={`/r/${rest.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-stone-400 hover:text-brand-400 p-1"
                              title="Open Customer Menu"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SUBSCRIPTION PLANS CONFIGURATOR */}
        {/* ========================================================================= */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-white">Configurable Subscription Plans</h3>
                <p className="text-xs text-stone-400">
                  Control SaaS tiers, prices in INR, billing cycles, and feature quotas without hardcoding.
                </p>
              </div>

              <button
                onClick={handleOpenCreatePlan}
                className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Plan</span>
              </button>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div
                  key={p._id}
                  className={`bg-stone-800/60 border rounded-2xl p-6 flex flex-col justify-between space-y-6 ${
                    p.isActive ? 'border-stone-800' : 'border-stone-800/50 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-stone-900 text-stone-400 border border-stone-700/60 font-mono">
                        {p.planKey}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-stone-700 text-stone-400'
                        }`}
                      >
                        {p.isActive ? 'Active' : 'Archived'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-white">{p.name}</h4>
                      <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                        {p.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-2 font-mono">
                      <span className="text-2xl font-black text-white">₹{p.priceINR}</span>
                      <span className="text-xs text-stone-400"> / {p.billingCycle.toLowerCase()}</span>
                    </div>

                    <div className="border-t border-stone-800/80 pt-4 space-y-2 text-xs text-stone-300">
                      <div className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                        <span>Up to {p.features.maxMenuItems} Menu Items</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                        <span>Up to {p.features.maxStaffAccounts} Staff Accounts</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {p.features.analyticsAccess ? (
                          <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                        )}
                        <span className={p.features.analyticsAccess ? '' : 'text-stone-500'}>
                          Advanced Operations Analytics
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {p.features.prioritySupport ? (
                          <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                        )}
                        <span className={p.features.prioritySupport ? '' : 'text-stone-500'}>
                          Priority WhatsApp Onboarding Support
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
                    <span className="text-xs font-mono text-stone-400">
                      <b className="text-brand-400">{p.activeSubscribers}</b> active tenant{p.activeSubscribers === 1 ? '' : 's'}
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenEditPlan(p)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-700/60 transition"
                        title="Edit Plan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {p.isActive && (
                        <button
                          onClick={() => handleArchivePlan(p._id, p.name)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition"
                          title="Archive Plan"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PLATFORM AUDIT LOG */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">Platform Administrative Audit Trail</h3>
                <p className="text-xs text-stone-400">
                  Cryptographically trackable log of all Super Admin security and moderation operations.
                </p>
              </div>

              <button
                onClick={fetchAuditLogs}
                className="inline-flex items-center space-x-2 text-xs font-bold text-stone-300 bg-stone-800 hover:bg-stone-700 px-3.5 py-2 rounded-xl border border-stone-700/60 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Audit Logs</span>
              </button>
            </div>

            <div className="bg-stone-800/60 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-900/80 border-b border-stone-800 text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Resource Target</th>
                      <th className="py-3 px-4">Metadata Diff</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 text-stone-300 font-mono">
                    {loadingAudit ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-stone-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                          <span>Loading audit trail...</span>
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-stone-500">
                          No audit logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-stone-800/40 transition">
                          <td className="py-3 px-4 font-bold text-brand-400">{log.action}</td>
                          <td className="py-3 px-4 text-stone-300">
                            {log.userId?.email || log.actorRole}
                          </td>
                          <td className="py-3 px-4 text-stone-400">
                            {log.resource} {log.tenantId ? `(${log.tenantId})` : ''}
                          </td>
                          <td className="py-3 px-4 text-stone-400 text-[11px] max-w-xs truncate">
                            {JSON.stringify(log.details)}
                          </td>
                          <td className="py-3 px-4 text-right text-stone-500 text-[11px]">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: RESTAURANT MODERATION STATUS MODAL */}
      {/* ========================================================================= */}
      {isStatusModalOpen && selectedRest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <h3 className="text-sm font-bold text-white">Moderate Restaurant Account</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-stone-400">Target Tenant:</p>
                <p className="text-sm font-bold text-white">{selectedRest.name} ({selectedRest.tenantId})</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">New Account Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ACTIVE">ACTIVE (Storefront and Operations Online)</option>
                  <option value="SUSPENDED">SUSPENDED (Strict Tenant Block)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Administrative Reason (Audit Log)</label>
                <textarea
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Account delinquency review or manual security compliance check."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-400 hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50"
                >
                  {statusSubmitting ? 'Updating...' : 'Confirm Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PLAN ASSIGNMENT MODAL */}
      {/* ========================================================================= */}
      {isPlanAssignModalOpen && selectedRest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <h3 className="text-sm font-bold text-white">Assign Subscription Plan</h3>
              <button onClick={() => setIsPlanAssignModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignPlanSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-stone-400">Target Tenant:</p>
                <p className="text-sm font-bold text-white">{selectedRest.name} ({selectedRest.tenantId})</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Select Subscription Tier</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} — ₹{p.priceINR} / {p.billingCycle.toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPlanAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-400 hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50"
                >
                  {assignSubmitting ? 'Assigning...' : 'Assign Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE / EDIT SUBSCRIPTION PLAN MODAL */}
      {/* ========================================================================= */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <h3 className="text-sm font-bold text-white">
                {editingPlan ? `Edit Subscription Plan: ${editingPlan.name}` : 'Create New Subscription Plan'}
              </h3>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePlanSubmit} className="space-y-4">
              {!editingPlan && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">Plan Key (Unique Slug)</label>
                  <input
                    type="text"
                    required
                    value={planForm.planKey}
                    onChange={(e) => setPlanForm({ ...planForm, planKey: e.target.value })}
                    placeholder="e.g. HIGHWAY_TIER or ENTERPRISE"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-300">Plan Display Name</label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Starter Roadside Pilot"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-300">Description</label>
                <textarea
                  rows={2}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Target customer segment and capability summary"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">Price in INR (₹)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={planForm.priceINR}
                    onChange={(e) => setPlanForm({ ...planForm, priceINR: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">Billing Cycle</label>
                  <select
                    value={planForm.billingCycle}
                    onChange={(e) => setPlanForm({ ...planForm, billingCycle: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">Max Menu Items</label>
                  <input
                    type="number"
                    min={5}
                    value={planForm.maxMenuItems}
                    onChange={(e) => setPlanForm({ ...planForm, maxMenuItems: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-300">Max Staff Accounts</label>
                  <input
                    type="number"
                    min={1}
                    value={planForm.maxStaffAccounts}
                    onChange={(e) => setPlanForm({ ...planForm, maxStaffAccounts: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-800">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.analyticsAccess}
                    onChange={(e) => setPlanForm({ ...planForm, analyticsAccess: e.target.checked })}
                    className="rounded bg-stone-950 border-stone-700 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs text-stone-300 font-bold">Include Analytics Dashboard</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.prioritySupport}
                    onChange={(e) => setPlanForm({ ...planForm, prioritySupport: e.target.checked })}
                    className="rounded bg-stone-950 border-stone-700 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs text-stone-300 font-bold">Include Priority SLA Support</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                    className="rounded bg-stone-950 border-stone-700 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs text-stone-300 font-bold">Plan is Active & Available</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-400 hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50"
                >
                  {planSubmitting ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
