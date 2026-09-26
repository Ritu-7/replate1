const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const BusinessProfile = require("../models/BusinessProfile");
const RecipientProfile = require("../models/RecipientProfile");

async function fixMongoDBRoles() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully to MongoDB Atlas!\n");

    const users = await User.find({});
    console.log(`Total users found in database: ${users.length}\n`);

    for (const user of users) {
      console.log(`--- Checking User: [${user._id}] ${user.email} | Name: "${user.name}" | Org: "${user.organizationName}" | Current Role: ${user.role} ---`);

      // Determine correct role:
      // If name/org contains business keywords or businessType is set (RESTAURANT, HOTEL, PARTY, BAKERY, CAFE, CLOUD_KITCHEN, etc.)
      const nameCombined = `${user.name || ""} ${user.organizationName || ""}`.toLowerCase();
      const isBusinessByKeywords = /radison|radisson|hotel|restaurant|bakery|cafe|kitchen|catering|bistro|diner|food court/i.test(nameCombined);
      const isBusinessByType = !!user.businessType && user.businessType !== "";

      let targetRole = user.role;

      if (user.role !== "ADMIN") {
        if (isBusinessByKeywords || isBusinessByType) {
          targetRole = "BUSINESS";
        }
      }

      console.log(`Target Role determined: ${targetRole}`);

      if (user.role !== targetRole) {
        console.log(`Updating User role from ${user.role} -> ${targetRole}...`);
        user.role = targetRole;
        if (targetRole === "BUSINESS" && !user.businessType) {
          user.businessType = "RESTAURANT";
        }
        await user.save();
        console.log(`User role updated successfully.`);
      }

      const hasBusiness = await BusinessProfile.exists({ userId: user._id });
      const hasRecipient = await RecipientProfile.exists({ userId: user._id });

      console.log(`Profile check: BusinessProfile exists = ${!!hasBusiness}, RecipientProfile exists = ${!!hasRecipient}`);

      if (user.role === "BUSINESS") {
        if (!hasBusiness) {
          console.log(`Creating missing BusinessProfile for ${user.name || user.email}...`);
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
          console.log(`Created BusinessProfile.`);
        }
        if (hasRecipient) {
          console.log(`Removing stale RecipientProfile for ${user.name || user.email}...`);
          await RecipientProfile.deleteOne({ userId: user._id });
          console.log(`Deleted stale RecipientProfile.`);
        }
      } else if (user.role === "RECIPIENT") {
        if (!hasRecipient) {
          console.log(`Creating missing RecipientProfile for ${user.name || user.email}...`);
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
          console.log(`Created RecipientProfile.`);
        }
        if (hasBusiness) {
          console.log(`Removing stale BusinessProfile for ${user.name || user.email}...`);
          await BusinessProfile.deleteOne({ userId: user._id });
          console.log(`Deleted stale BusinessProfile.`);
        }
      }

      console.log("----------------------------------------------------------------\n");
    }

    console.log("MongoDB Role Migration & Repair completed successfully!");
  } catch (error) {
    console.error("Migration Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

fixMongoDBRoles();
