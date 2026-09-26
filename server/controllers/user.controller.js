const User = require("../models/User");
const BusinessProfile = require("../models/BusinessProfile");
const RecipientProfile = require("../models/RecipientProfile");

const getCurrentUser = async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid || req.user?.firebaseUid;

    if (!firebaseUid) {
      res.status(401);
      throw new Error("Unauthorized - User identity missing from request");
    }

    let user = await User.findOne({ firebaseUid });

    const email = req.user.email || user?.email || "user@replate.org";
    const isSuperAdmin =
      process.env.SUPER_ADMIN_EMAIL &&
      email.toLowerCase() ===
        process.env.SUPER_ADMIN_EMAIL.trim().toLowerCase();

    if (!user) {
      // Do NOT auto-create. Allow syncWithMongoDB to handle creation.
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    // Auto-promote super admin
    if (isSuperAdmin && (user.role !== "ADMIN" || !user.isVerified)) {
      user.role = "ADMIN";
      user.isVerified = true;
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};


const syncUser = async (req, res, next) => {
  try {
    const firebaseUid =
      req.user?.uid || req.user?.firebaseUid || req.body.firebaseUid;
    const email = req.user?.email || req.body.email;

    if (!firebaseUid) {
      res.status(400);
      throw new Error(
        "Firebase UID is required for user profile synchronization",
      );
    }

    const { name, role, phone, organizationName, location, profileImage, recipientType, businessType, registrationNumber, eventCardImage } =
      req.body;

    let user = await User.findOne({ firebaseUid });

    // Format role enum safely
    const incomingRole = role ? role.toUpperCase() : null;
    let finalRole;

    if (incomingRole && ["BUSINESS", "RECIPIENT"].includes(incomingRole)) {
      finalRole = incomingRole;
    } else {
      finalRole = user ? user.role : "BUSINESS";
    }

    const isSuperAdmin =
      email &&
      process.env.SUPER_ADMIN_EMAIL &&
      email.toLowerCase() ===
        process.env.SUPER_ADMIN_EMAIL.trim().toLowerCase();
    if (isSuperAdmin) {
      finalRole = "ADMIN";
    }

    if (user) {
      // Update existing user profile
      user.name = name || user.name;
      user.email = email || user.email;
      if (user.role !== "ADMIN") {
        user.role = finalRole;
      }
      if (finalRole === "RECIPIENT" && recipientType) user.recipientType = recipientType;
      if (finalRole === "BUSINESS" && businessType) user.businessType = businessType;
      if (isSuperAdmin) {
        user.role = "ADMIN";
        user.isVerified = true;
      }
      user.phone = phone || user.phone;
      user.organizationName = organizationName || user.organizationName;
      if (isSuperAdmin) user.isVerified = true;
      if (profileImage) user.profileImage = profileImage;

      if (location) {
        if (!user.location) user.location = {};
        if (location.address !== undefined)
          user.location.address = location.address;
        if (location.city !== undefined) user.location.city = location.city;
        if (location.state !== undefined) user.location.state = location.state;
        if (location.pincode !== undefined)
          user.location.pincode = location.pincode;
      }

      await user.save();
    } else {
      // Create new MongoDB user profile
      user = await User.create({
        firebaseUid,
        email: email || "user@replate.org",
        name: name || req.user?.name || "RePlate Partner",
        role: finalRole,
        recipientType: finalRole === "RECIPIENT" ? (recipientType || "NGO") : undefined,
        businessType: finalRole === "BUSINESS" ? (businessType || "RESTAURANT") : undefined,
        isVerified: isSuperAdmin ? true : false,
        phone: phone || "",
        organizationName: organizationName || "",
        profileImage: profileImage || req.user?.picture || "",
        location: {
          address: location?.address || "",
          city: location?.city || "Noida",
          state: location?.state || "Uttar Pradesh",
          pincode: location?.pincode || "",
        },
      });
    }

    // isNewSignup=true means this is a fresh registration — only then delete conflicting profiles.
    // On login syncs (isNewSignup absent/false) leave existing profiles untouched to avoid data loss.
    const isNewSignup = req.body.isNewSignup === true || req.body.isNewSignup === "true";

    // Auto-create associated profile so they appear in Admin Verification Queue immediately
    if (user.role === "BUSINESS") {
      if (isNewSignup) {
        await RecipientProfile.deleteOne({ userId: user._id }).catch(() => {});
      }

      const existing = await BusinessProfile.findOne({ userId: user._id });
      if (existing) {
        let changed = false;
        if (finalRole === "BUSINESS" && businessType && existing.businessType !== businessType) {
          existing.businessType = businessType;
          changed = true;
        }
        if (registrationNumber && existing.registrationNumber !== registrationNumber) {
          existing.registrationNumber = registrationNumber;
          changed = true;
        }
        if (eventCardImage && existing.eventCardImage !== eventCardImage) {
          existing.eventCardImage = eventCardImage;
          changed = true;
        }
        if (changed) {
          await existing.save().catch(() => {});
        }
      }
      if (!existing) {
        await BusinessProfile.create({
          userId: user._id,
          businessName:
            user.organizationName || user.name || "Commercial Kitchen",
          businessType: user.businessType || "RESTAURANT",
          registrationNumber: registrationNumber || "",
          eventCardImage: eventCardImage || "",
          phone: user.phone || "",
          address: user.location?.address || "",
          city: user.location?.city || "Noida",
          state: user.location?.state || "Uttar Pradesh",
          isVerified: user.isVerified,
        });
      }
    } else if (user.role === "RECIPIENT") {
      if (isNewSignup) {
        await BusinessProfile.deleteOne({ userId: user._id }).catch(() => {});
      }

      const existing = await RecipientProfile.findOne({ userId: user._id });
      if (existing) {
        let changed = false;
        if (recipientType && existing.recipientType !== recipientType) {
          existing.recipientType = recipientType;
          changed = true;
        }
        if (registrationNumber && existing.registrationNumber !== registrationNumber) {
          existing.registrationNumber = registrationNumber;
          changed = true;
        }
        if (changed) {
          await existing.save().catch(() => {});
        }
      }
      if (!existing) {
        await RecipientProfile.create({
          userId: user._id,
          organizationName: user.organizationName || user.name || "Recipient Organization",
          recipientType: user.recipientType || "NGO",
          registrationNumber: registrationNumber || "",
          phone: user.phone || "",
          address: user.location?.address || "",
          city: user.location?.city || "Noida",
          state: user.location?.state || "Uttar Pradesh",
          isVerified: user.isVerified,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "MongoDB user profile synced successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-__v");
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

const getUserByUid = async (req, res, next) => {
  try {
    const { uid } = req.params;
    const user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      res.status(404);
      throw new Error(`User profile with Firebase UID '${uid}' not found`);
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentUser,
  syncUser,
  getUsers,
  getUserByUid,
};
