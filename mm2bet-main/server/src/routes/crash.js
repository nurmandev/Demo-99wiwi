require("dotenv").config(); // Load environment variables
const express = require("express");
const _ = require("lodash");
const { validateJWT } = require("../middleware/auth");
const router = (module.exports = express.Router());
const {
  getCurrentGame,
  getPublicSeed,
  formatGameHistory,
} = require("../controllers/games/crash");

const CrashGame = require("../models/CrashGame");

/**
 * @route   GET /api/crash/
 * @desc    Get crash schema
 * @access  Public
 */
router.get("/", async (req, res, next) => {
  try {
    // Get active game
    const history = await CrashGame.find({
      status: 4,
    })
      .sort({ created: -1 })
      .limit(35);

    // Get current games
    const current = await getCurrentGame();

    return res.json({
      current,
      history: history.map(formatGameHistory),
      options: { maxProfit: process.env.MAX_PROFIT }, // Using environment variable
    });
  } catch (error) {
    return next(error);
  }
});
