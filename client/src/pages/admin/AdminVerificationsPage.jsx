import React, { useState, useEffect } from "react";
import { ShieldCheck, XCircle, AlertCircle, RefreshCw, Wrench } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Card,
  Badge,
  Button,
  LoadingSpinner,
  EmptyState,
} from "../../components/common";
import { adminService } from "../../services/adminService";

const AdminVerificationsPage = () => {
  const [businesses, setBusinesses] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [rejectLoadingId, setRejectLoadingId] = useState(null);
  const [repairLoading, setRepairLoading] = useState(false);

  const fetchPendingQueue = async () => {
    setLoading(true);
    try {
      const [busData, recData] = await Promise.all([
        adminService.getAllBusinesses(),
        adminService.getAllRecipients(),
      ]);
      // Filter only unverified
      setBusinesses((busData?.businesses || []).filter((b) => !b.isVerified));
      setRecipients((recData?.recipients || []).filter((r) => !r.isVerified));
    } catch (err) {
      console.error("Failed to fetch pending queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingQueue();
  }, []);

  const handleVerify = async (id, type) => {
    setActionLoadingId(id);
    try {
      if (type === "business") {
        await adminService.verifyBusiness(id, true);
        setBusinesses((prev) => prev.filter((b) => b._id !== id));
      } else {
        await adminService.verifyRecipient(id, true);
        setRecipients((prev) => prev.filter((r) => r._id !== id));
      }
    } catch (err) {
      alert(
        "Verification failed: " + (err.response?.data?.message || err.message),
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id, type) => {
    if (
      !window.confirm(
        `Are you sure you want to completely reject and delete this ${type} application?`,
      )
    )
      return;

    setRejectLoadingId(id);
    try {
      if (type === "business") {
        await adminService.rejectBusiness(id);
        setBusinesses((prev) => prev.filter((b) => b._id !== id));
      } else {
        await adminService.rejectRecipient(id);
        setRecipients((prev) => prev.filter((r) => r._id !== id));
      }
    } catch (err) {
      alert(
        "Rejection failed: " + (err.response?.data?.message || err.message),
      );
    } finally {
      setRejectLoadingId(null);
    }
  };

  const handleRepair = async () => {
    if (!window.confirm("This will scan all users and create any missing profile documents (BusinessProfile / RecipientProfile). Stale profiles for the wrong role will be removed. Continue?")) return;
    setRepairLoading(true);
    try {
      const result = await adminService.repairQueues();
      alert(`Repair complete: ${result.message}\n${result.report.fixed.map(f => `• ${f.email}: ${f.action}`).join("\n") || "Nothing needed fixing."}`);
      await fetchPendingQueue();
    } catch (err) {
      alert("Repair failed: " + (err.response?.data?.message || err.message));
    } finally {
      setRepairLoading(false);
    }
  };

  const totalPending = businesses.length + recipients.length;

  return (
    <DashboardLayout title="Verification Queue">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-soft-sm border border-charcoal-100">
          <div>
            <h2 className="text-lg font-black text-charcoal-900">
              Pending Approvals
            </h2>
            <p className="text-xs text-charcoal-500 font-medium">
              Review and verify new organizations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">
              {totalPending} Awaiting Review
            </span>
            <Button
              variant="outline"
              size="sm"
              iconLeft={RefreshCw}
              onClick={fetchPendingQueue}
              disabled={loading || repairLoading}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconLeft={Wrench}
              onClick={handleRepair}
              disabled={loading || repairLoading}
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              {repairLoading ? "Repairing..." : "Repair Queue"}
            </Button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner size="lg" message="Loading pending queue..." />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Businesses Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-charcoal-900 border-b border-charcoal-100 pb-2">
                Businesses & Restaurants ({businesses.length})
              </h3>
              {businesses.map((bus) => (
                <Card
                  key={bus._id}
                  variant="default"
                  className="hover:border-brand-300 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-extrabold text-charcoal-900">
                        {bus.businessName}
                      </h4>
                      <p className="text-xs font-semibold text-charcoal-500 mt-1">
                        {bus.businessType} • {bus.city}, {bus.state}
                      </p>
                      <p className="text-xs text-charcoal-600 mt-2 line-clamp-2">
                        {bus.address}
                      </p>

                      <div className="mt-3 flex gap-2">
                        {bus.fssaiLicense && (
                          <Badge
                            variant="outline"
                            size="sm"
                            className="bg-surface-50"
                          >
                            FSSAI: {bus.fssaiLicense}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          size="sm"
                          className="bg-surface-50"
                        >
                          {bus.phone}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleVerify(bus._id, "business")}
                        isLoading={actionLoadingId === bus._id}
                        disabled={rejectLoadingId === bus._id}
                        iconLeft={ShieldCheck}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => handleReject(bus._id, "business")}
                        isLoading={rejectLoadingId === bus._id}
                        disabled={actionLoadingId === bus._id}
                        iconLeft={XCircle}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {businesses.length === 0 && (
                <p className="text-xs text-charcoal-500 text-center py-4">
                  No businesses pending
                </p>
              )}
            </div>

            {/* Recipients Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-charcoal-900 border-b border-charcoal-100 pb-2">
                NGOs & Shelters ({recipients.length})
              </h3>
              {recipients.map((rec) => (
                <Card
                  key={rec._id}
                  variant="default"
                  className="hover:border-brand-300 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-extrabold text-charcoal-900">
                        {rec.organizationName}
                      </h4>
                      <p className="text-xs font-semibold text-charcoal-500 mt-1">
                        {rec.recipientType} • {rec.city}, {rec.state}
                      </p>
                      <p className="text-xs text-charcoal-600 mt-2 line-clamp-2">
                        {rec.address}
                      </p>

                      <div className="mt-3 flex gap-2">
                        {rec.registrationNumber && (
                          <Badge
                            variant="outline"
                            size="sm"
                            className="bg-surface-50"
                          >
                            Reg: {rec.registrationNumber}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          size="sm"
                          className="bg-surface-50"
                        >
                          Capacity:{" "}
                          {rec.capacityDetails?.servingCapacity || "N/A"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleVerify(rec._id, "recipient")}
                        isLoading={actionLoadingId === rec._id}
                        disabled={rejectLoadingId === rec._id}
                        iconLeft={ShieldCheck}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => handleReject(rec._id, "recipient")}
                        isLoading={rejectLoadingId === rec._id}
                        disabled={actionLoadingId === rec._id}
                        iconLeft={XCircle}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {recipients.length === 0 && (
                <p className="text-xs text-charcoal-500 text-center py-4">
                  No NGOs pending
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminVerificationsPage;
