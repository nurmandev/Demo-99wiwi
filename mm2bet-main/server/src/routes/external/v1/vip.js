require("dotenv").config();
const express = require("express");
const router = express.Router();
const {
  getVipLevelFromWager,
  getNextVipLevelFromWager,
} = require("../../../controllers/vip");
const User = require("../../../models/User");

// Load VIP configuration from .env
const vipLevels = process.env.VIP_LEVELS
  ? process.env.VIP_LEVELS.split(",")
  : ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
const vipColors = process.env.VIP_COLORS
  ? process.env.VIP_COLORS.split(",")
  : ["#CD7F32", "#C0C0C0", "#FFD700", "#E5E4E2", "#B9F2FF"];
const minWager = parseFloat(process.env.VIP_MIN_WAGER) || 100;

/**
 * @route   GET /api/external/v1/vip/list
 * @desc    Get current VIP users
 * @access  Private
 */
router.get("/list", async (req, res, next) => {
  try {
    // Get all active VIP users
    const users = await User.find({ wager: { $gte: minWager } }).lean();

    return res.json(
      users.map(user => ({
        ...user,
        extraStatistics: {
          currentRank: getVipLevelFromWager(user.wager, vipLevels, vipColors),
          nextRank: getNextVipLevelFromWager(user.wager, vipLevels, vipColors),
        },
      }))
    );
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
