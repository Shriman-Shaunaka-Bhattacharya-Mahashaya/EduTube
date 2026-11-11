import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import App from '../App';
vi.mock('axios');
beforeEach(() => { axios.get.mockResolvedValue({ data: [] }); });
function session(role) {
  localStorage.setItem('edutube_user', JSON.stringify({ userId: 'person', role }));
  localStorage.setItem('edutube_token', 'token');
}
test.each(['/', '/student', '/educator', '/unknown'])('anonymous %s redirects to login', async path => {
  window.history.replaceState({}, '', path); render(<App />); expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
});
test.each([['student', 'What will you discover today?'], ['educator', 'Welcome, person']])('restores %s session and logs out', async (role, title) => {
  session(role); const user = userEvent.setup(); render(<App />); expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Log out' })); expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  expect(localStorage.getItem('edutube_token')).toBeNull(); expect(localStorage.getItem('edutube_user')).toBeNull();
});
test.each(['broken JSON', JSON.stringify({ role: 'admin' }), 'null'])('ignores invalid saved session %s', async saved => {
  localStorage.setItem('edutube_user', saved); localStorage.setItem('edutube_token', 'token'); render(<App />);
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
});
test('student cannot open educator route', async () => {
  session('student'); window.history.replaceState({}, '', '/educator'); render(<App />);
  expect(await screen.findByRole('heading', { name: 'What will you discover today?' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/student');
});
test('successful login persists session and navigates', async () => {
  axios.post.mockResolvedValue({ data: { user: { userId: 'learner', role: 'student' }, token: 'signed-token' } });
  const user = userEvent.setup(); render(<App />);
  await user.type(screen.getByLabelText('User ID'), 'learner'); await user.type(screen.getByLabelText('Password'), 'password');
  await user.click(screen.getByRole('button', { name: /^Log in/ }));
  await waitFor(() => expect(window.location.pathname).toBe('/student'));
  expect(localStorage.getItem('edutube_token')).toBe('signed-token');
});
test('blocked storage does not crash authentication or logout', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
  axios.post.mockResolvedValue({ data: { user: { userId: 'learner', role: 'student' }, token: 'token' } });
  const user = userEvent.setup(); render(<App />);
  await user.type(screen.getByLabelText('User ID'), 'learner'); await user.type(screen.getByLabelText('Password'), 'password'); await user.click(screen.getByRole('button', { name: /^Log in/ }));
  await user.click(await screen.findByRole('button', { name: 'Log out' })); expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
});
