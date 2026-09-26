import api from "./api";

export const notificationService = {
  // Fetch user notifications & unread count
  getNotifications: async () => {
    try {
      const response = await api.get("/notifications");
      return response.data;
    } catch (err) {
      // Graceful fallback for cold-starts or offline network
      return { success: true, notifications: [], unreadCount: 0 };
    }
  },

  // Mark single notification as read
  markAsRead: async (id) => {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      return response.data;
    } catch (err) {
      return { success: false };
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await api.put("/notifications/read-all");
      return response.data;
    } catch (err) {
      return { success: false };
    }
  },

  // Delete single notification
  deleteNotification: async (id) => {
    try {
      const response = await api.delete(`/notifications/${id}`);
      return response.data;
    } catch (err) {
      return { success: false };
    }
  },
};

export default notificationService;
