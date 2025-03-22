// Require Dependencies
const axios = require("axios");

// Declare useful variables
const GOOGLE_RECAPTCHA_API = "https://www.google.com/recaptcha/api/siteverify";

// Use environment variable for reCAPTCHA secret key
const RECAPTCHA_SECRET_KEY =
  process.env.RECAPTCHA_SECRET_KEY || "your_secret_key_here";

// Verify user's reCAPTCHA response token
async function verifyRecaptchaResponse(response) {
  return new Promise(async (resolve, reject) => {
    try {
      const apiResponse = await axios.post(
        `${GOOGLE_RECAPTCHA_API}?secret=${RECAPTCHA_SECRET_KEY}&response=${response}`
      );

      // Check if response was valid
      resolve(apiResponse.data.success);
    } catch (error) {
      reject(error);
    }
  });
}

// Export functions
module.exports = { verifyRecaptchaResponse };
