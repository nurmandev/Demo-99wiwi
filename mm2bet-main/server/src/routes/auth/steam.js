// Require Dependencies
const express = require("express");
const router = express.Router();
const SteamAuth = require("node-steam-openid");
const jwt = require("jsonwebtoken");
const uuid = require("uuid");
const bip39 = require("bip39");

const User = require("../../models/User");

// Additional variables
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

// Setup Steam oAuth client
const steam = new SteamAuth({
  realm: BACKEND_URL, // Site name displayed to users on logon
  returnUrl: `${BACKEND_URL}/api/auth/steam/callback`, // Your return route
  apiKey: process.env.STEAM_API_KEY, // Steam API key
});

module.exports = addTokenToState => {
  /**
   * @route   /api/auth/steam
   * @desc    Redirect to authenticate using Steam OpenID
   * @access  Public
   */
  router.get("/", async (req, res, next) => {
    try {
      const URL = await steam.getRedirectUrl();
      return res.redirect(URL);
    } catch (error) {
      console.error("Error while getting Steam redirect URL:", error);
      return next(new Error("Internal Server Error, please try again later."));
    }
  });

  /**
   * @route   GET /api/auth/steam/callback/
   * @desc    Authenticate users using Steam OpenID
   * @access  Public
   */
  router.get("/callback", async (req, res, next) => {
    try {
      const user = await steam.authenticate(req);
      const conditions = { provider: "steam", providerId: user.steamid };
      const dbUser = await User.findOne(conditions);

      const profilename = user.username;

      // Check if user exists
      if (dbUser) {
        let user_avatar =
          dbUser.avatarLastUpdate == 0 ? user.avatar.large : dbUser.avatar;

        await User.updateOne(conditions, { $set: { avatar: user_avatar } });

        if (parseInt(dbUser.banExpires) > new Date().getTime()) {
          return res.redirect(`${FRONTEND_URL}/banned`);
        }

        // Create JWT Payload
        const payload = { user: { id: dbUser.id } };

        // Sign and return the JWT token
        jwt.sign(
          payload,
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRATION_TIME },
          (error, token) => {
            if (error) throw error;

            // Generate a new identifier
            const identifier = uuid.v4();

            // Add token to state
            addTokenToState(identifier, token);

            const redirectBase =
              req.query.state === "adminpanel" ? ADMINPANEL_URL : FRONTEND_URL;
            return res.redirect(`${redirectBase}/login?token=${identifier}`);
          }
        );
      } else {
        // First time logging in
        let newUser = new User({
          provider: "steam",
          providerId: user.steamid,
          mnemonicPhrase: bip39.generateMnemonic(128),
          username: profilename
            .replace(
              /(\.gg|\.GG|CSGO|csgo|\.COM|\.com|\.NET|\.net|porn|PORN|nigga|nigger|niger|niga|\.)/g,
              "x"
            )
            .substring(0, 16),
          avatar: user.avatar.large,
        });

        // Save the user
        await newUser.save();

        // Create JWT Payload
        const payload = { user: { id: newUser.id } };

        // Sign and return the JWT token
        jwt.sign(
          payload,
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRATION_TIME },
          (error, token) => {
            if (error) throw error;

            // Generate a new identifier
            const identifier = uuid.v4();

            // Add token to state
            addTokenToState(identifier, token);

            const redirectBase =
              req.query.state === "adminpanel" ? ADMINPANEL_URL : FRONTEND_URL;
            return res.redirect(`${redirectBase}/login?token=${identifier}`);
          }
        );
      }
    } catch (error) {
      console.error("Error while signing in user with Steam:", error);
      return next(new Error("Internal Server Error, please try again later."));
    }
  });

  // Export router
  return router;
};
