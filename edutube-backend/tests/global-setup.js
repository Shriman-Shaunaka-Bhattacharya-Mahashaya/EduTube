// Complete binary preparation once, before per-suite timeouts start. A slow first
// download must not leave timed-out suites downloading the same archive again.
require('./env');
const { MongoBinary } = require('mongodb-memory-server-core');
module.exports = async () => { await MongoBinary.getPath(); };
