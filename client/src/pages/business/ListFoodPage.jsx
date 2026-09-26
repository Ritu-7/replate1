import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Utensils,
  Clock,
  MapPin,
  DollarSign,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Send,
  Sparkles,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Input,
  Select,
  Button,
  Modal,
  ImageUploader,
} from "../../components/common";
import { foodService } from "../../services/foodService";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";

const ListFoodPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const editFood = location.state?.editFood;

  // Form State
  const [formData, setFormData] = useState({
    foodName: editFood?.name || "",
    category: editFood?.category || "Prepared Meals",
    quantity: editFood?.quantity || "",
    prepTime: "",
    expiryTime: editFood?.expiryTime
      ? new Date(editFood.expiryTime).toISOString().slice(0, 16)
      : "",
    price: editFood?.price || "",
    originalPrice: editFood?.originalPrice || "",
    location: editFood?.pickupLocation?.address || "Noida Sector 62",
    coordinates: editFood?.pickupLocation?.coordinates || null,
    description: editFood?.description || "",
    image: editFood?.image || "",
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Auto-calculated discount percentage
  const discountPercent =
    formData.originalPrice &&
    formData.price &&
    parseFloat(formData.originalPrice) > 0
      ? Math.round(
          ((parseFloat(formData.originalPrice) - parseFloat(formData.price)) /
            parseFloat(formData.originalPrice)) *
            100,
        )
      : null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setFormData((prev) => ({ ...prev, coordinates: { lat, lng } }));
          
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            if (data && data.display_name) {
              setFormData((prev) => ({ ...prev, location: data.display_name, coordinates: { lat, lng } }));
            }
          } catch (error) {
            console.error("Geocoding failed", error);
          }
        },
        (error) => alert("Please allow location access to use this feature.")
      );
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.foodName.trim()) newErrors.foodName = "Food name is required";
    if (!formData.quantity || parseFloat(formData.quantity) <= 0)
      newErrors.quantity = "Enter a valid quantity (at least 1 serving)";
    if (!formData.expiryTime.trim())
      newErrors.expiryTime = "Expiry/Use-by time is required";
    if (!formData.price || parseFloat(formData.price) < 0)
      newErrors.price = "Enter a valid recovery price";
    if (!formData.originalPrice || parseFloat(formData.originalPrice) <= 0)
      newErrors.originalPrice = "Original value is required";
    if (!formData.location.trim())
      newErrors.location = "Pickup location is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiError("");
    try {
      let hours = 3;
      // Use exact datetime if in edit mode or parsing a specific datetime-local string
      const isDateString =
        formData.expiryTime.includes("T") || formData.expiryTime.includes("-");
      if (!isDateString) {
        const match = formData.expiryTime.match(/(\d+)/);
        if (match) {
          hours = parseInt(match[1], 10) || 3;
        }
      }

      const payload = {
        name: formData.foodName,
        category: formData.category,
        quantity: Number(formData.quantity) || 1,
        quantityUnit: "servings",
        price: Number(formData.price),
        originalPrice: formData.originalPrice
          ? Number(formData.originalPrice)
          : undefined,
        pickupLocation: { 
          address: formData.location, 
          city: "Noida",
          coordinates: formData.coordinates || { lat: 28.5355, lng: 77.3910 }
        },
        description: formData.description,
        image: formData.image,
      };

      if (isDateString) {
        payload.expiryTime = new Date(formData.expiryTime).toISOString();
      } else {
        payload.expiryHours = hours;
      }

      if (editFood) {
        const res = await foodService.updateFood(
          editFood._id || editFood.id,
          payload,
        );
        if (res && res.success) {
          setIsSuccessModalOpen(true);
        } else {
          setApiError(res?.message || "Failed to update food listing");
        }
      } else {
        const res = await foodService.createFood(payload);
        if (res && res.success) {
          setIsSuccessModalOpen(true);
        } else {
          setApiError(res?.message || "Failed to publish food listing");
        }
      }
    } catch (err) {
      console.error("Failed to save surplus food:", err);
      setApiError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save food listing",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <PageHeader
        title={
          editFood ? "Edit Surplus Food Listing" : "Post Surplus Food Listing"
        }
        subtitle={
          editFood
            ? "Update details for your existing surplus food listing."
            : "List excess prepared food, bakery items, or catering surplus for rapid recovery by verified recipient NGOs in Noida / Delhi NCR."
        }
      />

      <Card variant="default" className="shadow-soft-md">
        {apiError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Info */}
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-brand-700 mb-4 flex items-center gap-1.5">
              <Utensils className="w-4 h-4" /> Food & Category Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Food Name / Title"
                name="foodName"
                placeholder="e.g. Fresh Paneer Rice Bowl Set"
                value={formData.foodName}
                onChange={handleChange}
                error={errors.foodName}
                required
              />

              <Select
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                options={[
                  {
                    value: "Prepared Meals",
                    label: "Prepared Meals (Buffet / Thalis)",
                  },
                  { value: "Bakery & Pastries", label: "Bakery & Pastries" },
                  {
                    value: "Catering Surplus",
                    label: "Catering Event Surplus",
                  },
                  {
                    value: "Groceries & Produce",
                    label: "Groceries & Raw Produce",
                  },
                ]}
              />
            </div>
          </div>

          {/* Section 2: Quantity & Timing */}
          <div className="pt-4 border-t border-charcoal-100">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-brand-700 mb-4 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Quantity & Pickup Schedule
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Quantity Available (Meals/Boxes)"
                name="quantity"
                type="number"
                placeholder="e.g. 15"
                value={formData.quantity}
                onChange={handleChange}
                error={errors.quantity}
                required
              />

              <Input
                label="Preparation Time"
                name="prepTime"
                placeholder="e.g. 2:00 PM Today"
                value={formData.prepTime}
                onChange={handleChange}
              />

              <Input
                label="Pickup Deadline / Expiry"
                name="expiryTime"
                placeholder="e.g. 8:30 PM Today"
                value={formData.expiryTime}
                onChange={handleChange}
                error={errors.expiryTime}
                required
              />
            </div>
          </div>

          {/* Section 3: Pricing & Location */}
          <div className="pt-4 border-t border-charcoal-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-brand-700 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" /> Pricing & Pickup Location
              </h3>
              {discountPercent !== null && discountPercent > 0 && (
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800">
                  Calculated Discount: {discountPercent}% OFF
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Original Estimated Value (₹)"
                name="originalPrice"
                type="number"
                placeholder="e.g. 180"
                value={formData.originalPrice}
                onChange={handleChange}
                error={errors.originalPrice}
                required
              />

              <Input
                label="Recovery Price (₹)"
                name="price"
                type="number"
                placeholder="e.g. 79"
                value={formData.price}
                onChange={handleChange}
                error={errors.price}
                helperText="Enter 0 for free donation"
                required
              />

              <div className="relative">
                <Input
                  label="Pickup Location"
                  name="location"
                  placeholder="e.g. Noida Sector 62"
                  iconLeft={MapPin}
                  value={formData.location}
                  onChange={handleChange}
                  error={errors.location}
                  required
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="absolute right-0 top-0 mt-1 mr-1 text-[10px] bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold py-1 px-2 rounded"
                >
                  📍 Use GPS
                </button>
                {formData.coordinates && (
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold">
                    GPS Coordinates linked
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Description & Image Upload UI Mockup */}
          <div className="pt-4 border-t border-charcoal-100 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal-800 mb-1.5">
                Description & Dietary Information
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder="Describe packaging, ingredients, dietary notes (e.g. Vegetarian, Paneer, Rice, packaging in foil boxes)..."
                value={formData.description}
                onChange={handleChange}
                className="w-full rounded-xl border border-charcoal-200 p-3 text-sm focus:border-brand-600 focus:ring-brand-500/20 focus:outline-none"
              />
            </div>

            {/* Image Upload UI Drag-and-Drop Mockup */}
            <div>
              <label className="block text-sm font-semibold text-charcoal-800 mb-1.5">
                Food Image Upload
              </label>
              <ImageUploader
                currentImage={formData.image}
                onUploadSuccess={(url) =>
                  setFormData((prev) => ({ ...prev, image: url }))
                }
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-charcoal-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/business/dashboard")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              iconRight={Send}
            >
              Publish Listing
            </Button>
          </div>
        </form>
      </Card>

      {/* Post Success Modal Mockup */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title={
          editFood
            ? "Listing Updated Successfully!"
            : "Listing Published Successfully!"
        }
        subtitle={
          editFood
            ? "Your food surplus details have been updated."
            : "Your food surplus is now live on the RePlate Marketplace."
        }
        footer={
          <>
            <Button variant="outline" onClick={() => navigate("/food")}>
              View Marketplace Directory
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                navigate(editFood ? "/business/food" : "/business/dashboard")
              }
            >
              Go to {editFood ? "Food Inventory" : "Business Dashboard"}
            </Button>
          </>
        }
      >
        <div className="text-center py-4 space-y-3">
          <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className="text-base font-extrabold text-charcoal-900">
            {formData.foodName}
          </p>
          <p className="text-xs text-charcoal-600">
            {formData.quantity} servings listed at ₹{formData.price} each.
          </p>

          <div className="p-3 bg-surface-50 border border-charcoal-100 rounded-xl text-xs text-charcoal-700">
            <Sparkles className="w-4 h-4 text-brand-600 inline mr-1" />
            Verified recipient NGOs within 5km of {formData.location} are being
            notified in real-time.
          </div>
        </div>
      </Modal>
    </div>
  );

  if (currentUser) {
    return <DashboardLayout title={editFood ? "Edit Surplus Food Listing" : "Post Surplus Food Listing"}>{content}</DashboardLayout>;
  }

  return content;
};

export default ListFoodPage;
