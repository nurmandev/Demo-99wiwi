// Require Dependencies
const axios = require("axios");
const qs = require("querystring");
const Twilio = require("twilio");

// Default Twilio Config (Replace with your actual credentials)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "your_auth_token";
const VERIFY_SERVICE_SID =
  process.env.TWILIO_VERIFY_SERVICE_SID || "your_verify_service_sid";

// Setup Twilio Client
const TwilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Send an SMS verification message to the desired phone number
async function sendVerficationTextMessage(phoneNumber) {
  return new Promise(async (resolve, reject) => {
    try {
      // Request data
      const data = { to: phoneNumber, channel: "sms" };

      // Make request to Twilio API
      const verification = await TwilioClient.verify
        .services(VERIFY_SERVICE_SID)
        .verifications.create(data);

      resolve(verification);
    } catch (error) {
      reject(error);
    }
  });
}

// Verify that the code was correct using the API
async function verifyTextMessageCode(phoneNumber, code) {
  return new Promise(async (resolve, reject) => {
    try {
      // Request data
      const data = { to: phoneNumber, code };

      // Make request to Twilio API
      const verification = await TwilioClient.verify
        .services(VERIFY_SERVICE_SID)
        .verificationChecks.create(data);

      if (verification.status === "approved") {
        resolve(verification);
      } else {
        reject(
          new Error("Invalid verification code. Please double-check your code!")
        );
      }
    } catch (error) {
      reject(error);
    }
  });
}

// Export functions
module.exports = { sendVerficationTextMessage, verifyTextMessageCode };
