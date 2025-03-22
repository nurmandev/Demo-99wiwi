const express = require("express");
const cors = require("cors");
const { check, validationResult } = require("express-validator");
const { validateJWT } = require("../../middleware/auth");

const router = express.Router();
router.use(cors());

// Authentication Providers
const AUTH_PROVIDERS = [
  { name: "Steam", endpoint: "/api/auth/steam" },
  { name: "Google", endpoint: "/api/auth/google" },
  { name: "User", endpoint: "/api/auth/registration" },
];

// Temporary Token Store
const TOKEN_STATE = new Map();

// List all authentication providers
router.get("/", (req, res) => {
  res.json({ providers: AUTH_PROVIDERS });
});

// Exchange temporary auth token for JWT
router.post(
  "/exchange-token",
  check("token", "Authentication token is required").notEmpty().isString(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;
    if (!TOKEN_STATE.has(token)) {
      return res.status(400).json({ error: "Invalid token" });
    }

    const jwtToken = TOKEN_STATE.get(token);
    TOKEN_STATE.delete(token);

    res.json({ token: jwtToken });
  }
);

// Validate user authentication token
router.get("/isAuthenticated", validateJWT, (req, res) => {
  res.json({ authenticated: true });
});

// Function to store temporary tokens
const addTokenToState = (identifier, token) => {
  TOKEN_STATE.set(identifier, token);
};

// Import authentication providers
const loadProvider = path => {
  try {
    const provider = require(`./${path}`);
    if (typeof provider === "function") {
      return provider(addTokenToState);
    }
    return provider;
  } catch (error) {
    console.error(`Failed to load auth provider: ${path}`, error);
    return null;
  }
};

const steamRouter = loadProvider("steam");
const googleRouter = loadProvider("google");
const registrationRouter = loadProvider("registration");

if (steamRouter) router.use("/steam", steamRouter);
if (googleRouter) router.use("/google", googleRouter);
if (registrationRouter) router.use("/registration", registrationRouter);

module.exports = router;
