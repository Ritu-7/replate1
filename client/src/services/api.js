import axios from "axios";
import { auth } from "../config/firebase";

const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return "http://localhost:5000/api";
  }
  const cleanUrl = envUrl.trim().replace(/\/+$/, "");
  if (!cleanUrl.endsWith("/api")) {
    return `${cleanUrl}/api`;
  }
  return cleanUrl;
};

const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Axios Request Interceptor: Attach Firebase Bearer Token dynamically
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user && typeof user.getIdToken === "function") {
        const token = await user.getIdToken(/* forceRefresh */ false).catch(() => null);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return config;
        }
      }

      // Fallback check if user is stored in localStorage
      const savedUserStr = localStorage.getItem("replate_current_user");
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && savedUser.uid) {
          config.headers.Authorization = `Bearer ${savedUser.uid}`;
        }
      }
    } catch (error) {
      const savedUserStr = localStorage.getItem("replate_current_user");
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          if (savedUser && savedUser.uid) {
            config.headers.Authorization = `Bearer ${savedUser.uid}`;
          }
        } catch (e) {}
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Axios Response Interceptor: Uniform error handling across API modules
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;

    if (status === 401) {
      console.warn(
        "API Unauthorized (401): Authentication session expired or missing token.",
      );
    } else if (status === 403) {
      console.warn(
        "API Forbidden (403): Role permissions insufficient for this action.",
      );
    } else if (status === 404) {
      console.warn("API Not Found (404): Requested resource unavailable.");
    } else if (status >= 500) {
      console.error("API Server Error (500): Internal server error occurred.");
    }

    return Promise.reject(error);
  },
);

// Helper User Sync Functions (Backwards Compatibility)
export const syncUserProfile = async (userData = {}) => {
  const response = await api.post("/users/sync", userData);
  return response.data;
};

export const getCurrentUserProfile = async () => {
  const response = await api.get("/users/me");
  return response.data;
};

export default api;
