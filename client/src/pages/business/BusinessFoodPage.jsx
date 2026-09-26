import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  MoreVertical,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  PageHeader,
  Input,
  Select,
  Button,
  Badge,
  Card,
  Modal,
  EmptyState,
  LoadingSpinner,
} from "../../components/common";
import { foodService } from "../../services/foodService";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";

const BusinessFoodPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [foodListings, setFoodListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Deletion Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMyFood = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await foodService.getMyFoodListings({
        status: activeTab === "All" ? undefined : activeTab,
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        search: searchQuery || undefined,
      });
      if (res && res.success) {
        setFoodListings(res.food || []);
      } else {
        setFoodListings([]);
      }
    } catch (err) {
      console.error("Failed to fetch food inventory:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch inventory.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyFood();
  }, [activeTab, selectedCategory]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMyFood();
  };

  const confirmDelete = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await foodService.deleteFood(itemToDelete._id || itemToDelete.id);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchMyFood();
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        "Failed to delete food listing: " +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const TABS = [
    "All",
    "Available",
    "Expiring Soon",
    "Almost Expired",
    "Sold Out",
    "Expired",
  ];

  const content = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Food Inventory Management"
          subtitle="View, edit, and track the status of your posted surplus food listings."
        />
        <Button
          variant="primary"
          iconLeft={Plus}
          onClick={() => navigate("/list-food")}
        >
          Post Surplus Food
        </Button>
      </div>

      <Card variant="default" className="shadow-soft-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex overflow-x-auto pb-1 scrollbar-none gap-2 w-full md:w-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                  activeTab === tab
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-surface-50 text-charcoal-700 hover:bg-surface-100 border-charcoal-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
            <Select
              className="w-full md:w-40"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: "All", label: "All Categories" },
                { value: "Prepared Meals", label: "Prepared Meals" },
                { value: "Bakery & Bread", label: "Bakery & Bread" },
                { value: "Produce", label: "Produce" },
                { value: "Packaged Goods", label: "Packaged Goods" },
              ]}
            />
            <div className="flex gap-2 flex-1 md:w-64">
              <Input
                placeholder="Search food..."
                iconLeft={Search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                type="submit"
                variant="outline"
                className="px-3"
                iconLeft={Search}
              >
                <span className="sr-only">Search</span>
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-4 border border-charcoal-100 rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 text-charcoal-500 font-bold uppercase tracking-wider border-b border-charcoal-100">
                <tr>
                  <th className="px-4 py-3">Food Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Available Qty</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Reservations</th>
                  <th className="px-4 py-3">Expiry Deadline</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-16 text-center">
                      <LoadingSpinner size="md" text="Loading inventory..." />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-4 py-8 text-center text-rose-600 font-medium"
                    >
                      {error}
                    </td>
                  </tr>
                ) : foodListings.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12">
                      <EmptyState
                        title="No inventory found"
                        message="You haven't posted any food listings matching these filters."
                        actionLabel="Clear Filters"
                        onAction={() => {
                          setActiveTab("All");
                          setSelectedCategory("All");
                          setSearchQuery("");
                          fetchMyFood();
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  foodListings.map((item) => {
                    const isExpired = item.status === "EXPIRED";
                    const isSoldOut = item.status === "SOLD_OUT";

                    return (
                      <tr
                        key={item._id || item.id}
                        className="hover:bg-surface-50 transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                item.image ||
                                "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80"
                              }
                              alt={item.name}
                              className={`w-10 h-10 rounded-lg object-cover ${isExpired || isSoldOut ? "opacity-50 grayscale" : ""}`}
                            />
                            <div>
                              <p
                                className={`font-extrabold text-sm ${isExpired || isSoldOut ? "text-charcoal-500 line-through" : "text-charcoal-900"}`}
                              >
                                {item.name}
                              </p>
                              <p className="text-[10px] text-charcoal-500 font-medium truncate max-w-[150px]">
                                {item.description || "No description provided."}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-charcoal-700">
                          {item.category || "Surplus Food"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-black text-sm ${item.quantity <= 0 ? "text-rose-600" : "text-brand-700"}`}
                          >
                            {item.quantity}
                          </span>
                          <span className="text-[10px] text-charcoal-500 block">
                            {item.quantityUnit || "servings"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge status={item.status} size="sm" showDot />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-charcoal-800 bg-charcoal-100 px-2 py-0.5 rounded-full">
                            {item.reservationCount || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-charcoal-600 font-medium">
                            <Clock
                              className={`w-3.5 h-3.5 ${isExpired ? "text-rose-500" : "text-amber-600"}`}
                            />
                            {item.expiryTime
                              ? new Date(item.expiryTime).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() =>
                                navigate(`/food/${item._id || item.id}`)
                              }
                              className="p-1.5 text-charcoal-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                              title="View Public Listing"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                navigate("/list-food", {
                                  state: { editFood: item },
                                })
                              }
                              className="p-1.5 text-charcoal-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Listing"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmDelete(item)}
                              className="p-1.5 text-charcoal-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Listing"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Delete Food Listing"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-semibold leading-relaxed">
              Are you sure you want to delete{" "}
              <strong>"{itemToDelete?.name}"</strong>? This action cannot be
              undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 border-rose-600 focus:ring-rose-500"
              onClick={handleDelete}
              disabled={isDeleting}
              iconLeft={Trash2}
            >
              {isDeleting ? "Deleting..." : "Delete Listing"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );

  if (currentUser) {
    return <DashboardLayout title="Food Inventory Management">{content}</DashboardLayout>;
  }

  return content;
};

export default BusinessFoodPage;
