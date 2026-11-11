import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import Login from '../components/Login';
vi.mock('axios');
beforeEach(() => { vi.resetAllMocks(); });
async function credentials(user) {
  await user.type(screen.getByLabelText('User ID'), 'learner');
  await user.type(screen.getByLabelText('Password'), 'password123');
}
describe('login and registration', () => {
  test('shows accessible required fields and keeps registration fields hidden', () => {
    render(<Login onLogin={vi.fn()} />);
    expect(screen.getByLabelText('User ID')).toBeRequired();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
  test('submits login and passes user and token to the app', async () => {
    const user = userEvent.setup(); const onLogin = vi.fn();
    axios.post.mockResolvedValue({ data: { user: { userId: 'learner', role: 'student' }, token: 'token' } });
    render(<Login onLogin={onLogin} />); await credentials(user); await user.click(screen.getByRole('button', { name: /^Log in/ }));
    expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/users/login', { userId: 'learner', password: 'password123' });
    expect(onLogin).toHaveBeenCalledWith({ userId: 'learner', role: 'student' }, 'token');
  });
  test.each(['student', 'educator'])('registers %s then returns to login and clears password', async role => {
    axios.post.mockResolvedValue({ data: {} }); const user = userEvent.setup(); const onLogin = vi.fn();
    render(<Login onLogin={onLogin} />); await user.click(screen.getByRole('button', { name: 'Create an account' }));
    await credentials(user); await user.selectOptions(screen.getByRole('combobox'), role);
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    await user.click(screen.getByRole('button', { name: /^Create account/ }));
    expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/users/register', { userId: 'learner', password: 'password123', role });
    expect(await screen.findByRole('status')).toHaveTextContent('Account created');
    expect(screen.getByLabelText('Password')).toHaveValue(''); expect(onLogin).not.toHaveBeenCalled();
  });
  test.each([{ response: { data: { error: 'Invalid credentials' } } }, new Error('offline')])('shows API or connection error and allows retry', async error => {
    axios.post.mockRejectedValue(error); const user = userEvent.setup(); render(<Login onLogin={vi.fn()} />);
    await credentials(user); await user.click(screen.getByRole('button', { name: /^Log in/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(error.response?.data.error || 'Unable to connect');
    expect(screen.getByRole('button', { name: /^Log in/ })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Create an account' })); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  test('disables submission while pending', async () => {
    let resolve; axios.post.mockImplementation(() => new Promise(done => { resolve = done; }));
    const user = userEvent.setup(); render(<Login onLogin={vi.fn()} />); await credentials(user); await user.click(screen.getByRole('button', { name: /^Log in/ }));
    expect(screen.getByRole('button', { name: /Please wait/ })).toBeDisabled(); expect(screen.getByLabelText('User ID')).toBeDisabled();
    resolve({ data: { user: {}, token: 'token' } });
    await waitFor(() => expect(screen.getByRole('button', { name: /^Log in/ })).toBeEnabled());
  });
  test('empty required inputs do not send a request', async () => {
    const user = userEvent.setup(); render(<Login onLogin={vi.fn()} />); await user.click(screen.getByRole('button', { name: /^Log in/ })); expect(axios.post).not.toHaveBeenCalled();
  });
});
