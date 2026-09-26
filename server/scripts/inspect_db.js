const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const BusinessProfile = require("../models/BusinessProfile");
const RecipientProfile = require("../models/RecipientProfile");

async function inspectAll() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("=== ALL USERS IN MONGODB ===");
  const users = await User.find({});
  console.log(JSON.stringify(users, null, 2));

  console.log("\n=== ALL BUSINESS PROFILES ===");
  const bProfiles = await BusinessProfile.find({});
  console.log(JSON.stringify(bProfiles, null, 2));

  console.log("\n=== ALL RECIPIENT PROFILES ===");
  const rProfiles = await RecipientProfile.find({});
  console.log(JSON.stringify(rProfiles, null, 2));

  await mongoose.disconnect();
}

inspectAll();
