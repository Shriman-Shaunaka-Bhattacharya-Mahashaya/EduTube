// Test-only placeholders. Never load the application's .env in tests.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'local-test-secret-not-for-production';
process.env.GROQ_API_KEY = 'test-only';
process.env.CLOUDINARY_CLOUD_NAME = 'test-only';
process.env.CLOUDINARY_API_KEY = 'test-only';
process.env.CLOUDINARY_API_SECRET = 'test-only';

const path = require('node:path');
process.env.MONGOMS_DOWNLOAD_DIR = path.join(__dirname, '../.cache/mongodb-binaries');
process.env.MONGOMS_VERSION = '7.0.24';
