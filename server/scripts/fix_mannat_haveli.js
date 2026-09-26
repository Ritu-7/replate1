const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const BusinessProfile = require("../models/BusinessProfile");
const RecipientProfile = require("../models/RecipientProfile");

async function fixMannatHaveli() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas.");

  // Find Mannat Haveli by email or name
  const user = await User.findOne({
    $or: [
      { email: "mannat@gmail.com" },
      { name: /mannat/i },
      { organizationName: /mannat/i },
      { name: /radison/i },
      { organizationName: /radison/i }
    ]
  });

  if (!user) {
    console.log("No business matching Mannat or Radison found.");
  } else {
    console.log(`Found user: ${user._id} | ${user.name} | ${user.email}`);

    // Update User model
    user.role = "BUSINESS";
    user.businessType = "RESTAURANT";
    await user.save();
    console.log("Updated User document role to BUSINESS.");

    // Delete stale RecipientProfile
    const deletedRecipient = await RecipientProfile.deleteMany({ userId: user._id });
    console.log(`Deleted stale RecipientProfiles: ${deletedRecipient.deletedCount}`);

    // Delete any existing BusinessProfile and recreate cleanly
    await BusinessProfile.deleteMany({ userId: user._id });

    const newBusProfile = await BusinessProfile.create({
      userId: user._id,
      businessName: user.organizationName || user.name || "Mannat Haveli",
      businessType: "RESTAURANT",
      phone: user.phone || "12345678",
      address: user.location?.address || "Murthal",
      city: user.location?.city || "Noida",
      state: user.location?.state || "Uttar Pradesh",
      registrationNumber: "123456",
      isVerified: false,
    });
    console.log("Created new BusinessProfile:", newBusProfile._id);
  }

  await mongoose.disconnect();
  console.log("Disconnected.");
}

fixMannatHaveli();
