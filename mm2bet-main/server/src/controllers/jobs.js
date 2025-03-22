require("dotenv").config();
const colors = require("colors/safe");
const insertNewWalletTransaction = require("../utils/insertNewWalletTransaction");
const Agenda = require("agenda");

const User = require("../models/User");
const Race = require("../models/Race");
const RaceEntry = require("../models/RaceEntry");

// Setup Additional Variables
const MONGO_URI = process.env.MONGO_URI;
const PRIZE_DISTRIBUTION = JSON.parse(process.env.RACE_PRIZE_DISTRIBUTION);

// Setup Agenda instance
const agenda = new Agenda({
  db: { address: MONGO_URI, options: { useUnifiedTopology: true } },
});

// IIFE to give access to async/await
(async () => {
  // Startup agenda
  await agenda.start();
})();

// Define agenda Jobs
agenda.define("endActiveRace", { priority: "high" }, async job => {
  const { _id } = job.attrs.data;

  // Find race from db
  const race = await Race.findOne({ _id });
  const participants = await RaceEntry.find({ _race: _id }).lean();

  // If race is still active
  if (race.active) {
    // Variable to hold winner data
    const winners = [];

    // Payout winners
    for (let index = 0; index < participants.length; index++) {
      const userId = participants.sort((a, b) => b.value - a.value)[index]
        ._user;

      // If user is in the winning place
      if (index <= PRIZE_DISTRIBUTION.length - 1) {
        const payout = race.prize * (PRIZE_DISTRIBUTION[index] / 100);

        // Add to array
        winners.push(userId);

        // Update user //updateOne <- so it works
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

    // Update race document
    await Race.updateOne(
      { _id },
      {
        $set: {
          active: false,
          winners,
        },
      }
    );

    console.log(colors.green("Race >> Automatically ended race"), race.id);
  }
});

// Export agenda instance
module.exports = { agenda };
