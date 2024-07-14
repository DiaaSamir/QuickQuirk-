const Redis = require('redis');
const redisClient = Redis.createClient({ url: process.env.REDIS_URL });
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
redisClient.connect().catch(console.error);

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

const redisClientSetEx = async (cacheKey, doc) => {
  try {
    const expirationTime = parseInt(process.env.REDIS_EXPIRATION, 10); // Extract expiration time and convert to integer

    if (isNaN(expirationTime)) {
      throw new Error('Invalid expiration time in environment variables');
    }

    await redisClient.set(
      cacheKey,
      JSON.stringify(doc),
      'EX',
      expirationTime // Set expiration time in seconds
    );

    console.log(
      `Cache set for key: ${cacheKey} with expiration time: ${expirationTime} seconds`
    );
  } catch (err) {
    console.error('Error setting cache in Redis', err);
  }
};

const redisClientFlushAll = async () => {
  try {
    await redisClient.flushDb();
    console.log('Redis cache flushed successfully');
  } catch (err) {
    console.error('Error flushing Redis cache', err);
  }
};

module.exports = {
  redisClient,
  redisClientSetEx,
  redisClientFlushAll,
};
