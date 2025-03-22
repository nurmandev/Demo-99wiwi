require("dotenv").config();
const User = require("../models/User");

const AFFILIATE_PERCENTAGE =
  parseFloat(process.env.AFFILIATE_EARNING_PERCENTAGE) || 10; // Default to 10% if not set

/**
 * Apply affiliate cut to the user's affiliator.
 * @param {string} userId - User's ID
 * @param {number} houseRake - Amount wagered by user
 */
async function checkAndApplyAffiliatorCut(userId, houseRake) {
  try {
    const user = await User.findById(userId);
    if (!user || !user._affiliatedBy) return;

    const affiliator = await User.findById(user._affiliatedBy);
    if (!affiliator) return;

    const affiliateCut = houseRake * (AFFILIATE_PERCENTAGE / 100);

    await User.updateOne(
      { _id: affiliator._id },
      { $inc: { affiliateMoney: affiliateCut } }
    );
  } catch (error) {
    console.error("Error processing affiliate cut:", error);
  }
}

module.exports = { checkAndApplyAffiliatorCut };
