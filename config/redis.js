const IORedis = require('ioredis');

const defaultOptions = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT) || 6379,
  password:process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

// Export connections for DBs 0–4
const redisClients = {
  db0: new IORedis({ ...defaultOptions, db: 0 }),
  db1: new IORedis({ ...defaultOptions, db: 1 }),
  db2: new IORedis({ ...defaultOptions, db: 2 }),
  db3: new IORedis({ ...defaultOptions, db: 3 }),
  db4: new IORedis({ ...defaultOptions, db: 4 }), // use this for blacklisting tokens
};

Object.entries(redisClients).forEach(([key, client]) => {
  client.on('connect', () => console.log(`Redis ${key} connected`));
  client.on('error', (err) => console.error(`Redis ${key} error:`, err));
});

module.exports = redisClients;
