const { request, app, User, Media, DocumentChunk } = require('./helpers');

test('unknown endpoint returns 404', async () => { await request(app).get('/api/missing').expect(404); });
test('malformed JSON returns 400', async () => { await request(app).post('/api/users/login').set('Content-Type', 'application/json').send('{broken').expect(400); });
test('CORS preflight supports the frontend', async () => {
  const res = await request(app).options('/api/users/login').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'POST').expect(204);
  expect(res.headers['access-control-allow-origin']).toBe('*');
});
test.each([
  [User, {}, ['userId', 'password', 'role']],
  [User, { userId: 'a', password: 'b', role: 'admin' }, ['role']],
  [Media, {}, ['name', 'fileUrl', 'publicId', 'mimetype', 'authorName', 'authorId']],
  [DocumentChunk, {}, ['mediaId', 'text', 'chunkIndex']],
])('%p validates required fields', (Model, body, fields) => {
  const error = new Model(body).validateSync();
  for (const field of fields) expect(error.errors).toHaveProperty(field);
});
test('schema defaults create independent empty collections', () => {
  const user = new User({ userId: 's', password: 'p', role: 'student' });
  expect(user.subscriptions).toEqual([]); expect(user.interests).toEqual([]); expect(user.savedMedia).toEqual([]); expect(user.subscriberCount).toBe(0);
  const media = new Media(); expect(media.upvotes).toBe(0); expect(media.upvotedBy).toEqual([]); expect(media.timestamp).toBeInstanceOf(Date);
});
