// Require Dependencies
const express = require("express");
const router = (module.exports = express.Router());
const { validateJWT } = require("../middleware/auth");
const axios = require("axios");

const User = require("../models/User");

/**
 * @route   POST /api/roblox/deposit
 * @desc    Create a deposit request
 * @access  Public`
 */
router.post("/deposit", async (req, res, next) => {
  try {
    const { username } = req.body;
    const { user_id } = req.body;
    const { gameCode } = req.body;
    const { token } = req.body;

    const headers = {
      'Content-Type': 'application/json',
      'x-auth-token': token
    };

    const data = {
      username: username,
      session_type: gameCode,
    };

    const ress = await axios.post("https://hook.rbxcat.com/deposit/create_session", data, { headers: headers });

    let link, botUsername, error = false, reason = null;
    if (gameCode == "mm2") {
      link = "https://www.roblox.com/games/142823291?privateServerLinkCode=67604789860287160138119263971729";
      botUsername = "chanceholder1";
    } else if (gameCode == "adoptme") {
      link = "https://www.roblox.com/games/920587237?privateServerLinkCode=52794204607978306416180650763588";
      botUsername = "chanceamp1";
    }

    if (ress.status != 200) {
      error = true;
      reason = ress.data.message;
    }
    
    return res.json({
      link: link,
      botusername: botUsername,
      error: error,
      reason: reason
    })
  } catch (error) {
    return next(error);
  }
});

/**
 * @route   POST /api/roblox/check
 * @desc    Check's if a thing is verified to their name
 * @access  Public`
 */
router.post("/check", async (req, res, next) => {
  try {
    const { username } = req.body;
    const { user_id } = req.body;

    let user = await User.findOne({ robloxUsername: username });
    if(user) return res.status(200).json({ taken: true });
    user = await User.findOne({ _id: user_id });

    fetch(`https://www.roblox.com/users/profile?username=${username}`)
      .then(response => response.text())
      .then(async (data) => {
        if (data.includes(user.mnemonicPhrase)) {
          await User.findOneAndUpdate({ _id: user_id }, { $set: { robloxUsername: username }});
          return res.status(200).json({ success: true });
        } else {
          return res.status(200).json({ mnemonicPhrase: true });
        }
      })
      .catch(error => {
        console.error('An error occurred:', error);
      });
  } catch (error) {
    return next(error);
  }
});

/**
 * @route   POST /api/roblox/check
 * @desc    Check's if a thing is verified to their name
 * @access  Public`
 */
router.post("/unlink", async (req, res, next) => {
  try {
    const { username } = req.body;
    const { user_id } = req.body;

    await User.findOneAndUpdate({ _id: user_id }, { $set: { robloxUsername: "" }});
    return res.status(200).json({ success: true });

  } catch (error) {
    return next(error);
  }
});

/**
 * @route   GET /api/roblox/stock
 * @desc    Get's avaible items on bot trader accounts
 * @access  Public`
 */
router.get("/stock", async (req, res, next) => {
  try {

    const ress = await axios.get("https://hook.rbxcat.com/mm2/site_stock");
    const ressAdmp = await axios.get("https://hook.rbxcat.com/adoptme/site_stock");
      
    if (!ress.data.mm2stock && !Array.isArray(ress.data.mm2stock)) throw "Error validating data from outside server!"
    if (!ressAdmp.data.mm2stock && !Array.isArray(ressAdmp.data.mm2stock)) throw "Error validating data from outside server!"


    return res.status(200).json({ 
      mm2: ress.data.mm2stock,
      amp: ressAdmp.data.mm2stock,
    });

  } catch (error) {
    return next(error);
  }
});

/**
 * @route   POST /api/roblox/withdraw
 * @desc    Create a withdraw request
 * @access  Public`
 */
router.post("/withdraw", async (req, res, next) => {
  try {
    const { username } = req.body;
    const { user_id } = req.body;
    const { token } = req.body;
    const { items } = req.body;
    const { gameCode } = req.body;

    const headers = {
      'Content-Type': 'application/json',
      'x-auth-token': token
    };

    const data = {
      username: username,
      session_type: gameCode,
      items: items
    };

    console.log(req)
    const ress = await axios.post("https://hook.rbxcat.com/withdraw/create_session", data, { headers: headers });
    console.log(ress)

    let error = false, reason = null;
    if (ress.status != 200) {
      error = true;
      reason = ress.data.status;
    }

    let link, botUsername;
    if (gameCode == "mm2") {
      link = "https://www.roblox.com/games/142823291?privateServerLinkCode=67604789860287160138119263971729";
      botUsername = "chanceholder1";
    } else if (gameCode == "adoptme") {
      link = "https://www.roblox.com/games/920587237?privateServerLinkCode=52794204607978306416180650763588";
      botUsername = "chanceamp1";
    }
    
    return res.status(200).json({ 
      link: link,
      botName: botUsername,
      error: error,
      reason: reason
    });

  } catch (error) {
    return next(error);
  }
});