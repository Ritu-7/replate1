const BusinessProfile = require("../models/BusinessProfile");
const RecipientProfile = require("../models/RecipientProfile");
const User = require("../models/User");
const { createNotificationHelper } = require("../utils/notificationUtils");
const admin = require("../config/firebaseAdmin");

const getAllBusinesses = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const filter = {};

    if (status === "verified") {
      filter.isVerified = true;
    } else if (status === "unverified") {
      filter.isVerified = false;
    }

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { businessName: regex },
        { phone: regex },
        { city: regex },
        { state: regex },
      ];
    }

    const businesses = await BusinessProfile.find(filter)
      .populate("userId", "name email role phone organizationName createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: businesses.length,
      businesses,
    });
  } catch (error) {
    next(error);
  }
};

const getAllRecipients = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const filter = {};

    if (status === "verified") {
      filter.isVerified = true;
    } else if (status === "unverified") {
      filter.isVerified = false;
    }

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { organizationName: regex },
        { phone: regex },
        { city: regex },
        { state: regex },
      ];
    }

    const recipients = await RecipientProfile.find(filter)
      .populate(
        "userId",
        "name email role phone organizationName recipientType createdAt",
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: recipients.length,
      recipients,
    });
  } catch (error) {
    next(error);
  }
};

const verifyBusiness = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    let profile = await BusinessProfile.findById(id);

    // Fallback: search by userId if not found by profile ID directly
    if (!profile && id.match(/^[0-9a-fA-F]{24}$/)) {
      profile = await BusinessProfile.findOne({ userId: id });
    }

    if (!profile) {
      res.status(404);
      throw new Error(`Business profile '${id}' not found`);
    }

    profile.isVerified =
      isVerified !== undefined ? Boolean(isVerified) : !profile.isVerified;
    await profile.save();

    // Sync isVerified to User model
    if (profile.userId) {
      await User.findByIdAndUpdate(profile.userId, {
        isVerified: profile.isVerified,
      });
    }

    const updatedProfile = await BusinessProfile.findById(profile._id).populate(
      "userId",
      "name email role phone organizationName",
    );

    // Notify business user of verification update
    await createNotificationHelper({
      userId: profile.userId,
      type: "VERIFICATION_UPDATED",
      title: "Account Verification Updated",
      message: `Your commercial donor account "${profile.businessName}" verification status is now ${
        profile.isVerified ? "VERIFIED" : "UNVERIFIED"
      }.`,
      relatedId: profile._id,
    });

    res.status(200).json({
      success: true,
      message: `Business partner '${profile.businessName}' ${
        profile.isVerified ? "verified" : "unverified"
      } successfully`,
      business: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

const verifyRecipient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    let profile = await RecipientProfile.findById(id);

    // Fallback: search by userId if not found by profile ID directly
    if (!profile && id.match(/^[0-9a-fA-F]{24}$/)) {
      profile = await RecipientProfile.findOne({ userId: id });
    }

    if (!profile) {
      res.status(404);
      throw new Error(`Recipient profile '${id}' not found`);
    }

    profile.isVerified =
      isVerified !== undefined ? Boolean(isVerified) : !profile.isVerified;
    await profile.save();

    // Sync isVerified to User model
    if (profile.userId) {
      await User.findByIdAndUpdate(profile.userId, {
        isVerified: profile.isVerified,
      });
    }

    const updatedProfile = await RecipientProfile.findById(
      profile._id,
    ).populate(
      "userId",
      "name email role phone organizationName recipientType",
    );

    // Notify recipient user of verification update
    await createNotificationHelper({
      userId: profile.userId,
      type: "VERIFICATION_UPDATED",
      title: "Account Verification Updated",
      message: `Your NGO recipient account "${profile.organizationName}" verification status is now ${
        profile.isVerified ? "VERIFIED" : "UNVERIFIED"
      }.`,
      relatedId: profile._id,
    });

    res.status(200).json({
      success: true,
      message: `Recipient partner '${profile.organizationName}' ${
        profile.isVerified ? "verified" : "unverified"
      } successfully`,
      recipient: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

const rejectBusiness = async (req, res, next) => {
  try {
    const { id } = req.params;
    let profile = await BusinessProfile.findById(id);
    if (!profile) profile = await BusinessProfile.findOne({ userId: id });

    if (!profile) {
      res.status(404);
      throw new Error(`Business profile not found`);
    }

    let firebaseUidToDelete = null;
    if (profile.userId) {
      const userDoc = await User.findById(profile.userId);
      if (userDoc && userDoc.firebaseUid) {
        firebaseUidToDelete = userDoc.firebaseUid;
      }
      await User.findByIdAndDelete(profile.userId);
    }
    await BusinessProfile.findByIdAndDelete(profile._id);

    if (firebaseUidToDelete) {
      try {
        // Wrap Firebase deletion in a 5-second timeout so it never hangs the backend
        const deletePromise = admin.auth().deleteUser(firebaseUidToDelete);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Firebase delete timed out")), 5000)
        );
        await Promise.race([deletePromise, timeoutPromise]);
      } catch (fbErr) {
        console.warn(
          "Could not delete user from Firebase (may already be deleted or invalid config):",
          fbErr.message,
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Business application rejected and removed",
    });
  } catch (error) {
    next(error);
  }
};

const rejectRecipient = async (req, res, next) => {
  try {
    const { id } = req.params;
    let profile = await RecipientProfile.findById(id);
    if (!profile) profile = await RecipientProfile.findOne({ userId: id });

    if (!profile) {
      res.status(404);
      throw new Error(`Recipient profile not found`);
    }

    let firebaseUidToDelete = null;
    if (profile.userId) {
      const userDoc = await User.findById(profile.userId);
      if (userDoc && userDoc.firebaseUid) {
        firebaseUidToDelete = userDoc.firebaseUid;
      }
      await User.findByIdAndDelete(profile.userId);
    }
    await RecipientProfile.findByIdAndDelete(profile._id);

    if (firebaseUidToDelete) {
      try {
        // Wrap Firebase deletion in a 5-second timeout so it never hangs the backend
        const deletePromise = admin.auth().deleteUser(firebaseUidToDelete);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Firebase delete timed out")), 5000)
        );
        await Promise.race([deletePromise, timeoutPromise]);
      } catch (fbErr) {
        console.warn(
          "Could not delete user from Firebase (may already be deleted or invalid config):",
          fbErr.message,
        );
      }
    }

    res
      .status(200)
      .json({ success: true, message: "NGO application rejected and removed" });
  } catch (error) {
    next(error);
  }
};

const SystemSettings = require("../models/SystemSettings");
const RewardRequest = require("../models/RewardRequest");

const getSystemSettings = async (req, res, next) => {
  try {
    const settings = await SystemSettings.find({});
    res.status(200).json({ success: true, settings });
  } catch (err) { next(err); }
};

const updateSystemSettings = async (req, res, next) => {
  try {
    const { key, value, description } = req.body;
    let setting = await SystemSettings.findOne({ key });
    if (setting) {
      setting.value = value;
      if (description) setting.description = description;
      await setting.save();
    } else {
      setting = await SystemSettings.create({ key, value, description });
    }
    res.status(200).json({ success: true, setting });
  } catch (err) { next(err); }
};

const getRewardRequests = async (req, res, next) => {
  try {
    const requests = await RewardRequest.find({}).populate("userId", "name email role organizationName").sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (err) { next(err); }
};

const processRewardRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const request = await RewardRequest.findById(id);
    if (!request) { res.status(404); throw new Error("Request not found"); }
    
    request.status = status;
    if (adminNotes) request.adminNotes = adminNotes;
    if (status === "APPROVED") request.approvedAt = new Date();
    await request.save();

    await createNotificationHelper({
      userId: request.userId,
      type: "REWARD_STATUS_UPDATED",
      title: "Reward Request " + status,
      message: "Your request for " + request.type.replace("_", " ") + " was " + status.toLowerCase(),
      relatedId: request._id,
    });
    
    res.status(200).json({ success: true, request });
  } catch (err) { next(err); }
};

const repairQueues = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $in: ["BUSINESS", "RECIPIENT"] } });
    const report = { fixed: [], skipped: [] };

    for (const user of users) {
      // Auto-detect role corruption: if user has businessType set (e.g. RESTAURANT) but role is RECIPIENT
      if (user.businessType && user.role !== "BUSINESS") {
        user.role = "BUSINESS";
        await user.save();
        report.fixed.push({ uid: user.firebaseUid, email: user.email, action: "corrected role to BUSINESS based on businessType" });
      }

      const hasBusiness = await BusinessProfile.exists({ userId: user._id });
      const hasRecipient = await RecipientProfile.exists({ userId: user._id });

      if (user.role === "BUSINESS") {
        if (!hasBusiness) {
          // Create missing BusinessProfile
          await BusinessProfile.create({
            userId: user._id,
            businessName: user.organizationName || user.name || "Commercial Kitchen",
            businessType: user.businessType || "RESTAURANT",
            phone: user.phone || "",
            address: user.location?.address || "",
            city: user.location?.city || "Noida",
            state: user.location?.state || "Uttar Pradesh",
            isVerified: user.isVerified || false,
          });
          report.fixed.push({ uid: user.firebaseUid, email: user.email, action: "created BusinessProfile" });
        }
        if (hasRecipient) {
          // Remove stale RecipientProfile
          await RecipientProfile.deleteOne({ userId: user._id });
          report.fixed.push({ uid: user.firebaseUid, email: user.email, action: "deleted stale RecipientProfile" });
        }
      } else if (user.role === "RECIPIENT") {
        if (!hasRecipient) {
          // Create missing RecipientProfile
          await RecipientProfile.create({
            userId: user._id,
            organizationName: user.organizationName || user.name || "Recipient Organization",
            recipientType: user.recipientType || "NGO",
            phone: user.phone || "",
            address: user.location?.address || "",
            city: user.location?.city || "Noida",
            state: user.location?.state || "Uttar Pradesh",
            isVerified: user.isVerified || false,
          });
          report.fixed.push({ uid: user.firebaseUid, email: user.email, action: "created RecipientProfile" });
        }
        if (hasBusiness) {
          // Remove stale BusinessProfile
          await BusinessProfile.deleteOne({ userId: user._id });
          report.fixed.push({ uid: user.firebaseUid, email: user.email, action: "deleted stale BusinessProfile" });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Queue repair complete. ${report.fixed.length} action(s) taken.`,
      report,
    });
  } catch (error) {
    next(error);
  }
};

// reclassifyUser: moves a profile from the wrong queue to the correct one.
// profileId  = _id of RecipientProfile or BusinessProfile document
// fromType   = "recipient" | "business"  (what collection it currently lives in)
// toRole     = "BUSINESS" | "RECIPIENT"  (where it should go)
const reclassifyUser = async (req, res, next) => {
  try {
    const { profileId, fromType, toRole } = req.body;

    if (!profileId || !fromType || !toRole) {
      res.status(400);
      throw new Error("profileId, fromType and toRole are required");
    }

    const targetRole = toRole.toUpperCase();
    if (!["BUSINESS", "RECIPIENT"].includes(targetRole)) {
      res.status(400);
      throw new Error("toRole must be BUSINESS or RECIPIENT");
    }

    // 1. Find the current profile document
    let userId, profileName, registrationNumber, phone, address, city, state;

    if (fromType === "recipient") {
      const rp = await RecipientProfile.findById(profileId);
      if (!rp) { res.status(404); throw new Error("RecipientProfile not found"); }
      userId = rp.userId;
      profileName = rp.organizationName;
      registrationNumber = rp.registrationNumber;
      phone = rp.phone;
      address = rp.address;
      city = rp.city;
      state = rp.state;
      await RecipientProfile.findByIdAndDelete(profileId);
    } else {
      const bp = await BusinessProfile.findById(profileId);
      if (!bp) { res.status(404); throw new Error("BusinessProfile not found"); }
      userId = bp.userId;
      profileName = bp.businessName;
      registrationNumber = bp.registrationNumber;
      phone = bp.phone;
      address = bp.address;
      city = bp.city;
      state = bp.state;
      await BusinessProfile.findByIdAndDelete(profileId);
    }

    // 2. Update User.role
    const user = await User.findByIdAndUpdate(
      userId,
      { role: targetRole, businessType: targetRole === "BUSINESS" ? "RESTAURANT" : undefined },
      { new: true }
    );
    if (!user) { res.status(404); throw new Error("User not found"); }

    // 3. Create the correct profile in the right collection
    let newProfile;
    if (targetRole === "BUSINESS") {
      // Remove any stale BusinessProfile first (safety)
      await BusinessProfile.deleteOne({ userId }).catch(() => {});
      newProfile = await BusinessProfile.create({
        userId,
        businessName: profileName || user.organizationName || user.name || "Commercial Kitchen",
        businessType: user.businessType || "RESTAURANT",
        registrationNumber: registrationNumber || "",
        phone: phone || user.phone || "",
        address: address || user.location?.address || "",
        city: city || user.location?.city || "Noida",
        state: state || user.location?.state || "Uttar Pradesh",
        isVerified: false,
      });
    } else {
      // Remove any stale RecipientProfile first (safety)
      await RecipientProfile.deleteOne({ userId }).catch(() => {});
      newProfile = await RecipientProfile.create({
        userId,
        organizationName: profileName || user.organizationName || user.name || "Recipient Organization",
        recipientType: user.recipientType || "NGO",
        registrationNumber: registrationNumber || "",
        phone: phone || user.phone || "",
        address: address || user.location?.address || "",
        city: city || user.location?.city || "Noida",
        state: state || user.location?.state || "Uttar Pradesh",
        isVerified: false,
      });
    }

    res.status(200).json({
      success: true,
      message: `${profileName} moved to ${targetRole === "BUSINESS" ? "Businesses & Restaurants" : "NGOs & Shelters"} queue`,
      newProfile,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllBusinesses,
  getAllRecipients,
  verifyBusiness,
  verifyRecipient,
  rejectBusiness,
  rejectRecipient,
  getSystemSettings,
  updateSystemSettings,
  getRewardRequests,
  processRewardRequest,
  repairQueues,
  reclassifyUser,
};
