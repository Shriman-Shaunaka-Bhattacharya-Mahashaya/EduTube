const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let database;
beforeAll(async () => {
  // A disposable database, never MONGO_URI or a production connection.
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri());
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
}, 180000);
afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  await Promise.all(Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({})));
  jest.restoreAllMocks();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (database) await database.stop();
});
