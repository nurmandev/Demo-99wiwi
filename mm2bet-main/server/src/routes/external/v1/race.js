require("dotenv").config();
const express = require("express");
const router = (module.exports = express.Router());
const colors = require("colors/safe");
const { check, validationResult } = require("express-validator");
const { agenda } = require("../../../controllers/jobs");
const insertNewWalletTransaction = require("../../../utils/insertNewWalletTransaction");

const User = require("../../../models/User");
const Race = require("../../../models/Race");
const RaceEntry = require("../../../models/RaceEntry");

// Load prize distribution from .env
const prizeDistribution = process.env.RACE_PRIZE_DISTRIBUTION
  ? process.env.RACE_PRIZE_DISTRIBUTION.split(",").map(Number)
  : [50, 30, 20]; // Default distribution

/**
 * @route   GET /api/external/v1/race/
 * @desc    Get active race
 * @access  Private
 */
router.get("/", async (req, res, next) => {
  try {
    const race = await Race.findOne({ active: true });
    return res.json(race);
  } catch (error) {
    return next(error);
  }
});

/**
 * @route   POST /api/external/v1/race/end
 * @desc    End current active race
 * @access  Private
 */
router.post("/end", async (req, res, next) => {
  try {
    const race = await Race.findOne({ active: true });

    if (!race) {
      res.status(400);
      return next(new Error("No active race found!"));
    }

    const participants = await RaceEntry.find({ _race: race.id }).lean();
    const winners = [];

    participants.sort((a, b) => b.value - a.value); // Sort by race value

    for (let index = 0; index < participants.length; index++) {
      const userId = participants[index]._user;

      if (index < prizeDistribution.length) {
        const payout = race.prize * (prizeDistribution[index] / 100);
        winners.push(userId);

        await User.updateOne(
          { _id: userId },
          { $inc: { wallet: Math.abs(payout) } }
        );

        insertNewWalletTransaction(
          userId,
          Math.abs(payout),
          `Race win #${index + 1}`,
          { raceId: race.id }
        );
      }
    }

    await Race.updateOne(
      { _id: race.id },
      { $set: { active: false, endingDate: Date.now(), winners } }
    );

    req.app.get("socketio").of("/chat").emit("race-state-changed", winners);
    console.log(colors.green("Race >> Manually ended race"), race.id);
    return res.sendStatus(200);
  } catch (error) {
    return next(error);
  }
});

/**
 * @route   PUT /api/external/v1/race/create
 * @desc    Create new race
 * @access  Private
 */
const validationChecks = [
  check("endingDate", "Ending date is required!")
    .notEmpty()
    .isInt({ min: Date.now() })
    .withMessage("Invalid ending date, must be a UNIX timestamp in the future"),
  check("prize", "Prize amount is required!")
    .isFloat()
    .withMessage("Invalid prize amount, must be a float")
    .toFloat(),
];

router.put("/create", validationChecks, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { prize, endingDate } = req.body;
  try {
    const race = await Race.findOne({ active: true });

    if (race) {
      res.status(400);
      return next(
        new Error("Please end the current race before starting a new one!")
      );
    }

    const newRace = new Race({ active: true, prize, endingDate });

    await newRace.save();
    req.app.get("socketio").of("/chat").emit("race-state-changed", newRace.id);
    await agenda.schedule(new Date(endingDate), "endActiveRace", {
      _id: newRace.id,
    });

    return res.sendStatus(200);
  } catch (error) {
    return next(error);
  }
});
