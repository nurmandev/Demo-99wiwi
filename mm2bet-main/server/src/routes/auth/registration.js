// Require Dependencies
require("dotenv").config();
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const User = require("../../models/User");
const { verifyRecaptchaResponse } = require("../../controllers/recaptcha");
const {
  addIPAddress,
  hasAlreadyCreatedAccount,
} = require("../../controllers/ip_addresses");

// Rate limiter to prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per window
  message: "Too many login attempts, please try again later.",
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateJWT = userId => {
  return jwt.sign({ user: { id: userId } }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION_TIME,
  });
};

router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Invalid email format."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password, username, recaptcha } = req.body;
      if (await User.findOne({ email }))
        return res.status(400).json({ error: "Email already in use." });

      let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      if (await hasAlreadyCreatedAccount(ip))
        return res
          .status(403)
          .json({ error: "Account already exists on this IP." });

      if (!(await verifyRecaptchaResponse(recaptcha)))
        return res.status(400).json({ error: "reCAPTCHA failed." });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        email,
        username,
        password: hashedPassword,
      });
      await newUser.save();
      await addIPAddress(ip);

      const token = generateJWT(newUser.id);
      res.json({ success: true, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error." });
    }
  }
);

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password, recaptcha } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ error: "Invalid email or password." });

    if (!(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Invalid email or password." });
    if (!(await verifyRecaptchaResponse(recaptcha)))
      return res.status(400).json({ error: "reCAPTCHA failed." });

    const token = generateJWT(user.id);
    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error." });
  }
});

router.post("/forgot_password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ error: "No account found with this email." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiry
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      to: email,
      subject: "Password Reset Request",
      html: `<p>Click <a href='${resetUrl}'>here</a> to reset your password.</p>`,
    });

    res.json({ success: true, message: "Password reset email sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error." });
  }
});

router.post("/reset_password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user)
      return res.status(400).json({ error: "Invalid or expired token." });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error." });
  }
});

module.exports = router;
