require("dotenv").config();
const User = require("../models/User");
const axios = require("axios");

// Load environment variables
const numLevels = parseInt(process.env.VIP_NUM_LEVELS, 10) || 10;
const minWager = parseFloat(process.env.VIP_MIN_WAGER) || 100;
const maxWager = parseFloat(process.env.VIP_MAX_WAGER) || 10000;
const rakeback = parseFloat(process.env.VIP_RAKEBACK) || 5;
const vipLevelNames = process.env.VIP_LEVEL_NAMES
  ? process.env.VIP_LEVEL_NAMES.split(",")
  : ["Bronze", "Silver", "Gold", "Platinum"];
const vipLevelColors = process.env.VIP_LEVEL_COLORS
  ? process.env.VIP_LEVEL_COLORS.split(",")
  : ["#CD7F32", "#C0C0C0", "#FFD700", "#E5E4E2"];

// Function to generate VIP levels dynamically
function generateVIPLevels() {
  const levels = [];
  for (let i = 0; i < numLevels; i++) {
    const level = {
      name: (i + 1).toString(),
      wagerNeeded: (
        minWager +
        (maxWager - minWager) * Math.pow(i / numLevels, 2)
      ).toFixed(2),
      rakebackPercentage: (
        rakeback /
        (1 + Math.exp(-5 * (i / numLevels - 0.5)))
      ).toFixed(2),
      levelName:
        vipLevelNames[Math.floor((i * vipLevelNames.length) / numLevels)],
      levelColor:
        vipLevelColors[Math.floor((i * vipLevelColors.length) / numLevels)],
    };
    levels.push(level);
  }
  return levels;
}

// Generate VIP levels
const vipLevels = generateVIPLevels();

// Function to determine a user's VIP level based on wager
function getVipLevelFromWager(wager) {
  if (wager < vipLevels[1].wagerNeeded) {
    return vipLevels[0];
  } else if (wager > vipLevels[numLevels - 1].wagerNeeded) {
    return vipLevels[numLevels - 1];
  } else {
    return vipLevels
      .filter(level => wager >= level.wagerNeeded)
      .sort((a, b) => b.wagerNeeded - a.wagerNeeded)[0];
  }
}

// Function to get the next VIP level for a user
function getNextVipLevelFromWager(wager) {
  return vipLevels
    .filter(level => wager < level.wagerNeeded)
    .sort((a, b) => a.wagerNeeded - b.wagerNeeded)[0];
}

// Function to check and apply rakeback for a user
async function checkAndApplyRakeback(userId, houseRake) {
  try {
    const user = await User.findOne({ _id: userId });

    // Determine the user's VIP level
    const currentLevel = getVipLevelFromWager(user.wager);

    // Update the user's rakeback balance
    await User.updateOne(
      { _id: user.id },
      {
        $inc: {
          rakebackBalance: houseRake * (currentLevel.rakebackPercentage / 100),
        },
      }
    );

    console.log(
      `Rakeback applied: ${
        houseRake * (currentLevel.rakebackPercentage / 100)
      } for user ${userId}`
    );
  } catch (error) {
    console.error("Error applying rakeback:", error);
  }
}

// Export functions
module.exports = {
  vipLevels,
  getVipLevelFromWager,
  getNextVipLevelFromWager,
  checkAndApplyRakeback,
};
