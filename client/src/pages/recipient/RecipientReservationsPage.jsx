import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  Building2,
  AlertTriangle,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  LoadingSpinner,
  EmptyState,
  Modal,
} from "../../components/common";
import { reservationService } from "../../services/reservationService";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";

const RecipientReservationsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [activeTab, setActiveTab] = useState("All");

  // Cancel Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const TABS = [
    "All",
    "Pending",
    "Confirmed",
    "Ready for Pickup",
    "Completed",
    "Cancelled",
  ];

  const fetchReservations = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await reservationService.getMyReservations({
        status: activeTab === "All" ? undefined : activeTab,
      });
      if (res && res.success) {
        setReservations(res.reservations || []);
      } else {
        setReservations([]);
      }
    } catch (err) {
      console.error("Failed to fetch reservations:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch reservations.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [activeTab]);

  const confirmCancel = (resData) => {
    setReservationToCancel(resData);
    setIsCancelModalOpen(true);
  };

  const handleCancelReservation = async () => {
    if (!reservationToCancel) return;
    setIsCancelling(true);
    try {
      await reservationService.cancelReservation(reservationToCancel._id);
      setIsCancelModalOpen(false);
      setReservationToCancel(null);
      fetchReservations();
    } catch (err) {
      alert("Cancel failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsCancelling(false);
    }
  };

  const canCancel = (status) => {
    const s = status.toUpperCase();
    return s === "PENDING" || s === "CONFIRMED" || s === "READY_FOR_PICKUP";
  };

  const content = (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="My Reservations"
        subtitle="Manage and track your surplus food claims."
      />

      <div className="flex overflow-x-auto pb-2 scrollbar-none gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
              activeTab === tab
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-surface-50 text-charcoal-700 hover:bg-surface-100 border-charcoal-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner size="md" text="Loading your reservations..." />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-600 font-medium text-sm">
          {error}
        </div>
      ) : reservations.length === 0 ? (
        <EmptyState
          title="No reservations found"
          message={`You have no reservations matching "${activeTab}".`}
          actionLabel={activeTab !== "All" ? "View All" : "Browse Food"}
          onAction={() =>
            activeTab !== "All" ? setActiveTab("All") : navigate("/food")
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {reservations.map((resData) => {
            const food = resData.foodId || {};
            const business = resData.businessId || {};
            const isCancelledOrExpired = ["CANCELLED", "EXPIRED"].includes(
              resData.status,
            );

            return (
              <Card
                key={resData._id}
                variant="default"
                className="flex flex-col h-full shadow-soft-sm hover:shadow-soft-md transition-shadow"
              >
                <div className="p-4 sm:p-5 flex gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-surface-100">
                    <img
                      src={
                        food.image ||
                        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80"
                      }
                      alt={food.name}
                      className={`w-full h-full object-cover ${isCancelledOrExpired ? "opacity-50 grayscale" : ""}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <Badge status={resData.status} size="sm" />
                      <span className="text-[10px] sm:text-xs font-bold text-charcoal-500 bg-surface-100 px-2 py-1 rounded-md">
                        {resData.claimCode}
                      </span>
                    </div>
                    <h3
                      className={`font-extrabold text-sm sm:text-base mb-1 truncate ${isCancelledOrExpired ? "text-charcoal-500 line-through" : "text-charcoal-900"}`}
                    >
                      {food.name || "Unknown Food Item"}
                    </h3>
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-charcoal-600">
                        <Building2 className="w-3.5 h-3.5 text-brand-600" />
                        <span className="font-semibold truncate">
                          {business.organizationName || business.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-charcoal-600">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          Reserved{" "}
                          {new Date(
                            resData.reservedAt || resData.createdAt,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-50 border-y border-charcoal-100 p-4 grid grid-cols-2 gap-4 text-center text-xs">
                  <div>
                    <span className="block text-charcoal-500 font-medium mb-0.5">
                      Quantity
                    </span>
                    <span className="font-extrabold text-charcoal-900">
                      {resData.quantity} {food.quantityUnit || "servings"}
                    </span>
                  </div>
                  <div className="border-l border-charcoal-200">
                    <span className="block text-charcoal-500 font-medium mb-0.5">
                      Total Amount
                    </span>
                    <span className="font-extrabold text-brand-700">
                      ₹{resData.totalPrice || 0}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-end">
                  <div className="flex items-center gap-2 text-xs text-charcoal-600 font-medium mb-4 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">
                      Pickup: {resData.pickupTime || "Check details"}
                    </span>
                  </div>

                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => navigate(`/reservation/${resData._id}`)}
                      iconLeft={Eye}
                    >
                      View Details
                    </Button>

                    {canCancel(resData.status) && (
                      <Button
                        variant="outline"
                        className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
                        onClick={() => confirmCancel(resData)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => !isCancelling && setIsCancelModalOpen(false)}
        title="Cancel Reservation"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-semibold leading-relaxed">
              Are you sure you want to cancel this reservation for{" "}
              <strong>{reservationToCancel?.foodId?.name}</strong>? This action
              cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isCancelling}
            >
              Keep Reservation
            </Button>
            <Button
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 border-rose-600 focus:ring-rose-500"
              onClick={handleCancelReservation}
              disabled={isCancelling}
              iconLeft={XCircle}
            >
              {isCancelling ? "Cancelling..." : "Cancel Reservation"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );

  if (currentUser) {
    return <DashboardLayout title="My Reservations">{content}</DashboardLayout>;
  }

  return content;
};

export default RecipientReservationsPage;
