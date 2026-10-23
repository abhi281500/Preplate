import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  FolderPlus,
  Loader2,
  Search,
  Filter
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
    prepTimeEstimateMinutes: '15'
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
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1-Click Availability Toggle (86ing)
  const handleToggleAvailability = async (item: MenuItem) => {
    const nextState = !item.isAvailable;
    setActionLoading(item._id);
    try {
      await api.patch(`/restaurant/menu-items/${item._id}/availability`, {
        isAvailable: nextState
      });
      setMenuItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, isAvailable: nextState } : i))
      );
      triggerToast(`Item '${item.name}' marked ${nextState ? 'In Stock' : 'Sold Out'}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update item availability');
    } finally {
      setActionLoading(null);
    }
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
        prepTimeEstimateMinutes: Number(itemFormData.prepTimeEstimateMinutes) || 15
      });

      setMenuItems((prev) => [...prev, res.data.data]);
      setShowItemModal(false);
      setItemFormData({
        name: '',
        categoryId: '',
        description: '',
        price: '',
        isVeg: true,
        prepTimeEstimateMinutes: '15'
      });
      // Refresh categories to update item count
      fetchData();
      triggerToast(`Item '${res.data.data.name}' added to menu`);
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
        <p className="text-sm font-semibold text-stone-600">Loading restaurant menu...</p>
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

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Menu & Inventory Manager</h2>
          <p className="text-xs text-stone-500">
            Create categories, edit items, and toggle sold-out availability with 1-click &ldquo;86ing&rdquo;.
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
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            selectedCategoryId === 'all'
              ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
              : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          All Items ({menuItems.length})
        </button>

        {categories.map((cat) => (
          <div key={cat._id} className="flex items-center">
            <button
              onClick={() => setSelectedCategoryId(cat._id)}
              className={`px-3.5 py-2 rounded-l-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategoryId === cat._id
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {cat.name} ({cat.itemCount ?? 0})
            </button>
            <button
              onClick={() => handleDeleteCategory(cat)}
              title="Delete Category"
              className={`px-2 py-2 rounded-r-xl text-xs border-y border-r transition ${
                selectedCategoryId === cat._id
                  ? 'bg-brand-700 text-white border-brand-700 hover:bg-brand-800'
                  : 'bg-white text-stone-400 hover:text-red-600 border-stone-200 hover:bg-red-50'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Items Grid with 1-Click 86ing */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
          <Utensils className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-900">No items found in this category</h3>
          <p className="text-xs text-stone-500 mt-1">Click &ldquo;Add Menu Item&rdquo; to add your first dish.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item._id}
              className={`bg-white rounded-2xl border p-4 shadow-sm transition flex flex-col justify-between ${
                item.isAvailable
                  ? 'border-stone-200 hover:border-brand-300'
                  : 'border-red-200 bg-red-50/20'
              }`}
            >
              <div>
                {/* Header Tag & Delete */}
                <div className="flex items-center justify-between mb-2">
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
                    ></span>
                    {item.isVeg ? 'Veg' : 'Non-Veg'}
                  </span>

                  <button
                    onClick={() => handleDeleteItem(item._id, item.name)}
                    className="text-stone-400 hover:text-red-600 p-1 transition"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-stone-900 leading-snug">{item.name}</h3>
                {item.description && (
                  <p className="mt-1 text-xs text-stone-500 line-clamp-2">{item.description}</p>
                )}

                <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                  <span className="text-base font-extrabold text-stone-900">₹{item.price}</span>
                  <span className="flex items-center text-stone-400">
                    <Clock className="w-3.5 h-3.5 mr-1" /> ~{item.prepTimeEstimateMinutes}m prep
                  </span>
                </div>
              </div>

              {/* Instant 1-Click Availability Switch */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Kitchen Availability
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      item.isAvailable ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {item.isAvailable ? 'In Stock (Accepting)' : 'Sold Out (86’d)'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleAvailability(item)}
                  disabled={actionLoading === item._id}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                    item.isAvailable
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                  }`}
                >
                  {actionLoading === item._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : item.isAvailable ? (
                    <span>86 Item (Sold Out)</span>
                  ) : (
                    <span>Make Available</span>
                  )}
                </button>
              </div>
            </div>
          ))}
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
            <p className="text-xs text-stone-500 mb-4">Dish details, realistic preparation duration, and pricing.</p>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase">Item Name</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                    placeholder="Paneer Tikka"
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase">Category</label>
                  <select
                    required
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
                  placeholder="Ingredients, spice level, serving style..."
                  className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase">Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={itemFormData.price}
                    onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                    placeholder="240"
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase">Prep Time (Mins)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={itemFormData.prepTimeEstimateMinutes}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, prepTimeEstimateMinutes: e.target.value })
                    }
                    placeholder="15"
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase">Dietary Type</label>
                  <select
                    value={itemFormData.isVeg ? 'VEG' : 'NON_VEG'}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, isVeg: e.target.value === 'VEG' })
                    }
                    className="mt-1 w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="VEG">Vegetarian</option>
                    <option value="NON_VEG">Non-Veg</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100">
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
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
