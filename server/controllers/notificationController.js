const Notification = require("../models/Notification");
const User = require("../models/User");

const getAuthenticatedMongoUser = async (req) => {
  const firebaseUid = req.user?.uid || req.user?.firebaseUid;
  if (!firebaseUid) {
    const err = new Error("Unauthorized - Firebase user token missing");
    err.statusCode = 401;
    throw err;
  }

  return await User.findOne({ firebaseUid });
};

const getNotifications = async (req, res, next) => {
  try {
    const mongoUser = await getAuthenticatedMongoUser(req);
    if (!mongoUser) {
      return res.status(200).json({
        success: true,
        count: 0,
        unreadCount: 0,
        notifications: [],
      });
    }

    const notifications = await Notification.find({ userId: mongoUser._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: mongoUser._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mongoUser = await getAuthenticatedMongoUser(req);
    if (!mongoUser) {
      return res.status(401).json({ success: false, message: "User profile not found" });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      res.status(404);
      throw new Error(`Notification '${id}' not found`);
    }

    if (notification.userId.toString() !== mongoUser._id.toString()) {
      res.status(403);
      throw new Error("Forbidden - You can only update your own notifications");
    }

    notification.isRead = true;
    await notification.save();

    const unreadCount = await Notification.countDocuments({
      userId: mongoUser._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      unreadCount,
      notification,
    });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const mongoUser = await getAuthenticatedMongoUser(req);
    if (!mongoUser) {
      return res.status(200).json({ success: true, message: "No notifications", unreadCount: 0 });
    }

    await Notification.updateMany(
      { userId: mongoUser._id, isRead: false },
      { $set: { isRead: true } },
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      unreadCount: 0,
    });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mongoUser = await getAuthenticatedMongoUser(req);
    if (!mongoUser) {
      return res.status(401).json({ success: false, message: "User profile not found" });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      res.status(404);
      throw new Error(`Notification '${id}' not found`);
    }

    if (notification.userId.toString() !== mongoUser._id.toString()) {
      res.status(403);
      throw new Error("Forbidden - You can only delete your own notifications");
    }

    await notification.deleteOne();

    const unreadCount = await Notification.countDocuments({
      userId: mongoUser._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      id,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
