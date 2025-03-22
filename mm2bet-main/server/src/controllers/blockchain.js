require("dotenv").config();
const { JsonRpc } = require("eosjs");
const fetch = require("node-fetch"); // Only required for Node.js
const axios = require("axios");

// Setup EOS RPC
const rpc = new JsonRpc(process.env.BLOCKCHAIN_HTTP_PROVIDER_API, { fetch });

/**
 * Fetches the latest EOS block ID.
 * @returns {Promise<string>} Block ID
 */
const getPublicSeed = async () => {
  try {
    const info = await rpc.get_info();
    const blockNumber = info.last_irreversible_block_num + 1;
    const block = await rpc.get_block(blockNumber || 1);

    return block.id;
  } catch (error) {
    console.error("Error fetching EOS block:", error);
    throw error;
  }
};

module.exports = { getPublicSeed };
