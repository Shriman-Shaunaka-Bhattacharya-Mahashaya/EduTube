// Mock only external integrations; Express, JWT, bcrypt, Multer and MongoDB stay real.
jest.mock('cloudinary', () => ({ v2: {
  config: jest.fn(), uploader: { destroy: jest.fn().mockResolvedValue({ result: 'ok' }) },
} }));
jest.mock('multer-storage-cloudinary', () => ({
  CloudinaryStorage: class {
    _handleFile(req, file, callback) {
      let size = 0;
      file.stream.on('data', chunk => { size += chunk.length; });
      file.stream.on('end', () => callback(null, { path: 'https://example.test/edutube_media/lesson.pdf', filename: 'edutube_media/lesson', size }));
      file.stream.on('error', callback);
    }
    _removeFile(req, file, callback) { callback(null); }
  },
}));
jest.mock('groq-sdk', () => ({ Groq: jest.fn().mockImplementation(() => ({
  chat: { completions: { create: jest.fn() } },
})) }));
jest.mock('pdf-parse', () => ({ PDFParse: jest.fn().mockImplementation(() => ({
  getText: jest.fn().mockResolvedValue({ text: 'A useful educational passage about arrays and data structures.' }),
  destroy: jest.fn().mockResolvedValue(undefined),
})) }));
jest.mock('../services/embeddings', () => ({ generateEmbedding: jest.fn().mockResolvedValue(Array(384).fill(0.1)) }));
jest.mock('axios', () => ({ get: jest.fn().mockResolvedValue({ data: Buffer.from('mock-pdf') }) }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../app');
const User = require('../models/User');
const Media = require('../models/Media');
const DocumentChunk = require('../models/DocumentChunk');
async function makeUser(role = 'student', overrides = {}) {
  return User.create({ userId: role, role, password: await bcrypt.hash('password123', 4), ...overrides });
}
function bearer(user, options = {}) {
  return `Bearer ${jwt.sign({ id: String(user._id), userId: user.userId, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h', ...options })}`;
}
async function makeMedia(overrides = {}) {
  return Media.create({ name: 'Java arrays', fileUrl: 'https://example.test/edutube_media/lesson.pdf', publicId: 'edutube_media/lesson', mimetype: 'application/pdf', authorId: 'educator', authorName: 'Professor', tags: ['java', 'arrays'], ...overrides });
}
module.exports = { request, app, User, Media, DocumentChunk, makeUser, bearer, makeMedia };
