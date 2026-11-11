const { request, app, Media, DocumentChunk, makeUser, makeMedia, bearer } = require('./helpers');
const cloudinary = require('cloudinary').v2;

describe('media API', () => {
  test.each([['post', '/upload'], ['put', '/upvote/123'], ['get', '/educator/educator'], ['delete', '/123']])('%s %s requires authentication', async (method, route) => {
    await request(app)[method](`/api/media${route}`).expect(401);
  });
  test('searches by topic, educator and exact ID using real indexes', async () => {
    const media = await makeMedia(); await makeMedia({ name: 'Biology', tags: ['biology'], authorId: 'other', authorName: 'Other' });
    for (const query of [{ tag: 'arrays' }, { author: 'PROFESSOR' }, { id: media.id }]) {
      const res = await request(app).get('/api/media/search').query(query).expect(200);
      expect(res.body).toHaveLength(1); expect(res.body[0]._id).toBe(media.id);
    }
    expect((await request(app).get('/api/media/search').query({ tag: 'missing' }).expect(200)).body).toEqual([]);
    expect((await request(app).get('/api/media/search').expect(200)).body).toHaveLength(2);
  });
  test('lists educator media newest first', async () => {
    const user = await makeUser('educator');
    await makeMedia({ timestamp: new Date('2020-01-01') }); const recent = await makeMedia();
    await makeMedia({ authorId: 'other' });
    const res = await request(app).get('/api/media/educator/educator').set('Authorization', bearer(user)).expect(200);
    expect(res.body).toHaveLength(2); expect(res.body[0]._id).toBe(recent.id);
  });
  test.each([['application/pdf', 'lesson.pdf'], ['video/mp4', 'lesson.mp4'], ['image/jpeg', 'lesson.jpg'], ['image/png', 'lesson.png'], ['text/plain', 'lesson.txt']])('uploads %s with trusted author identity', async (contentType, filename) => {
    const user = await makeUser('educator');
    const res = await request(app).post('/api/media/upload').set('Authorization', bearer(user))
      .field('name', 'Lesson').field('tags', ' React, JAVASCRIPT ').field('authorId', 'spoofed').field('authorName', 'Spoofed')
      .attach('file', Buffer.from('test content'), { filename, contentType }).expect(201);
    expect(res.body.authorId).toBe(user.userId); expect(res.body.authorName).toBe(user.userId);
    expect(res.body.tags).toEqual(['react', 'javascript']); expect(await Media.countDocuments()).toBe(1);
  });
  test('rejects student uploads before storage', async () => {
    const user = await makeUser();
    await request(app).post('/api/media/upload').set('Authorization', bearer(user)).expect(403);
    expect(await Media.countDocuments()).toBe(0);
  });
  test('rejects missing file and unsupported type', async () => {
    const user = await makeUser('educator');
    await request(app).post('/api/media/upload').set('Authorization', bearer(user)).field('name', 'Lesson').expect(400);
    await request(app).post('/api/media/upload').set('Authorization', bearer(user)).attach('file', Buffer.from('bad'), { filename: 'file.exe', contentType: 'application/octet-stream' }).expect(400);
  });
  test('rejects files over 50 MB', async () => {
    const user = await makeUser('educator');
    await request(app).post('/api/media/upload').set('Authorization', bearer(user)).attach('file', Buffer.alloc(50 * 1024 * 1024 + 1), { filename: 'big.pdf', contentType: 'application/pdf' }).expect(413);
    expect(await Media.countDocuments()).toBe(0);
  });
  test('uploads without optional tags', async () => {
    const user = await makeUser('educator');
    const res = await request(app).post('/api/media/upload').set('Authorization', bearer(user)).field('name', 'Lesson').attach('file', Buffer.from('text'), { filename: 'a.txt', contentType: 'text/plain' }).expect(201);
    expect(res.body.tags).toEqual([]);
  });
  test('upvote toggles using token identity, ignoring spoofed request body', async () => {
    const user = await makeUser(); const media = await makeMedia();
    const toggle = () => request(app).put(`/api/media/upvote/${media.id}`).set('Authorization', bearer(user)).send({ userId: 'victim' });
    expect((await toggle().expect(200)).body).toMatchObject({ upvotes: 1, upvotedBy: ['student'] });
    expect((await toggle().expect(200)).body).toMatchObject({ upvotes: 0, upvotedBy: [] });
  });
  test('missing media cannot be upvoted or deleted', async () => {
    const user = await makeUser(); const id = '507f1f77bcf86cd799439011';
    await request(app).put(`/api/media/upvote/${id}`).set('Authorization', bearer(user)).expect(404);
    await request(app).delete(`/api/media/${id}`).set('Authorization', bearer(user)).expect(404);
  });
  test('non-owner cannot delete media or its chunks', async () => {
    const user = await makeUser(); const media = await makeMedia();
    await request(app).delete(`/api/media/${media.id}`).set('Authorization', bearer(user)).expect(403);
    expect(await Media.countDocuments()).toBe(1); expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });
  test.each([['application/pdf', 'image'], ['video/mp4', 'video'], ['application/json', 'raw']])('deletes %s and its vectors using stored public ID', async (mimetype, resourceType) => {
    const user = await makeUser('educator'); const media = await makeMedia({ mimetype, publicId: 'folder/actual.name' });
    await DocumentChunk.create({ mediaId: media._id, text: 'text', embedding: [1], chunkIndex: 0 });
    await request(app).delete(`/api/media/${media.id}`).set('Authorization', bearer(user)).expect(200);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('folder/actual.name', { resource_type: resourceType });
    expect(await Media.countDocuments()).toBe(0); expect(await DocumentChunk.countDocuments()).toBe(0);
  });
  test.each([['get', '/search', 'find'], ['get', '/educator/educator', 'find'], ['put', '/upvote/507f1f77bcf86cd799439011', 'findById'], ['delete', '/507f1f77bcf86cd799439011', 'findById']])('%s %s handles database failure', async (method, route, modelMethod) => {
    const user = await makeUser(); jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Media, modelMethod).mockImplementationOnce(() => { throw new Error('offline'); });
    await request(app)[method](`/api/media${route}`).set('Authorization', bearer(user)).expect(500);
  });
});

test('failed database upload returns 500 without creating media', async () => {
  const user = await makeUser('educator');
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(Media.prototype, 'save').mockRejectedValueOnce(new Error('offline'));
  await request(app).post('/api/media/upload').set('Authorization', bearer(user)).field('name', 'Lesson').attach('file', Buffer.from('text'), { filename: 'a.txt', contentType: 'text/plain' }).expect(500);
  expect(await Media.countDocuments()).toBe(0);
});
test('legacy records without voters can still receive their first upvote', async () => {
  const user = await makeUser(); const record = { upvotes: 0, save: jest.fn().mockResolvedValue(undefined) };
  jest.spyOn(Media, 'findById').mockResolvedValueOnce(record);
  await request(app).put('/api/media/upvote/507f1f77bcf86cd799439011').set('Authorization', bearer(user)).expect(200);
  expect(record.upvotedBy).toEqual(['student']); expect(record.save).toHaveBeenCalled();
});
