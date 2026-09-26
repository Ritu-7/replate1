import api from "./api";

export const adminService = {
  // Fetch all business profiles (Admin moderation)
  getAllBusinesses: async (params = {}) => {
    const response = await api.get("/admin/businesses", { params });
    return response.data;
  },

  // Fetch all recipient profiles (Admin moderation)
  getAllRecipients: async (params = {}) => {
    const response = await api.get("/admin/recipients", { params });
    return response.data;
  },

  // Toggle or set verification status for a business partner
  verifyBusiness: async (id, isVerified) => {
    const response = await api.put(`/admin/businesses/${id}/verify`, {
      isVerified,
    });
    return response.data;
  },

  // Toggle or set verification status for a recipient partner
  verifyRecipient: async (id, isVerified) => {
    const response = await api.put(`/admin/recipients/${id}/verify`, {
      isVerified,
    });
    return response.data;
  },

  // Reject and delete a business profile
  rejectBusiness: async (id) => {
    const response = await api.delete(`/admin/businesses/${id}/reject`);
    return response.data;
  },

  // Reject and delete a recipient profile
  rejectRecipient: async (id) => {
    const response = await api.delete(`/admin/recipients/${id}/reject`);
    return response.data;
  },

  // Repair misclassified users — creates missing profiles and removes stale ones
  repairQueues: async () => {
    const response = await api.post("/admin/repair-queues");
    return response.data;
  },
};

export default adminService;
