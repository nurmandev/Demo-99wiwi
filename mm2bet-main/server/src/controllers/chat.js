// Require Dependencies
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const uuid = require("uuid");
const colors = require("colors/safe");
const x = require("axios");

const throttlerController = require("./throttler");
const { verifyRecaptchaResponse } = require("./recaptcha");

const { getVipLevelFromWager } = require("./vip");
const insertNewWalletTransaction = require("../utils/insertNewWalletTransaction");
const { hasAlreadyChangedName, addNewChange } = require("./id_users");
const User = require("../models/User");
const Trivia = require("../models/Trivia");

// Declare chat state
const CHAT_STATE = [];
const RAIN_STATE = {
  active: false, // Whether rain is currently active
  prize: 0, // Prize split between players
  timeLeft: 120 * 1000, // 2 minutes till rain finishes
  players: [], // Array of UserID's who have participated in the rain
};
const TRIVIA_STATE = {
  timeLeft: 60000, // trivia countdown 60 seconds
  countDownStarted: false,
};
let CHAT_PAUSED = false;

// Parse days, hours and minutes from ms timestamp
const parseUnixTimestamp = ms => {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000)),
    daysms = ms % (24 * 60 * 60 * 1000),
    hours = Math.floor(daysms / (60 * 60 * 1000)),
    hoursms = ms % (60 * 60 * 1000),
    minutes = Math.floor(hoursms / (60 * 1000)),
    minutesms = ms % (60 * 1000),
    sec = Math.floor(minutesms / 1000);
  return "(" + days + "d " + hours + "h " + minutes + "m " + sec + "s)";
};

// Get state from outside the component
const getChatMessages = () => CHAT_STATE;
const getRainStatus = () => RAIN_STATE;
const getTriviaTimeStatus = () => TRIVIA_STATE.timeLeft;
const getTriviaCountdownStatus = () => TRIVIA_STATE.countDownStarted;

// How long should user wait between messages
const slowModeBuffer = 3000; // 3 seconds = 3000ms

// Get socket.io instance
const listen = io => {
  // End rain (all players have joined)
  const endCurrentRain = async () => {
    // Disable joining
    RAIN_STATE.active = false;

    try {
      // Calculate profit for each participant
      const profit = RAIN_STATE.prize / RAIN_STATE.players.length;

      // Loop through each participant
      for (let index = 0; index < RAIN_STATE.players.length; index++) {
        const player = RAIN_STATE.players[index];

        // Update document
        await User.updateOne({ _id: player }, { $inc: { wallet: profit } });
        insertNewWalletTransaction(player, profit, "Chat rain win");

        // Notify user
        io.of("/chat")
          .to(player)
          .emit("notify-success", `You won $${profit.toFixed(2)} from rain!`);
        io.of("/chat").to(player).emit("update-wallet", Math.abs(profit));
      }

      // Reset rain state
      RAIN_STATE.players = [];
      RAIN_STATE.timeLeft = 600 * 1000;
      RAIN_STATE.prize = 0;

      // Remove rain from clients
      io.of("/chat").emit("rain-state-changed", RAIN_STATE);
      //io.of("/chat").emit("notify-error", `Rain has ended!`);
    } catch (error) {
      console.log("Error while ending rain:", error);
      io.of("/chat").emit(
        "notify-error",
        "There was an error while ending this rain! Please contact site administrators!"
      );
    }
  };

  // Start a new rain
  const startNewRain = prize => {
    // If there currently is an active rain
    //if (RAIN_STATE.active) {
    //  return socket.emit("notify-error", "There is already an active rain!");
    //}

    if (!RAIN_STATE.active) {
      RAIN_STATE.active = true;
      // Start countdown
      const countdown = setInterval(() => {
        // Decrement time left
        RAIN_STATE.timeLeft -= 10;

        // Check if timer has reached 0
        if (RAIN_STATE.timeLeft <= 0) {
          clearInterval(countdown);
          return endCurrentRain();
        }
      }, 10);
    }
    // Update state
    RAIN_STATE.prize = RAIN_STATE.prize + prize;

    // Notify clients
    io.of("/chat").emit("rain-state-changed", RAIN_STATE);
  };

  // End active trivia
  const endActiveTrivia = async gameId => {
    try {
      TRIVIA_STATE.countDownStarted = false;
      TRIVIA_STATE.timeLeft = 60000; //reset trivia countdown to 60 seconds
      // Get active trivia
      const activeTrivia = await Trivia.findOne({ active: true, _id: gameId });

      // If active trivia was not found
      if (!activeTrivia) return;

      // Update document
      await Trivia.updateOne({ _id: gameId }, { $set: { active: false } });

      // Loop through winners
      for (let index = 0; index < activeTrivia.winners.length; index++) {
        const winnerId = activeTrivia.winners[index];

        // Update document
        await User.updateOne(
          { _id: winnerId },
          { $inc: { wallet: activeTrivia.prize } }
        );
        insertNewWalletTransaction(
          winnerId,
          activeTrivia.prize,
          "Chat trivia win",
          { triviaId: gameId }
        );

        // Notify user
        io.of("/chat")
          .to(winnerId)
          .emit(
            "notify-success",
            `You won $${activeTrivia.prize.toFixed(2)} from trivia!`
          );
        io.of("/chat")
          .to(winnerId)
          .emit("update-wallet", Math.abs(activeTrivia.prize));
      }

      io.of("/chat").emit("trivia-state-changed", null);
      //io.of("/chat").emit("notify-error", `Trivia has ended.. Good luck next time!`);

      console.log(
        colors.green("Trivia >> Automatically ended trivia"),
        activeTrivia.id
      );
    } catch (error) {
      console.log("Error while ending trivia:", error);
      io.of("/chat").emit(
        "notify-error",
        "There was an error while ending this trivia! Please contact site administrators!"
      );
    }
  };

  // Listen for new websocket connections
  io.of("/chat").on("connection", socket => {
    let loggedIn = false;
    let user = null;

    // Throttle connnections
    socket.use(throttlerController(socket));

    // Authenticate websocket connection
    socket.on("auth", async token => {
      if (!token) {
        loggedIn = false;
        user = null;
        return socket.emit(
          "error",
          "No authentication token provided, authorization declined"
        );
      }

      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.user.id });

        if (!user) {
          return socket.emit("notify-error", "User not found");
        }

        // Check if user is banned
        if (user.banExpires > Date.now()) {
          return socket.emit("user banned");
        }

        // Authenticate user
        socket.join(String(user._id));

        // Emit online users count
        io.of("/chat").emit(
          "users-online",
          Object.keys(io.of("/chat").sockets).length
        );
      } catch (error) {
        console.error("Socket Authentication Error:", error);
        return socket.emit("notify-error", "Authentication token is not valid");
      }

      module.exports = { authenticateSocket };
    });

    // Check for users ban status
    socket.use(async (packet, next) => {
      if (loggedIn && user) {
        try {
          const dbUser = await User.findOne({ _id: user.id });

          // Check if user is banned
          if (dbUser && parseInt(dbUser.banExpires) > new Date().getTime()) {
            return socket.emit("user banned");
          } else {
            return next();
          }
        } catch (error) {
          return socket.emit("user banned");
        }
      } else {
        return next();
      }
    });

    //const interval = setInterval(() => {           //bad practice
    // Update online users count
    io.of("/chat").emit(
      "users-online",
      Object.keys(io.of("/chat").sockets).length
    );
    //}, 1000);

    // Handle avatar change

    socket.on("set-avatar", async base64 => {
      try {
        if (!base64.startsWith("data:image/jpeg;base64,")) {
          return socket.emit("notify-error", "Invalid Image Format!");
        }

        const dbUser = await User.findById(user.id);
        if (!dbUser) {
          return socket.emit("notify-error", "User not found!");
        }

        // Enforce 1-hour cooldown
        if (Date.now() - dbUser.avatarLastUpdate < 3600000) {
          return socket.emit(
            "notify-error",
            "You can change your avatar once every hour."
          );
        }

        // Ensure directory exists
        const userDir = path.join(
          __dirname,
          `../temp/user_profiles/${user.id}/picture`
        );
        fs.mkdirSync(userDir, { recursive: true });

        // Define file paths
        const tempFilePath = path.join(userDir, "temp.jpg");
        const finalFilePath = path.join(userDir, "profile.jpg");

        // Save temporary file
        fs.writeFileSync(tempFilePath, base64.split(",")[1], {
          encoding: "base64",
        });

        // Check file size
        const fileSizeInMB = fs.statSync(tempFilePath).size / (1024 * 1024);
        if (fileSizeInMB > 0.4) {
          fs.unlinkSync(tempFilePath);
          return socket.emit("notify-error", "Maximum size allowed: 0.4MB!");
        }

        // Rename temp file to final avatar file
        fs.renameSync(tempFilePath, finalFilePath);

        // Determine backend URL from environment
        const BACKEND_URL =
          process.env.NODE_ENV === "production"
            ? process.env.BACKEND_PRODUCTION_URL
            : process.env.BACKEND_DEVELOPMENT_URL;

        // Update user avatar URL
        dbUser.avatar = `${BACKEND_URL}/api/images/${user.id}`;
        dbUser.avatarLastUpdate = Date.now();
        await dbUser.save();

        socket.emit(
          "notify-success",
          "Avatar updated successfully! Refresh to see changes."
        );
      } catch (error) {
        console.error("Avatar Update Error:", error);
        socket.emit("notify-error", "Unexpected error occurred!");
      }
    });

    // Create a new chat message
    socket.on("set-displayname", async name => {
      // Validate user input
      if (typeof name !== "string")
        return socket.emit("notify-error", "Invalid Name!");

      try {
        // Get latest user obj
        const dbUser = await User.findOne({ _id: user.id });

        if (name === dbUser.username)
          return socket.emit("notify-error", "You already have that name.");

        let is_banned = await hasAlreadyChangedName(String(user.id));
        if (is_banned)
          return socket.emit(
            "notify-error",
            "You can change your name again in 1 hour."
          );

        dbUser.username = name
          .replace(".gg", "x")
          .replace(".GG", "x")
          .replace("CSGO", "x")
          .replace("csgo", "x")
          .replace(".COM", "x")
          .replace(".com", "x")
          .replace(".NET", "x")
          .replace(".net", "x")
          .replace("porn", "x")
          .replace("PORN", "x")
          .replace("/", "x")
          .replace("+", "x")
          .replace("nigga", "x")
          .replace("nigger", "x")
          .replace("-", "x")
          .replace("niger", "x")
          .replace("niga", "x")
          .replace(".", "")
          .substring(0, 16);

        if (dbUser.username === "") {
          dbUser.username = "Hidden User";
        }

        await dbUser.save();

        // Insert new userName change
        await addNewChange(String(user.id));

        return socket.emit(
          "notify-success",
          "Successfully updated username! Refresh site to see changes"
        );
      } catch (err) {}
    });

    // Create a new chat message
    socket.on("send-chat-message", async content => {
      if (typeof content !== "string" || content.trim() === "")
        return socket.emit("notify-error", "Invalid Message Type or Length!");
      if (!loggedIn)
        return socket.emit("notify-error", "You are not logged in!");
      if (content.length > 200)
        return socket.emit(
          "notify-error",
          "Your message length must not exceed 200 characters!"
        );

      try {
        const dbUser = await User.findById(user.id);
        const minVipLevelToChat = parseInt(process.env.VIP_LEVEL_CHAT || "1");
        if (getVipLevelFromWager(dbUser.wager).name < minVipLevelToChat)
          return socket.emit(
            "notify-error",
            `You need to be at least level ${minVipLevelToChat} to chat!`
          );

        const activeTrivia = await Trivia.findOne({ active: true });
        if (
          activeTrivia &&
          content.toLowerCase() === activeTrivia.answer.toLowerCase()
        ) {
          if (!activeTrivia.winners.includes(String(user.id))) {
            await Trivia.updateOne(
              { _id: activeTrivia.id },
              { $push: { winners: user.id } }
            );
            io.of("/chat").emit(
              "trivia-join-winner",
              activeTrivia.winners.length + 1
            );

            if (activeTrivia.winners.length + 1 === 1) {
              TRIVIA_STATE.countDownStarted = true;
              io.of("/chat").emit(
                "countdown-started-trivia",
                TRIVIA_STATE.timeLeft,
                TRIVIA_STATE.countDownStarted
              );
              let intervalId = setInterval(() => {
                TRIVIA_STATE.timeLeft -= 10;
                if (TRIVIA_STATE.timeLeft <= 0) {
                  endActiveTrivia(activeTrivia.id);
                  clearInterval(intervalId);
                }
              }, 10);
            }

            if (activeTrivia.winners.length + 1 === activeTrivia.winnerAmount) {
              endActiveTrivia(activeTrivia.id);
            }
          } else {
            return socket.emit(
              "notify-error",
              "You already guessed correctly in this trivia!"
            );
          }
        }

        if (parseInt(dbUser.muteExpires) > Date.now()) {
          const timeLeft = parseInt(dbUser.muteExpires) - Date.now();
          return socket.emit(
            "notify-error",
            `You are muted ${parseUnixTimestamp(timeLeft)}`
          );
        }

        const lastMessage = CHAT_STATE.sort(
          (a, b) => b.created - a.created
        ).find(m => m.user.id === user.id);
        if (
          dbUser.rank < 3 &&
          lastMessage &&
          lastMessage.created + slowModeBuffer > Date.now()
        ) {
          return socket.emit(
            "notify-error",
            "Slow down, you can only send messages every 3 seconds!"
          );
        }

        if (CHAT_PAUSED && dbUser.rank < 3) {
          return socket.emit("notify-error", "Chat is temporarily paused!");
        }

        const message = {
          user: { username: dbUser.username, avatar: dbUser.avatar },
          content,
          created: Date.now(),
        };
        CHAT_STATE.push(message);
        io.of("/chat").emit("new-message", message);
      } catch (error) {
        console.error("Chat message error:", error);
        socket.emit(
          "notify-error",
          "An error occurred while processing your message."
        );
      }
    });

    socket.on("enter-rain", async recaptchaResponse => {
      const dbUser = await User.findOne({ _id: user.id });

      if (dbUser.wager < process.env.WAGER_TO_JOIN_RAIN)
        return socket.emit(
          "rain-join-error",
          `You need to wager at least $${process.env.WAGER_TO_JOIN_RAIN} to be able to join rain!`
        );

      // Validate user input
      if (typeof recaptchaResponse !== "string")
        return socket.emit(
          "rain-join-error",
          "Invalid ReCaptcha Response Type!"
        );
      if (!RAIN_STATE.active)
        return socket.emit(
          "rain-join-error",
          "There is currently no active rain to enter!"
        );
      if (!loggedIn)
        return socket.emit("rain-join-error", "You are not logged in!");

      // Check that user hasn't entered before
      if (RAIN_STATE.players.includes(user.id)) {
        return socket.emit(
          "rain-join-error",
          "You have already entered this rain!"
        );
      }

      try {
        // Verify reCaptcha response
        const valid = await verifyRecaptchaResponse(recaptchaResponse);

        // If reCaptcha was valid
        if (valid) {
          // Add user to the players array
          RAIN_STATE.players.push(user.id);

          // Notify user
          socket.emit("rain-join-success", "Successfully joined rain!");
          io.of("/chat").emit(
            "rain-players-changed",
            RAIN_STATE.players.length
          );
        } else {
          return socket.emit(
            "rain-join-error",
            "Your captcha wasn't valid, please try again later!"
          );
        }
      } catch (error) {
        console.log(
          "Error while validating reCaptcha response for rain:",
          error
        );
        return socket.emit(
          "rain-join-error",
          "Couldn't join this rain: Internal server error, please try again later!"
        );
      }
    });

    // User disconnects
    socket.on("disconnect", () => {
      // Update online users count
      io.of("/chat").emit(
        "users-online",
        Object.keys(io.of("/chat").sockets).length
      );
    });
  });
};

// Export functions
module.exports = {
  listen,
  getChatMessages,
  getRainStatus,
  getTriviaTimeStatus,
  getTriviaCountdownStatus,
};
