import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  Loader2,
  Package,
  PackageCheck,
  PackageX,
  Boxes,
  RotateCcw,
  Sliders,
  Check,
  TrendingUp,
  AlertTriangle,
  Minus
} from 'lucide-react';
import api from '../../shared/api';

interface Category {
  _id: string;
  name: string;
  description?: string;
  displayOrder: number;
  itemCount?: number;
}

interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  isVeg: boolean;
  prepTimeEstimateMinutes: number;
  isAvailable: boolean;
  trackInventory?: boolean;
  availableQuantity?: number;
  dailyStockLimit?: number;
  ordersCountToday?: number;
  categoryId: { _id: string; name: string } | string;
}

export const MenuManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick edit stock input state (itemId -> custom input string)
  const [customStockInputs, setCustomStockInputs] = useState<Record<string, string>>({});

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const [showItemModal, setShowItemModal] = useState(false);
  const [itemFormData, setItemFormData] = useState({
    name: '',
    categoryId: '',
    description: '',
    price: '',
    isVeg: true,
    prepTimeEstimateMinutes: '15',
    trackInventory: true,
    availableQuantity: '25',
    dailyStockLimit: '25'
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get('/restaurant/categories'),
        api.get('/restaurant/menu-items')
      ]);
      setCategories(catRes.data.data);
      setMenuItems(itemRes.data.data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to fetch menu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1-Click Availability Toggle (86ing)
  const handleToggleAvailability = async (item: MenuItem) => {
    const nextState = !item.isAvailable;
    setActionLoading(item._id);
    try {
      const res = await api.patch(`/restaurant/menu-items/${item._id}/availability`, {
        isAvailable: nextState
      });
      setMenuItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, ...res.data.data } : i))
      );
      triggerToast(
        nextState
          ? `Item '${item.name}' made available in kitchen`
          : `Item '${item.name}' 86’d (Marked Sold Out)`
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update item availability');
    } finally {
      setActionLoading(null);
    }
  };

  // Adjust stock portions (+1, -1, +5, +10)
  const handleAdjustStock = async (item: MenuItem, adjustment: number) => {
    setActionLoading(item._id);
    try {
      const res = await api.patch(`/restaurant/menu-items/${item._id}/stock`, {
        adjustment,
        trackInventory: true
      });
      setMenuItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, ...res.data.data } : i))
      );
      triggerToast(
        `Stock for '${item.name}' adjusted (${adjustment > 0 ? `+${adjustment}` : adjustment}). New count: ${res.data.data.availableQuantity}`
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setActionLoading(null);
    }
  };

  // Set exact stock number
  const handleSetExactStock = async (item: MenuItem, quantity: number) => {
    if (isNaN(quantity) || quantity < 0) return;
    setActionLoading(item._id);
    try {
      const res = await api.patch(`/restaurant/menu-items/${item._id}/stock`, {
        availableQuantity: quantity,
        trackInventory: true
      });
      setMenuItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, ...res.data.data } : i))
      );
      setCustomStockInputs((prev) => ({ ...prev, [item._id]: '' }));
      triggerToast(`Stock for '${item.name}' set to ${quantity} portions`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to set stock quantity');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle between Unlimited Stock vs Tracked Portions
  const handleToggleInventoryMode = async (item: MenuItem) => {
    const nextMode = !item.trackInventory;
    setActionLoading(item._id);
    try {
      const res = await api.patch(`/restaurant/menu-items/${item._id}/stock`, {
        trackInventory: nextMode,
        availableQuantity: nextMode ? (item.availableQuantity || 20) : undefined
      });
      setMenuItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, ...res.data.data } : i))
      );
      triggerToast(
        nextMode
          ? `'${item.name}' is now tracking portion limits (${item.availableQuantity || 20} portions)`
          : `'${item.name}' is now set to Unlimited Stock (Always Available)`
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to switch inventory mode');
    } finally {
      setActionLoading(null);
    }
  };

  // Reset to daily quota (e.g. at the start of shift)
  const handleResetToDailyQuota = async (item: MenuItem) => {
    const quota = item.dailyStockLimit || 25;
    handleSetExactStock(item, quota);
  };

  // Add Category Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const res = await api.post('/restaurant/categories', {
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim() || undefined
      });
      setCategories((prev) => [...prev, { ...res.data.data, itemCount: 0 }]);
      setShowCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryDesc('');
      triggerToast(`Category '${res.data.data.name}' created`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create category');
    }
  };

  // Delete Category Handler
  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`Delete category "${cat.name}"? Items inside must be removed first.`)) {
      return;
    }

    try {
      await api.delete(`/restaurant/categories/${cat._id}`);
      setCategories((prev) => prev.filter((c) => c._id !== cat._id));
      if (selectedCategoryId === cat._id) {
        setSelectedCategoryId('all');
      }
      triggerToast(`Category '${cat.name}' deleted`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cannot delete category');
    }
  };

  // Add Item Handler
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.name || !itemFormData.categoryId || !itemFormData.price) return;

    try {
      const res = await api.post('/restaurant/menu-items', {
        name: itemFormData.name.trim(),
        categoryId: itemFormData.categoryId,
        description: itemFormData.description.trim() || undefined,
        price: Number(itemFormData.price),
        isVeg: itemFormData.isVeg,
        prepTimeEstimateMinutes: Number(itemFormData.prepTimeEstimateMinutes) || 15,
        trackInventory: itemFormData.trackInventory,
        availableQuantity: itemFormData.trackInventory
          ? Number(itemFormData.availableQuantity) || 20
          : 9999,
        dailyStockLimit: itemFormData.trackInventory
          ? Number(itemFormData.dailyStockLimit) || 20
          : 9999
      });

      setMenuItems((prev) => [...prev, res.data.data]);
      setShowItemModal(false);
      setItemFormData({
        name: '',
        categoryId: '',
        description: '',
        price: '',
        isVeg: true,
        prepTimeEstimateMinutes: '15',
        trackInventory: true,
        availableQuantity: '25',
        dailyStockLimit: '25'
      });
      fetchData();
      triggerToast(`Item '${res.data.data.name}' added with stock control`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add menu item');
    }
  };

  // Delete Item Handler
  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Delete food item "${itemName}"?`)) return;

    try {
      await api.delete(`/restaurant/menu-items/${itemId}`);
      setMenuItems((prev) => prev.filter((i) => i._id !== itemId));
      fetchData();
      triggerToast(`Item '${itemName}' deleted`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete item');
    }
  };

  const filteredItems = menuItems.filter((item) => {
    if (selectedCategoryId === 'all') return true;
    const catId = typeof item.categoryId === 'object' ? item.categoryId._id : item.categoryId;
    return catId === selectedCategoryId;
  });

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm font-semibold text-stone-600">Loading restaurant menu & stock...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-stone-900">Menu & Stock Availability Manager</h2>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-200">
              Production Stock Control
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Control exact product portion limits, set daily preparation quotas, track customer orders, and instantly 86 sold-out items.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="inline-flex items-center text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3.5 py-2 rounded-xl border border-stone-200 transition"
          >
            <FolderPlus className="w-4 h-4 mr-1.5 text-stone-500" />
            <span>New Category</span>
          </button>
          <button
            onClick={() => {
              if (categories.length === 0) {
                alert('Please create at least one category first.');
                return;
              }
              setItemFormData((prev) => ({ ...prev, categoryId: categories[0]._id }));
              setShowItemModal(true);
            }}
            className="inline-flex items-center text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3.5 py-2 rounded-xl shadow-sm shadow-brand-600/30 transition"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition ${
            selectedCategoryId === 'all'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          All Items ({menuItems.length})
        </button>
        {categories.map((cat) => (
          <div key={cat._id} className="relative group shrink-0">
            <button
              onClick={() => setSelectedCategoryId(cat._id)}
              className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                selectedCategoryId === cat._id
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-[10px] opacity-75">({cat.itemCount || 0})</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCategory(cat);
              }}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white hidden group-hover:flex items-center justify-center text-[10px] shadow"
              title="Delete Category"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Products & Inventory Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
          <Utensils className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-900">No menu items found</h3>
          <p className="text-xs text-stone-500 mt-1">Add items to this category to begin managing stock and orders.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const isTracked = Boolean(item.trackInventory);
            const remainingQty = item.availableQuantity ?? 0;
            const isSoldOut = !item.isAvailable || (isTracked && remainingQty <= 0);
            const isLowStock = isTracked && !isSoldOut && remainingQty <= 5;

            return (
              <div
                key={item._id}
                className={`bg-white rounded-2xl border p-5 shadow-sm transition flex flex-col justify-between space-y-4 ${
                  isSoldOut
                    ? 'border-rose-300 bg-rose-50/20'
                    : isLowStock
                    ? 'border-amber-300 bg-amber-50/15'
                    : 'border-stone-200 hover:border-brand-300'
                }`}
              >
                <div>
                  {/* Top Badges & Delete */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          item.isVeg
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1 ${
                            item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        />
                        {item.isVeg ? 'Veg' : 'Non-Veg'}
                      </span>

                      {/* Stock Mode Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isTracked
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-stone-100 text-stone-600 border-stone-200'
                        }`}
                      >
                        {isTracked ? 'Portion Tracked' : 'Unlimited Stock'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item._id, item.name)}
                      className="text-stone-300 hover:text-rose-600 p-1 transition"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 leading-snug">{item.name}</h3>
                  {item.description && (
                    <p className="mt-1 text-xs text-stone-500 line-clamp-2">{item.description}</p>
                  )}

                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="text-base font-extrabold text-stone-900 font-mono">₹{item.price}</span>
                    <span className="flex items-center text-stone-400 text-[11px]">
                      <Clock className="w-3 h-3 mr-1" /> ~{item.prepTimeEstimateMinutes}m prep
                    </span>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* PRODUCTION STOCK & INVENTORY CONTROLS */}
                {/* ========================================================================= */}
                <div className="pt-3 border-t border-stone-100 space-y-3">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      {isSoldOut ? (
                        <PackageX className="w-4 h-4 text-rose-600" />
                      ) : isLowStock ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <PackageCheck className="w-4 h-4 text-emerald-600" />
                      )}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                          Current Stock Status
                        </span>
                        <span
                          className={`text-xs font-black ${
                            isSoldOut
                              ? 'text-rose-700'
                              : isLowStock
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {isSoldOut
                            ? 'SOLD OUT (86’d)'
                            : isTracked
                            ? `${remainingQty} Portions Remaining`
                            : 'Unlimited Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Orders count today */}
                    {isTracked && (
                      <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded-lg">
                        {item.ordersCountToday || 0} sold today
                      </span>
                    )}
                  </div>

                  {/* Stepper Controls (When Tracking Portions) */}
                  {isTracked ? (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
                        <span>Quick Portions Stepper</span>
                        <span className="font-mono text-stone-500">
                          Quota: {item.dailyStockLimit || 25}/day
                        </span>
                      </div>

                      {/* Quick delta buttons: -1, +1, +5, +10 */}
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          disabled={actionLoading === item._id || remainingQty <= 0}
                          onClick={() => handleAdjustStock(item, -1)}
                          className="flex-1 py-1 rounded-lg text-xs font-bold bg-white hover:bg-stone-100 disabled:opacity-40 border border-stone-200 text-stone-800 transition"
                          title="Reduce 1 portion"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === item._id}
                          onClick={() => handleAdjustStock(item, 1)}
                          className="flex-1 py-1 rounded-lg text-xs font-bold bg-white hover:bg-stone-100 disabled:opacity-40 border border-stone-200 text-stone-800 transition"
                          title="Add 1 portion"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === item._id}
                          onClick={() => handleAdjustStock(item, 5)}
                          className="flex-1 py-1 rounded-lg text-xs font-bold bg-white hover:bg-stone-100 disabled:opacity-40 border border-stone-200 text-stone-800 transition"
                          title="Cooked 5 more portions"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === item._id}
                          onClick={() => handleAdjustStock(item, 10)}
                          className="flex-1 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 border border-emerald-300 text-emerald-800 transition"
                          title="Cooked 10 more portions"
                        >
                          +10
                        </button>
                      </div>

                      {/* Direct Numeric Input */}
                      <div className="flex items-center space-x-1.5 pt-1">
                        <input
                          type="number"
                          min="0"
                          placeholder="Exact qty"
                          value={customStockInputs[item._id] ?? ''}
                          onChange={(e) =>
                            setCustomStockInputs((prev) => ({ ...prev, [item._id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = parseInt(customStockInputs[item._id]);
                              if (!isNaN(val)) handleSetExactStock(item, val);
                            }
                          }}
                          className="w-24 px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <button
                          type="button"
                          disabled={
                            actionLoading === item._id ||
                            !customStockInputs[item._id] ||
                            isNaN(parseInt(customStockInputs[item._id]))
                          }
                          onClick={() => {
                            const val = parseInt(customStockInputs[item._id]);
                            if (!isNaN(val)) handleSetExactStock(item, val);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-lg transition"
                        >
                          Set
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetToDailyQuota(item)}
                          className="ml-auto text-[10px] font-bold text-stone-500 hover:text-stone-800 flex items-center space-x-1"
                          title="Reset to daily quota"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Daily</span>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Bottom Action Bar: Instant 86ing vs Restock */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(item)}
                      disabled={actionLoading === item._id}
                      className={`flex-1 inline-flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition shadow-sm ${
                        item.isAvailable && (!isTracked || remainingQty > 0)
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {actionLoading === item._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : item.isAvailable && (!isTracked || remainingQty > 0) ? (
                        <span>86 Item (Set Sold Out)</span>
                      ) : (
                        <span>Make In-Stock</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleInventoryMode(item)}
                      disabled={actionLoading === item._id}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition"
                      title={isTracked ? 'Switch to Unlimited Stock' : 'Switch to Portion Tracking'}
                    >
                      {isTracked ? 'Set Unlimited' : 'Track Portions'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New Category */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Create Food Category</h3>
            <p className="text-xs text-stone-500 mb-4">E.g., Starters, Main Course, Breads, Beverages, Desserts.</p>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase">Category Name</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Tandoori Breads"
                  className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase">Description (Optional)</label>
                <input
                  type="text"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Fresh from the earthen clay oven"
                  className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Menu Item */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Add New Menu Item</h3>
            <p className="text-xs text-stone-500 mb-4">Dish details, portion quotas, preparation duration, and pricing.</p>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase">Item Name</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                    placeholder="e.g., Dal Makhani"
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase">Category</label>
                  <select
                    value={itemFormData.categoryId}
                    onChange={(e) => setItemFormData({ ...itemFormData, categoryId: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase">Description</label>
                <textarea
                  rows={2}
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  placeholder="Slow-cooked black lentils simmered overnight with cream and fresh butter."
                  className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase">Price (INR)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={itemFormData.price}
                    onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                    placeholder="220"
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm font-mono focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase">Prep Time (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    value={itemFormData.prepTimeEstimateMinutes}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, prepTimeEstimateMinutes: e.target.value })
                    }
                    placeholder="15"
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm font-mono focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase">Dietary Type</label>
                  <select
                    value={itemFormData.isVeg ? 'veg' : 'nonveg'}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, isVeg: e.target.value === 'veg' })
                    }
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="veg">Vegetarian</option>
                    <option value="nonveg">Non-Veg</option>
                  </select>
                </div>
              </div>

              {/* Inventory Tracking Toggle & Portions Input */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemFormData.trackInventory}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, trackInventory: e.target.checked })
                    }
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs font-bold text-stone-800">
                    Track Daily Portions (Inventory Control)
                  </span>
                </label>

                {itemFormData.trackInventory && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600">
                        Available Portions (Initial)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={itemFormData.availableQuantity}
                        onChange={(e) =>
                          setItemFormData({ ...itemFormData, availableQuantity: e.target.value })
                        }
                        placeholder="25"
                        className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600">
                        Daily Portion Quota
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={itemFormData.dailyStockLimit}
                        onChange={(e) =>
                          setItemFormData({ ...itemFormData, dailyStockLimit: e.target.value })
                        }
                        placeholder="25"
                        className="mt-1 w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition"
                >
                  Add Item with Stock Control
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
