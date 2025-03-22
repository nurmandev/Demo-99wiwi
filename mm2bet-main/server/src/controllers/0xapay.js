require("dotenv").config();
const axios = require("axios");

const API_URL = "https://api.oxapay.com/merchants/request/staticaddress";
const HEADERS = { "Content-Type": "application/json" };

/**
 * Requests a deposit address from OxaPay API.
 * @param {string} coin - Cryptocurrency symbol (BTC, ETH, etc.)
 * @returns {Promise<string|null>} - Deposit address or null on failure
 */
async function requestDepositAddress(coin) {
  try {
    const response = await axios.post(API_URL, {
      merchant: process.env.OXAPAY_MERCHANT_ID,
      currency: coin,
      callbackUrl: process.env.OXAPAY_CALLBACK_URL,
    }, { headers: HEADERS });

    return response.data.address || null;
  } catch (error) {
    console.error(`Error generating ${coin} deposit address:`, error?.response?.data || error.message);
    return null;
  }
}

/**
 * Creates deposit addresses for multiple cryptocurrencies.
 * @returns {Promise<Object>} - Object containing deposit addresses
 */
async function createDepositAddress() {
  const coins = ["BTC", "LTC", "ETH", "DOGE", "USDT", "USDC"];
  const depositAddresses = {};

  await Promise.all(
    coins.map(async (coin) => {
      depositAddresses[coin.toLowerCase()] = await requestDepositAddress(coin);
    })
  );

  return depositAddresses;
}

/**
 * Handles withdrawal transactions (Placeholder for implementation)
 */
async function createWithdrawTransaction() {
  try {
    // Implement withdrawal logic here
  } catch (error) {
    console.error("Error processing withdrawal transaction:", error.message);
  }
}

module.exports = {
  createDepositAddress,
  createWithdrawTransaction,
};
