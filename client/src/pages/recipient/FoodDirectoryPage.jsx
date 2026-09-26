import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  RotateCcw,
  Utensils,
  MapPin,
  DollarSign,
  Clock,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  RefreshCw,
} from "lucide-react";
import {
  PageHeader,
  Input,
  Select,
  Button,
  EmptyState,
  LoadingSpinner,
  ErrorState,
} from "../../components/common";
import FoodCard from "../../components/food/FoodCard";
import FoodMap from "../../components/food/FoodMap";
import { foodService } from "../../services/foodService";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";

const CATEGORIES = [
  "All Categories",
  "Prepared Meals",
  "Rice & Biryani",
  "Bakery & Pastries",
  "Snacks",
  "Desserts",
  "Beverages",
  "Other",
];

const PRICE_OPTIONS = [
  { value: "all", label: "Any Price" },
  { value: "50", label: "Under ₹50" },
  { value: "100", label: "Under ₹100" },
  { value: "150", label: "Under ₹150" },
  { value: "200", label: "Under ₹200" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "AVAILABLE", label: "Available" },
  { value: "EXPIRING_SOON", label: "Expiring Soon" },
  { value: "ALMOST_EXPIRED", label: "Almost Expired" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "expiring_soon", label: "Expiring Soon" },
];

const FoodDirectoryPage = () => {
  const { currentUser } = useAuth();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSort, setSelectedSort] = useState("newest");

  // Mobile Filter Drawer State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Debounce search term by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch foods from real API endpoint GET /api/food
  const fetchFoodListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedCategory !== "All Categories")
        params.category = selectedCategory;
      if (selectedStatus !== "all") params.status = selectedStatus;
      if (selectedPrice !== "all") params.maxPrice = selectedPrice;

      const data = await foodService.getFoods(params);

      let items = [];
      if (data) {
        items = data.food || data.foods || [];
      }
      setFoods(items);
    } catch (err) {
      console.error("Failed to load marketplace listings:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load surplus food listings.",
      );
    }
    fontinally: {
      setLoading(false);
    }
  };

  // Re-fetch when debounced search or server filters change
  useEffect(() => {
    fetchFoodListings();
  }, [debouncedSearch, selectedCategory, selectedStatus, selectedPrice]);

  // Frontend Sorting Logic
  const sortedFoods = useMemo(() => {
    const list = [...foods];
    switch (selectedSort) {
      case "price_low":
        return list.sort((a, b) => (a.price || 0) - (b.price || 0));
      case "price_high":
        return list.sort((a, b) => (b.price || 0) - (a.price || 0));
      case "expiring_soon":
        return list.sort(
          (a, b) => new Date(a.expiryTime || 0) - new Date(b.expiryTime || 0),
        );
      case "newest":
      default:
        return list.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        );
    }
  }, [foods, selectedSort]);

  // Reset all active filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedCategory("All Categories");
    setSelectedPrice("all");
    setSelectedStatus("all");
    setSelectedSort("newest");
  };

  const isFiltered =
    searchTerm !== "" ||
    selectedCategory !== "All Categories" ||
    selectedPrice !== "all" ||
    selectedStatus !== "all";

  const content = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Page Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <PageHeader
            title="Food Surplus Marketplace"
            subtitle="Discover fresh surplus meals, bakery boxes, and catering dishes posted by verified commercial partners in Noida & NCR."
          />
        </div>

        {/* Location Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold shrink-0 self-start md:self-auto">
          <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
          <span>Nearby • Noida & NCR Region</span>
        </div>
      </div>

      {/* Main Search & Filter Control Bar Card */}
      <div className="bg-white rounded-3xl p-5 border border-charcoal-100 shadow-soft-sm space-y-4">
        {/* Search Bar Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Input
            placeholder="Search by food title, restaurant, or area (e.g. Paneer, Hotel, Sector 62)..."
            iconLeft={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            containerClassName="flex-1 w-full"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              size="md"
              iconLeft={SlidersHorizontal}
              onClick={() => setIsMobileFilterOpen(true)}
              className="sm:hidden flex-1"
            >
              Filters
            </Button>

            {isFiltered && (
              <Button
                variant="outline"
                size="md"
                iconLeft={RotateCcw}
                onClick={handleResetFilters}
                className="shrink-0"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-t border-charcoal-100 pt-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                selectedCategory === cat
                  ? "bg-brand-600 text-white shadow-soft-xs"
                  : "bg-surface-100 text-charcoal-700 hover:bg-surface-200 hover:text-charcoal-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Desktop Filter & Sort Row */}
        <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-charcoal-100">
          <Select
            iconLeft={Clock}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={STATUS_OPTIONS}
          />
          <Select
            iconLeft={DollarSign}
            value={selectedPrice}
            onChange={(e) => setSelectedPrice(e.target.value)}
            options={PRICE_OPTIONS}
          />
          <Select
            iconLeft={ArrowUpDown}
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
            options={SORT_OPTIONS}
          />
        </div>
      </div>

      {/* Directory Status Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm font-bold text-charcoal-700">
          Showing{" "}
          <span className="text-brand-700 font-extrabold">
            {sortedFoods.length}
          </span>{" "}
          surplus food listing{sortedFoods.length !== 1 ? "s" : ""} available
          nearby
        </p>
      </div>

      {/* Main Grid View / Loading / Empty / Error */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center min-h-[40vh]">
          <LoadingSpinner size="lg" text="Finding surplus food near you..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to load surplus food"
          message={error}
          onRetry={fetchFoodListings}
        />
      ) : sortedFoods.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No surplus food available right now"
          description={
            isFiltered
              ? "No items match your active search or filter preferences. Try clearing your search parameters."
              : "There are currently no active surplus listings posted by partner kitchens."
          }
          actionLabel={isFiltered ? "Clear Filters" : "Refresh Directory"}
          onAction={isFiltered ? handleResetFilters : fetchFoodListings}
          className="py-16"
        />
      ) : (
        <div className="flex flex-col-reverse lg:flex-row gap-6 relative">
          {/* Scrollable Listings Column */}
          <div className="w-full lg:w-3/5 xl:w-2/3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {sortedFoods.map((food) => (
                <FoodCard key={food._id || food.id} food={food} />
              ))}
            </div>
          </div>
          
          {/* Sticky Map Column */}
          <div className="w-full lg:w-2/5 xl:w-1/3 lg:sticky lg:top-24 h-[400px] lg:h-[calc(100vh-140px)] rounded-2xl overflow-hidden shadow-soft-lg border border-charcoal-200 hover-3d-mild transition-all duration-300 relative z-10">
            <FoodMap foods={sortedFoods} />
          </div>
        </div>
      )}

      {/* Mobile Filter Drawer / Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex">
          <div
            className="fixed inset-0 bg-charcoal-950/40 backdrop-blur-xs"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="relative w-full max-w-xs bg-white h-full shadow-soft-xl flex flex-col z-10 ml-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-charcoal-100 pb-4">
              <h3 className="font-extrabold text-charcoal-900 text-base">
                Filter Surplus Food
              </h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 text-charcoal-500 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-charcoal-700 block mb-1.5">
                  Category:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs p-2.5 border border-charcoal-200 rounded-xl"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-charcoal-700 block mb-1.5">
                  Status:
                </label>
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  options={STATUS_OPTIONS}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-charcoal-700 block mb-1.5">
                  Max Price:
                </label>
                <Select
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value)}
                  options={PRICE_OPTIONS}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-charcoal-700 block mb-1.5">
                  Sort Order:
                </label>
                <Select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  options={SORT_OPTIONS}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-charcoal-100 flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  handleResetFilters();
                  setIsMobileFilterOpen(false);
                }}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => setIsMobileFilterOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (currentUser) {
    return <DashboardLayout title="Food Surplus Marketplace">{content}</DashboardLayout>;
  }

  return content;
};

export default FoodDirectoryPage;
