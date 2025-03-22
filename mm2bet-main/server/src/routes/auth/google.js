// Require Dependencies
require("dotenv").config();
const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const uuid = require("uuid");
const bip39 = require("bip39");
const User = require("../../models/User");

// Environment Variables
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const BACKEND_URL = IS_PRODUCTION
  ? process.env.BACKEND_PRODUCTION_URL
  : process.env.BACKEND_DEVELOPMENT_URL;
const FRONTEND_URL = IS_PRODUCTION
  ? process.env.FRONTEND_PRODUCTION_URL
  : process.env.FRONTEND_DEVELOPMENT_URL;
const ADMINPANEL_URL = IS_PRODUCTION
  ? process.env.ADMINPANEL_PRODUCTION_URL
  : process.env.ADMINPANEL_DEVELOPMENT_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "1d"; // Default to 1 day

const OAUTH_SCOPES = ["https://www.googleapis.com/auth/userinfo.profile"];

// Google OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${BACKEND_URL}/api/auth/google/callback`
);

google.options({ auth: oauth2Client });

module.exports = addTokenToState => {
  /**
   * @route   GET /api/auth/google
   * @desc    Redirect to Google OAuth
   * @access  Public
   */
  router.get("/", async (req, res, next) => {
    try {
      const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: "online",
        scope: OAUTH_SCOPES.join(" "),
        state: req.query.redirect || FRONTEND_URL,
      });
      return res.redirect(authorizeUrl);
    } catch (error) {
      console.error("Google Auth Redirect Error:", error);
      return next(
        new Error("Failed to initiate authentication, please try again.")
      );
    }
  });

  /**
   * @route   GET /api/auth/google/callback
   * @desc    Handle Google OAuth Callback
   * @access  Public
   */
  router.get("/callback", async (req, res, next) => {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens?.access_token) {
        return next(new Error("Invalid callback response, please try again!"));
      }

      // Fetch user profile
      const profileResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`
      );
      const profile = profileResponse.data;

      if (!profile?.id || !profile?.name) {
        return next(new Error("Failed to retrieve Google profile information"));
      }

      const conditions = { provider: "google", providerId: profile.id };
      let dbUser = await User.findOne(conditions);

      // Normalize Username
      const sanitizedUsername = profile.name
        .replace(
          /(\.gg|\.GG|CSGO|csgo|\.COM|\.com|\.NET|\.net|porn|PORN|nigga|nigger|niger|niga|\.)/gi,
          "x"
        )
        .substring(0, 16); // Cut username to 16 chars

      if (dbUser) {
        if (parseInt(dbUser.banExpires) > Date.now()) {
          return res.redirect(`${FRONTEND_URL}/banned`);
        }

        // Update user details
        dbUser.avatar =
          dbUser.avatarLastUpdate === 0 ? profile.picture : dbUser.avatar;
        await dbUser.save();
      } else {
        // First-time login, create new user
        dbUser = new User({
          provider: "google",
          providerId: profile.id,
          mnemonicPhrase: bip39.generateMnemonic(128),
          username: sanitizedUsername,
          avatar: profile.picture,
        });
        await dbUser.save();
      }

      // Generate JWT
      const payload = { user: { id: dbUser.id } };
      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRATION,
      });

      // Store token in state
      const identifier = uuid.v4();
      addTokenToState(identifier, token);

      // Determine redirect URL
      const redirectBase =
        state === "adminpanel"
          ? ADMINPANEL_URL
          : state === "adminpanel-dev"
          ? "http://localhost:8080"
          : FRONTEND_URL;
      const redirectUrl = `${redirectBase}/login?token=${identifier}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google Auth Callback Error:", error);
      return next(new Error("Failed to authenticate, please try again."));
    }
  });

  return router;
};
