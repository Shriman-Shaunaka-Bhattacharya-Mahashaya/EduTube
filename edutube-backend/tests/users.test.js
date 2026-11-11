const { request, app, User, makeUser, bearer } = require('./helpers');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('authentication and registration', () => {
  test.each([{}, { userId: 'a' }, { userId: 'a', password: 'b' }, { userId: 'a', password: 'b', role: 'admin' }, { userId: {}, password: 'b', role: 'student' }])('rejects invalid registration %j', async body => {
    await request(app).post('/api/users/register').send(body).expect(400);
    expect(await User.countDocuments()).toBe(0);
  });
  test.each(['student', 'educator'])('registers a %s and hashes the password', async role => {
    const res = await request(app).post('/api/users/register').send({ userId: 'new', password: 'secret', role }).expect(201);
    expect(res.body.password).toBeUndefined();
    const user = await User.findOne({ userId: 'new' });
    expect(user.role).toBe(role);
    expect(user.password).not.toBe('secret');
    expect(await bcrypt.compare('secret', user.password)).toBe(true);
  });
  test('rejects duplicate IDs', async () => {
    await makeUser();
    await request(app).post('/api/users/register').send({ userId: 'student', password: 'secret', role: 'student' }).expect(400);
    expect(await User.countDocuments()).toBe(1);
  });
  test('logs in and returns a signed expiring token without password', async () => {
    const user = await makeUser();
    const res = await request(app).post('/api/users/login').send({ userId: user.userId, password: 'password123' }).expect(200);
    expect(res.body.user).toEqual({ userId: 'student', role: 'student' });
    const token = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(token.id).toBe(String(user._id));
    expect(token.exp - token.iat).toBe(36000);
  });
  test.each([{}, { userId: 'student' }, { userId: 'missing', password: 'password123' }, { userId: 'student', password: 'wrong' }, { userId: { $ne: null }, password: 'a' }])('rejects invalid login %j', async body => {
    await makeUser();
    await request(app).post('/api/users/login').send(body).expect(400);
  });
  test.each([undefined, 'Bearer', 'Bearer garbage', 'Basic garbage', 'Bearer x extra'])('rejects malformed authorization %s', async value => {
    const req = request(app).get('/api/users/me');
    if (value) req.set('Authorization', value);
    await req.expect(401);
  });
  test('rejects expired and incorrectly signed tokens', async () => {
    const user = await makeUser();
    await request(app).get('/api/users/me').set('Authorization', bearer(user, { expiresIn: -1 })).expect(401);
    await request(app).get('/api/users/me').set('Authorization', `Bearer ${jwt.sign({ id: user.id }, 'wrong-secret')}`).expect(401);
    await request(app).get('/api/users/me').set('Authorization', bearer(user).replace('Bearer', 'Basic')).expect(401);
  });
  test('profile excludes password', async () => {
    const user = await makeUser();
    const res = await request(app).get('/api/users/me').set('Authorization', bearer(user)).expect(200);
    expect(res.body.userId).toBe(user.userId);
    expect(res.body).not.toHaveProperty('password');
  });
  test.each(['register', 'login'])('%s handles database failure', async route => {
    jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('database unavailable'));
    await request(app).post(`/api/users/${route}`).send({ userId: 'a', password: 'b', role: 'student' }).expect(500);
  });
});

describe('saved content and subscriptions', () => {
  test.each(['me', 'subscriptions', 'interests', 'saved-media'])('%s returns 404 for deleted user', async route => {
    const user = await makeUser(); await User.deleteMany({});
    await request(app).get(`/api/users/${route}`).set('Authorization', bearer(user)).expect(404);
  });
  test.each(['subscriptions', 'interests', 'saved-media'])('%s starts empty', async route => {
    const user = await makeUser();
    const res = await request(app).get(`/api/users/${route}`).set('Authorization', bearer(user)).expect(200);
    expect(res.body).toEqual([]);
  });
  test('subscribe and unsubscribe update both users without negative counts', async () => {
    const student = await makeUser(); const educator = await makeUser('educator');
    const toggle = () => request(app).put('/api/users/subscribe').set('Authorization', bearer(student)).send({ educatorId: educator.userId });
    expect((await toggle().expect(200)).body).toEqual(['educator']);
    expect((await User.findById(educator._id)).subscriberCount).toBe(1);
    await User.findByIdAndUpdate(educator._id, { subscriberCount: 0 });
    expect((await toggle().expect(200)).body).toEqual([]);
    expect((await User.findById(educator._id)).subscriberCount).toBe(0);
  });
  test('rejects nonexistent educator', async () => {
    const student = await makeUser();
    await request(app).put('/api/users/subscribe').set('Authorization', bearer(student)).send({ educatorId: 'missing' }).expect(404);
  });
  test.each([
    ['subscribe', { educatorId: 'educator' }], ['interest', { topic: 'React' }], ['saved-media', { mediaId: 'one', name: 'Lesson' }],
  ])('%s rejects educators and deleted users', async (route, body) => {
    const educator = await makeUser('educator');
    await request(app).put(`/api/users/${route}`).set('Authorization', bearer(educator)).send(body).expect(403);
    await User.deleteMany({});
    await request(app).put(`/api/users/${route}`).set('Authorization', bearer(educator)).send(body).expect(404);
  });
  test.each([['subscribe', {}], ['interest', {}], ['interest', { topic: '   ' }], ['interest', { topic: {} }], ['saved-media', {}], ['saved-media', { mediaId: 'one' }]])('%s validates %j', async (route, body) => {
    const user = await makeUser();
    await request(app).put(`/api/users/${route}`).set('Authorization', bearer(user)).send(body).expect(400);
  });
  test('normalizes and toggles topics', async () => {
    const user = await makeUser();
    const toggle = topic => request(app).put('/api/users/interest').set('Authorization', bearer(user)).send({ topic });
    expect((await toggle(' React ').expect(200)).body).toEqual(['react']);
    expect((await toggle('REACT').expect(200)).body).toEqual([]);
  });
  test('toggles bookmarks without duplicates', async () => {
    const user = await makeUser();
    const toggle = () => request(app).put('/api/users/saved-media').set('Authorization', bearer(user)).send({ mediaId: 'lesson', name: 'Lesson' });
    expect((await toggle().expect(200)).body).toEqual([expect.objectContaining({ mediaId: 'lesson', name: 'Lesson' })]);
    expect((await toggle().expect(200)).body).toEqual([]);
  });
  test.each(['subscriptions', 'interests', 'saved-media'])('%s handles database failure', async route => {
    const user = await makeUser();
    jest.spyOn(User, 'findById').mockRejectedValueOnce(new Error('database unavailable'));
    await request(app).get(`/api/users/${route}`).set('Authorization', bearer(user)).expect(500);
  });
  test.each([['subscribe', { educatorId: 'educator' }], ['interest', { topic: 'react' }], ['saved-media', { mediaId: 'one', name: 'Lesson' }]])('%s handles database failure', async (route, body) => {
    const user = await makeUser();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(User, 'findById').mockRejectedValueOnce(new Error('database unavailable'));
    await request(app).put(`/api/users/${route}`).set('Authorization', bearer(user)).send(body).expect(500);
  });
});

// Error-path tests verify that failed operations do not report success.
test('profile database failure returns 500', async () => {
  const user = await makeUser();
  jest.spyOn(User, 'findById').mockReturnValueOnce({ select: () => Promise.reject(new Error('offline')) });
  await request(app).get('/api/users/me').set('Authorization', bearer(user)).expect(500);
});
test.each(['subscriptions', 'interests', 'saved-media', 'me'])('GET %s requires a token', async route => {
  await request(app).get(`/api/users/${route}`).expect(401);
});
test.each(['subscribe', 'interest', 'saved-media'])('PUT %s requires a token', async route => {
  await request(app).put(`/api/users/${route}`).send({}).expect(401);
});
