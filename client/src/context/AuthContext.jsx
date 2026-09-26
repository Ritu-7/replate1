import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";
import { syncUserProfile, getCurrentUserProfile } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Initialize currentUser from localStorage persistence so page refreshes retain session
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("replate_current_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [mongoUser, setMongoUser] = useState(null);
  const [userRole, setUserRole] = useState(
    () => localStorage.getItem("replate_user_role") || "business",
  );
  const [loading, setLoading] = useState(true);

  // Helper to persist user session cleanly
  const saveUserSession = (userObj) => {
    if (userObj) {
      const sanitizedUser = {
        uid: userObj.uid,
        email: userObj.email,
        displayName:
          userObj.displayName || userObj.name || userObj.email?.split("@")[0],
        photoURL: userObj.photoURL || "",
      };
      setCurrentUser(sanitizedUser);
      localStorage.setItem(
        "replate_current_user",
        JSON.stringify(sanitizedUser),
      );
    }
  };

  // Helper to sync user profile with MongoDB backend
  const syncWithMongoDB = async (fbUser, role = "business", extraData = {}, isNewSignup = false) => {
    try {
      const payload = {
        firebaseUid: fbUser.uid,
        email: fbUser.email,
        name: extraData.name || fbUser.displayName || fbUser.email?.split("@")[0],
        role: role.toUpperCase(),
        organizationName: extraData.organizationName || extraData.name || "",
        phone: extraData.phone || "",
        location: extraData.location || undefined,
        recipientType: extraData.recipientType,
        businessType: extraData.businessType,
        registrationNumber: extraData.registrationNumber,
        eventCardImage: extraData.eventCardImage,
        isNewSignup,
      };
      const res = await syncUserProfile(payload);
      if (res.success && res.data) {
        setMongoUser(res.data);
        const syncedRole = res.data.role.toLowerCase();
        localStorage.setItem("replate_user_role", syncedRole);
        setUserRole(syncedRole);
      }
    } catch (err) {
      console.warn("MongoDB Sync Fallback:", err.message); alert("API Connection Failed: " + err.message + ". Please check your VITE_API_URL in Vercel.");
    }
  };

  // Signup with Email & Password
  const signup = async (
    email,
    password,
    displayName,
    role = "business",
    extraData = {},
  ) => {
    try {
      let user;
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        user = userCredential.user;
        if (displayName && user) {
          await updateProfile(user, { displayName });
        }
      } catch (fbErr) {
        if (
          fbErr.code === "auth/invalid-api-key" ||
          fbErr.message?.includes("API key") ||
          fbErr.message?.includes("api-key")
        ) {
          console.warn(
            "Dev Mode Fallback: Firebase API key is unconfigured. Creating local user session.",
          );
          user = {
            uid: `dev-user-${Date.now()}`,
            email,
            displayName: displayName || email.split("@")[0],
          };
        } else {
          throw fbErr;
        }
      }

      saveUserSession(user);
      localStorage.setItem("replate_user_role", role);
      setUserRole(role);
      await syncWithMongoDB(user, role, { name: displayName, ...extraData }, true);
      return user;
    } catch (error) {
      console.error("Firebase Signup Error:", error);
      throw error;
    }
  };

  // Login with Email & Password
  const login = async (email, password) => {
    try {
      let user;
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        user = userCredential.user;
      } catch (fbErr) {
        if (
          fbErr.code === "auth/invalid-api-key" ||
          fbErr.message?.includes("API key") ||
          fbErr.message?.includes("api-key")
        ) {
          console.warn(
            "Dev Mode Fallback: Firebase API key is unconfigured. Logging in local user session.",
          );
          user = {
            uid: `dev-user-${email.replace(/[^a-zA-Z0-9]/g, "")}`,
            email,
            displayName: email.split("@")[0],
          };
        } else {
          throw fbErr;
        }
      }

      saveUserSession(user);

      try {
        const profileRes = await getCurrentUserProfile();
        if (profileRes.success && profileRes.data) {
          setMongoUser(profileRes.data);
          const mRole = profileRes.data.role.toLowerCase();
          setUserRole(mRole);
          localStorage.setItem("replate_user_role", mRole);
        } else {
          await syncWithMongoDB(user, userRole);
        }
      } catch (e) {
        await syncWithMongoDB(user, userRole);
      }

      return user;
    } catch (error) {
      console.error("Firebase Login Error:", error);
      throw error;
    }
  };

  // Login with Google Popup
  const loginWithGoogle = async (requestedRole = null, extraData = {}) => {
    try {
      let user;
      try {
        const userCredential = await signInWithPopup(auth, googleProvider);
        user = userCredential.user;
      } catch (fbErr) {
        if (
          fbErr.code === "auth/invalid-api-key" ||
          fbErr.message?.includes("API key") ||
          fbErr.message?.includes("api-key")
        ) {
          console.warn(
            "Dev Mode Fallback: Firebase API key is unconfigured. Logging in local Google user session.",
          );
          user = {
            uid: `dev-google-user-${Date.now()}`,
            email: "google.partner@replate.org",
            displayName: "Google Partner User",
          };
        } else {
          throw fbErr;
        }
      }

      saveUserSession(user);

      try {
        const profileRes = await getCurrentUserProfile();
        if (profileRes.success && profileRes.data) {
          setMongoUser(profileRes.data);
          const mRole = profileRes.data.role.toLowerCase();
          setUserRole(mRole);
          localStorage.setItem("replate_user_role", mRole);
        } else {
          const role = requestedRole || userRole || "business";
          localStorage.setItem("replate_user_role", role);
          setUserRole(role);
          await syncWithMongoDB(user, role, extraData);
        }
      } catch (e) {
        const role = requestedRole || userRole || "business";
        await syncWithMongoDB(user, role, extraData);
      }

      return user;
    } catch (error) {
      console.error("Firebase Google Login Error:", error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth).catch(() => {});
    } finally {
      localStorage.removeItem("replate_user_role");
      localStorage.removeItem("replate_current_user");
      setCurrentUser(null);
      setMongoUser(null);
      setUserRole("business"); // Reset to default
    }
  };

  // Send Password Reset Email
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Firebase Reset Password Error:", error);
      throw error;
    }
  };

  // Update user role state manually
  const switchRole = (role) => {
    localStorage.setItem("replate_user_role", role);
    setUserRole(role);
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          saveUserSession(user);
        } else {
          // If Firebase SDK returns null (dev mode or unconfigured SDK), check localStorage session fallback
          const savedUser = localStorage.getItem("replate_current_user");
          if (savedUser) {
            try {
              setCurrentUser(JSON.parse(savedUser));
            } catch (e) {
              setCurrentUser(null);
            }
          } else {
            setCurrentUser(null);
          }
        }

        const savedRole =
          localStorage.getItem("replate_user_role") || "business";
        setUserRole(savedRole);

        const activeUser =
          user ||
          (localStorage.getItem("replate_current_user")
            ? JSON.parse(localStorage.getItem("replate_current_user"))
            : null);
        if (activeUser) {
          try {
            const profileRes = await getCurrentUserProfile();
            if (profileRes.success && profileRes.data) {
              setMongoUser(profileRes.data);
              const mRole = profileRes.data.role.toLowerCase();
              setUserRole(mRole);
              localStorage.setItem("replate_user_role", mRole);
            }
          } catch (e) {
            if (e.response?.status === 401 || e.message?.includes("401")) {
              await signOut(auth).catch(() => {});
              localStorage.removeItem("replate_current_user");
              localStorage.removeItem("replate_user_role");
              setCurrentUser(null);
              setMongoUser(null);
            }
          }
        }

        setLoading(false);
      },
      (error) => {
        console.warn("Firebase Auth State listener fallback:", error.message);
        const savedUser = localStorage.getItem("replate_current_user");
        if (savedUser) {
          try {
            setCurrentUser(JSON.parse(savedUser));
          } catch (e) {}
        }
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    mongoUser,
    userRole,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    switchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
