const crypto = require("crypto");
const Chance = require("chance");

const generatePrivateSeed = () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(256, (err, buffer) => {
      if (err) reject(err);
      resolve(buffer.toString("hex"));
    });
  });
};

const buildPrivateHash = async seed => {
  return crypto.createHash("sha256").update(seed).digest("hex");
};

const generatePrivateSeedHashPair = async () => {
  const seed = await generatePrivateSeed();
  const hash = await buildPrivateHash(seed);
  return { seed, hash };
};

const generateCoinflipRandom = async (gameId, privateSeed) => {
  const chance = new Chance(`${privateSeed}-${gameId}`);
  return { module: chance.floating({ min: 0, max: 60, fixed: 7 }) };
};

const generateJackpotRandom = async (gameId, privateSeed, maxTicket) => {
  const chance = new Chance(`${gameId}-${privateSeed}`);
  const module = chance.floating({ min: 0, max: 100, fixed: 7 });
  const winningTicket = Math.round(maxTicket * (module / 100));
  return { module, winningTicket };
};

const generateCrashRandom = async privateSeed => {
  const chance = new Chance(privateSeed);
  const houseEdge = parseFloat(process.env.HOUSE_EDGE || 0.01);
  return {
    crashPoint: Math.floor(
      (100 - houseEdge) * chance.floating({ min: 1, max: 2, fixed: 2 })
    ),
  };
};

module.exports = {
  generatePrivateSeedHashPair,
  generateCoinflipRandom,
  generateJackpotRandom,
  generateCrashRandom,
};
