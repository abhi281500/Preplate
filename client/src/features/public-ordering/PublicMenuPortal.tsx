import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Utensils,
  Clock,
  MapPin,
  Phone,
  Search,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Plus,
  Minus,
  ShoppingBag
} from 'lucide-react';
import api from '../../shared/api';
import { CartProvider, useCart } from './CartContext';
import { CartDrawer } from './CartDrawer';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  isVeg: boolean;
  prepTimeEstimateMinutes: number;
  isAvailable: boolean;
  trackInventory?: boolean;
  availableQuantity?: number;
  imageUrl?: string;
}

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
}

interface RestaurantProfile {
  name: string;
  slug: string;
  tagline?: string;
  contactPhone: string;
  whatsappNumber: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  settings: {
    orderBufferMinutes: number;
    currency: string;
    allowPayAtRestaurant: boolean;
    minimumOrderAmount: number;
    upiId?: string;
  };
  isOpenNow: boolean;
  todaySchedule?: {
    openTime: string;
    closeTime: string;
    isOpen: boolean;
  };
}

const MenuContent: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dietaryFilter, setDietaryFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { items: cartItems, addItem, updateQuantity, subtotal, totalCount, setIsDrawerOpen } = useCart();

  useEffect(() => {
    const fetchRestaurantAndMenu = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [profileRes, menuRes] = await Promise.all([
          api.get(`/public/restaurants/${slug}`),
          api.get(`/public/restaurants/${slug}/menu`)
        ]);

        setRestaurant(profileRes.data.data);
        setCategories(menuRes.data.data.categories);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load restaurant menu.');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchRestaurantAndMenu();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-stone-600">Loading fresh menu...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900">Restaurant Not Found</h1>
        <p className="text-stone-600 mt-2 max-w-md text-sm">{error || 'This restaurant link is inactive or invalid.'}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center text-sm font-bold text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Preplate Directory
        </Link>
      </div>
    );
  }

  // Filter items based on category, search query, and dietary selection
  const filteredCategories = categories
    .map((cat) => {
      const items = cat.items.filter((item) => {
        const matchesCategory = selectedCategoryId === 'all' || cat.id === selectedCategoryId;
        const matchesSearch =
          searchQuery === '' ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesDietary =
          dietaryFilter === 'ALL' ||
          (dietaryFilter === 'VEG' && item.isVeg) ||
          (dietaryFilter === 'NON_VEG' && !item.isVeg);

        return matchesCategory && matchesSearch && matchesDietary;
      });

      return {
        ...cat,
        items
      };
    })
    .filter((cat) => cat.items.length > 0);

  const totalFilteredItems = filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0);

  return (
    <div className="min-h-screen bg-stone-50 pb-24 selection:bg-brand-500 selection:text-white relative">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Preplate Directory
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-stone-900 tracking-tight">{restaurant.name}</span>
            {restaurant.isOpenNow ? (
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                Open Now
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                Closed
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Restaurant Hero Profile */}
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
                <Utensils className="w-3.5 h-3.5" />
                <span>Pre-Arrival Ordering</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                {restaurant.name}
              </h1>
              {restaurant.tagline && (
                <p className="mt-1 text-sm text-stone-600">{restaurant.tagline}</p>
              )}

              {/* Location & Hours Meta */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                {restaurant.address?.city && (
                  <span className="inline-flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-stone-400" />
                    {restaurant.address.street ? `${restaurant.address.street}, ` : ''}{restaurant.address.city}
                  </span>
                )}
                {restaurant.todaySchedule && (
                  <span className="inline-flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-stone-400" />
                    Today: {restaurant.todaySchedule.openTime} – {restaurant.todaySchedule.closeTime}
                  </span>
                )}
                <span className="inline-flex items-center font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                  ⏱️ Min. prep buffer: {restaurant.settings.orderBufferMinutes} mins
                </span>
              </div>
            </div>

            {/* Quick WhatsApp Contact */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0">
              <a
                href={`https://wa.me/${restaurant.whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition shadow-sm"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Contact Restaurant</span>
              </a>
              {restaurant.contactPhone && (
                <a
                  href={`tel:${restaurant.contactPhone}`}
                  className="inline-flex items-center space-x-1 text-xs text-stone-500 hover:text-stone-800"
                >
                  <Phone className="w-3 h-3" />
                  <span>{restaurant.contactPhone}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Search & Filter Controls */}
      <section className="sticky top-14 z-30 bg-stone-50/95 backdrop-blur-md border-b border-stone-200 py-3">
        <div className="max-w-4xl mx-auto px-4 space-y-3">
          {/* Search Bar & Dietary Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food items, gravies, desserts..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-stone-400 hover:text-stone-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Dietary Buttons */}
            <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-stone-200 shadow-sm self-start sm:self-auto">
              <button
                onClick={() => setDietaryFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  dietaryFilter === 'ALL'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Items
              </button>
              <button
                onClick={() => setDietaryFilter('VEG')}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  dietaryFilter === 'VEG'
                    ? 'bg-emerald-600 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5"></span> Veg Only
              </button>
              <button
                onClick={() => setDietaryFilter('NON_VEG')}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  dietaryFilter === 'NON_VEG'
                    ? 'bg-rose-600 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400 mr-1.5"></span> Non-Veg
              </button>
            </div>
          </div>

          {/* Category Pills Navigation */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition ${
                selectedCategoryId === 'all'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition ${
                  selectedCategoryId === cat.id
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {cat.name} ({cat.items.length})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Categories & Items List */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-10">
        {totalFilteredItems === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
            <Utensils className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-900">No food items matched</h3>
            <p className="text-xs text-stone-500 mt-1">Try clearing your search query or dietary filter.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setDietaryFilter('ALL');
                setSelectedCategoryId('all');
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} className="space-y-4">
              <div className="border-b border-stone-200 pb-2">
                <h2 className="text-lg font-extrabold text-stone-900 tracking-tight">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="text-xs text-stone-500 mt-0.5">{category.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.items.map((item) => {
                  const cartItem = cartItems.find((i) => i.id === item.id);
                  const inCartQuantity = cartItem ? cartItem.quantity : 0;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl border transition overflow-hidden flex flex-col justify-between p-4 shadow-sm ${
                        item.isAvailable
                          ? 'border-stone-200 hover:border-brand-300 hover:shadow-md'
                          : 'border-stone-200/70 bg-stone-50/50 opacity-75'
                      }`}
                    >
                      <div>
                        {/* Dietary Tag & Sold Out Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase ${
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
                            {item.isVeg ? 'Vegetarian' : 'Non-Veg'}
                          </span>

                          {!item.isAvailable && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                              Sold Out
                            </span>
                          )}
                          {item.isAvailable && item.trackInventory && (item.availableQuantity ?? 0) <= 5 && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                              Only {item.availableQuantity} Left!
                            </span>
                          )}
                        </div>

                        {/* Item Name & Description */}
                        <h3 className="text-base font-bold text-stone-900 leading-snug">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Price, Prep Time, & Cart Action */}
                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          <span className="text-lg font-extrabold text-stone-900">
                            ₹{item.price}
                          </span>
                          <div className="flex items-center text-[10px] text-stone-400 mt-0.5">
                            <Clock className="w-3 h-3 mr-1 text-stone-400" />
                            <span>~{item.prepTimeEstimateMinutes}m prep</span>
                          </div>
                        </div>

                        {item.isAvailable ? (
                          inCartQuantity > 0 ? (
                            <div className="flex items-center space-x-2 bg-stone-100 rounded-xl p-1 border border-stone-200">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    inCartQuantity - 1,
                                    item.trackInventory ? item.availableQuantity : undefined
                                  )
                                }
                                className="p-1 rounded-lg text-stone-700 hover:bg-white transition"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-5 text-center font-bold text-xs text-stone-900">
                                {inCartQuantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    inCartQuantity + 1,
                                    item.trackInventory ? item.availableQuantity : undefined
                                  )
                                }
                                className="p-1 rounded-lg text-stone-700 hover:bg-white transition"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200 shadow-sm transition active:scale-95"
                              onClick={() =>
                                addItem({
                                  ...item,
                                  maxAvailable: item.trackInventory ? item.availableQuantity : undefined
                                })
                              }
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          )
                        ) : (
                          <span className="text-xs font-semibold text-stone-400 cursor-not-allowed">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-gradient-to-t from-stone-900/40 via-stone-900/10 to-transparent pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="w-full py-3 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-xl shadow-brand-600/40 flex items-center justify-between transition transform active:scale-98"
            >
              <div className="flex items-center space-x-2 text-left">
                <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-xs">
                  {totalCount}
                </span>
                <span className="text-sm font-extrabold">₹{subtotal} Subtotal</span>
              </div>
              <div className="flex items-center space-x-1 text-xs font-bold">
                <span>View Cart & Set Arrival</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        slug={slug!}
        orderBufferMinutes={restaurant.settings.orderBufferMinutes}
        minimumOrderAmount={restaurant.settings.minimumOrderAmount}
      />
    </div>
  );
};

export const PublicMenuPortal: React.FC = () => {
  return (
    <CartProvider>
      <MenuContent />
    </CartProvider>
  );
};
