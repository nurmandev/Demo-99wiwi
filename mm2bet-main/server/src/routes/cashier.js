require("dotenv").config();
const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");
const colors = require("colors");
const { check, validationResult } = require("express-validator");
const BigNumber = require("bignumber.js");
const rateLimit = require("express-rate-limit");

const { validateJWT } = require("../middleware/auth");
const {
  createDepositAddress,
  createWithdrawTransaction,
} = require("../controllers/0xapay");
const {
  getDepositState,
  getWithdrawState,
} = require("../controllers/site-settings");
const insertNewWalletTransaction = require("../utils/insertNewWalletTransaction");

const User = require("../models/User");
const CryptoTransaction = require("../models/CryptoTransaction");

// Load environment variables
const MIN_WITHDRAW_AMOUNT = new BigNumber(process.env.MIN_WITHDRAW_AMOUNT || 5);
const MIN_DEPOSIT_FOR_WITHDRAW = new BigNumber(
  process.env.MIN_DEPOSIT_FOR_WITHDRAW || 5
);
const MANUAL_WITHDRAW_ENABLED = process.env.MANUAL_WITHDRAW_ENABLED === "true";

/**
 * Utility function for error handling
 */
function handleError(res, message, status = 400) {
  return res.status(status).json({ error: message });
}

/**
 * Function to generate QRCode for crypto addresses
 */
async function generateCryptoQr(address) {
  return QRCode.toDataURL(address);
}

/**
 * @route   GET /api/cashier/crypto/addresses
 * @desc    Get user's crypto deposit addresses
 * @access  Private
 */
router.get("/crypto/addresses", validateJWT, async (req, res, next) => {
  try {
    if (!getDepositState()) {
      return handleError(
        res,
        "Deposits are currently disabled! Contact admins for more information."
      );
    }

    const user = await User.findById(req.user.id).lean();
    if (!user) return handleError(res, "User not found!");

    if (user.crypto) return res.json(user.crypto);

    const addrs = await createDepositAddress();

    // Generate QR codes in parallel
    const currencies = ["btc", "eth", "ltc", "doge", "usdt", "usdc"];
    const addresses = {};
    await Promise.all(
      currencies.map(async currency => {
        addresses[currency] = {
          address: addrs[currency],
          dataUrl: await generateCryptoQr(addrs[currency]),
        };
      })
    );

    // Save addresses to user profile
    await User.findByIdAndUpdate(req.user.id, { $set: { crypto: addresses } });

    return res.json(addresses);
  } catch (error) {
    next(error);
  }
});

/**
 * Rate Limiter for Withdraw Requests (Max 3 requests per 10 minutes)
 */
const withdrawLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // limit each user to 3 withdrawals per window
  message: "Too many withdrawal attempts, please try again later.",
});

/**
 * @route   POST /api/cashier/crypto/withdraw
 * @desc    Process a cryptocurrency withdrawal
 * @access  Private
 */
router.post(
  "/crypto/withdraw",
  [
    validateJWT,
    withdrawLimiter,
    check("currency", "Withdraw currency is required")
      .notEmpty()
      .isString()
      .isIn(["BTC", "ETH", "LTC"]),
    check("address", "Valid withdraw address is required")
      .notEmpty()
      .isString(),
    check("amount", "Withdraw amount must be a valid number")
      .notEmpty()
      .isFloat()
      .toFloat(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { currency, address, amount } = req.body;
    const amountBN = new BigNumber(amount);

    try {
      if (!getWithdrawState()) {
        return handleError(
          res,
          "Withdrawals are currently disabled! Contact admins."
        );
      }

      if (amountBN.isLessThan(MIN_WITHDRAW_AMOUNT)) {
        return handleError(
          res,
          `Minimum withdraw amount is $${MIN_WITHDRAW_AMOUNT}`
        );
      }

      const user = await User.findById(req.user.id);
      if (!user) return handleError(res, "User not found!");

      if (user.transactionsLocked) {
        return handleError(
          res,
          "Your account has a transaction restriction. Contact support."
        );
      }

      if (amountBN.isGreaterThan(user.wallet)) {
        return handleError(res, "Insufficient balance for withdrawal.");
      }

      if (user.wagerNeededForWithdraw > 0) {
        return handleError(
          res,
          `You must wager at least $${user.wagerNeededForWithdraw.toFixed(
            2
          )} before withdrawing.`
        );
      }

      if (
        new BigNumber(user.totalDeposited).isLessThan(MIN_DEPOSIT_FOR_WITHDRAW)
      ) {
        return handleError(
          res,
          `You must have deposited at least $${MIN_DEPOSIT_FOR_WITHDRAW} before withdrawing.`
        );
      }

      if (new BigNumber(user.wager).isLessThan(user.customWagerLimit)) {
        return handleError(
          res,
          `You need to wager $${new BigNumber(user.customWagerLimit)
            .minus(user.wager)
            .toFixed(2)} more before withdrawing.`
        );
      }

      // Deduct balance and create transaction record
      const newTransaction = new CryptoTransaction({
        type: "withdraw",
        currency,
        siteValue: amountBN.toNumber(),
        cryptoValue: null,
        address,
        txid: null,
        state: MANUAL_WITHDRAW_ENABLED ? 4 : 1,
        _user: user.id,
      });

      // Update user balance in a single operation
      await User.findByIdAndUpdate(user.id, {
        $inc: {
          wallet: -amountBN.toNumber(),
          totalWithdrawn: amountBN.toNumber(),
        },
      });

      insertNewWalletTransaction(
        user.id,
        -amountBN.toNumber(),
        "Crypto withdraw",
        { transactionId: newTransaction.id }
      );

      if (!MANUAL_WITHDRAW_ENABLED) {
        const newPayment = await createWithdrawTransaction(
          currency.toLowerCase(),
          address,
          amountBN.toNumber(),
          newTransaction.id
        );
        newTransaction.txid = newPayment.network.hash;
        newTransaction.cryptoValue = new BigNumber(
          newPayment.amount.amount
        ).toNumber();
      }

      await newTransaction.save();

      console.log(
        colors.blue("Crypto Withdraw >>"),
        colors.cyan(`$${amount}`),
        colors.blue("to"),
        colors.cyan(address),
        colors.blue(`(Manual: ${MANUAL_WITHDRAW_ENABLED})`)
      );

      return res.json({
        siteValue: newTransaction.siteValue,
        cryptoValue: newTransaction.cryptoValue,
        state: MANUAL_WITHDRAW_ENABLED ? 4 : 1,
      });
    } catch (error) {
      console.error("Withdrawal error:", error);
      return next(error);
    }
  }
);

module.exports = router;
