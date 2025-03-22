require("dotenv").config(); // Load environment variables

const express = require("express");
const router = express.Router(); // Add this line
const { validateJWT } = require("../middleware/auth");
const insertNewWalletTransaction = require("../utils/insertNewWalletTransaction");
const User = require("../models/User");

router.post("/claim", validateJWT, async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user.id });

    // Get the minimum rakeback claim value from environment variables
    const minRakebackClaim = process.env.VIP_MIN_RAKEBACK_CLAIM
      ? parseFloat(process.env.VIP_MIN_RAKEBACK_CLAIM)
      : 10;

    // Check if user has enough rakeback to claim
    if (user.rakebackBalance < minRakebackClaim) {
      res.status(400);
      return next(
        new Error(
          `You must have at least $${minRakebackClaim} rakeback collected before claiming it!`
        )
      );
    } else {
      // Update user document
      await User.updateOne(
        { _id: user.id },
        {
          $inc: { wallet: user.rakebackBalance },
          $set: { rakebackBalance: 0 },
        }
      );
      insertNewWalletTransaction(
        user.id,
        user.rakebackBalance,
        "VIP rakeback claim"
      );

      return res.json({ rakebackClaimed: user.rakebackBalance });
    }
  } catch (error) {
    return next(error);
  }
});
