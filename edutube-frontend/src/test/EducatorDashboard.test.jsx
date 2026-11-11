import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import EducatorDashboard from '../components/EducatorDashboard';
vi.mock('axios');
const media = { _id: 'one', name: 'Lesson', mimetype: 'application/pdf', fileUrl: 'https://example.test/a.pdf', timestamp: '2026-01-01', upvotes: 2, tags: ['react'] };
const headers = { headers: { Authorization: 'Bearer token' } };
beforeEach(() => { vi.resetAllMocks(); axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/me') ? { subscriberCount: 7 } : [] })); });
function mount() { return render(<EducatorDashboard user={{ userId: 'teacher', role: 'educator' }} token="token" />); }
async function fill(user, file = new File(['pdf'], 'lesson.pdf', { type: 'application/pdf' })) {
  await user.upload(screen.getByLabelText('Choose media file'), file);
  expect(screen.getByLabelText('Choose media file').files[0]).toBe(file);
  await user.type(screen.getByLabelText('Media name'), 'Lesson');
  await user.type(screen.getByLabelText('Tags, separated by commas'), 'react, javascript');
}
test('loads profile and empty library with authentication', async () => {
  mount(); expect(await screen.findByText('7')).toBeInTheDocument(); expect(screen.getByText(/haven.t uploaded/)).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledWith('http://localhost:5000/api/users/me', headers);
});
test.each(['application/pdf', 'image/png', 'video/mp4'])('renders %s media', async mimetype => {
  axios.get.mockResolvedValue({ data: [{ ...media, mimetype }] }); const { container } = mount();
  expect(await screen.findByRole('heading', { name: 'Lesson' })).toBeInTheDocument();
  if (mimetype.includes('image')) expect(screen.getByRole('img', { name: 'Lesson' })).toHaveAttribute('src', media.fileUrl);
  else if (mimetype.includes('video')) expect(container.querySelector('video')).toHaveAttribute('controls');
  else expect(screen.getByRole('link', { name: 'Download / View File' })).toHaveAttribute('href', media.fileUrl);
});
test('uploads multipart data and resets successful form', async () => {
  axios.post.mockResolvedValue({ data: media }); const user = userEvent.setup(); mount(); await fill(user);
  fireEvent.submit(screen.getByRole('button', { name: 'Upload content' }).closest('form'));
  expect(await screen.findByRole('status')).toHaveTextContent('uploaded successfully');
  const [url, data, config] = axios.post.mock.calls[0]; expect(url).toContain('/media/upload'); expect(config).toEqual(headers);
  expect(data.get('name')).toBe('Lesson'); expect(data.get('authorId')).toBe('teacher'); expect(data.get('tags')).toBe('react, javascript'); expect(data.get('file').name).toBe('lesson.pdf');
  expect(screen.getByLabelText('Media name')).toHaveValue(''); expect(screen.getByLabelText('Choose media file').files).toHaveLength(0);
});
test('oversize upload is rejected before API call', async () => {
  const file = new File(['large'], 'large.pdf', { type: 'application/pdf' }); Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 + 1 });
  const user = userEvent.setup(); mount(); await fill(user, file); fireEvent.submit(screen.getByRole('button', { name: 'Upload content' }).closest('form'));
  expect(await screen.findByRole('status')).toHaveTextContent('50 MB'); expect(axios.post).not.toHaveBeenCalled();
});
test.each([{ response: { data: { error: 'Storage full' } } }, new Error('offline')])('failed upload retains form for retry', async error => {
  axios.post.mockRejectedValue(error); const user = userEvent.setup(); mount(); await fill(user); fireEvent.submit(screen.getByRole('button', { name: 'Upload content' }).closest('form'));
  expect(await screen.findByRole('status')).toHaveTextContent('Upload failed'); expect(screen.getByLabelText('Media name')).toHaveValue('Lesson'); expect(screen.getByRole('button', { name: 'Upload content' })).toBeEnabled();
});
test('pending upload prevents duplicate submission', async () => {
  let resolve; axios.post.mockImplementation(() => new Promise(done => { resolve = done; })); const user = userEvent.setup(); mount(); await fill(user); fireEvent.submit(screen.getByRole('button', { name: 'Upload content' }).closest('form'));
  expect(screen.getByRole('button', { name: /Uploading/ })).toBeDisabled(); expect(screen.getByLabelText('Choose media file')).toBeDisabled();
  resolve({ data: media }); await screen.findByText('Content uploaded successfully.');
});
test.each([true, false])('deletion requires confirmation: %s', async confirm => {
  axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/me') ? {} : [media] })); axios.delete.mockResolvedValue({ data: {} });
  vi.spyOn(window, 'confirm').mockReturnValue(confirm); const user = userEvent.setup(); mount(); await user.click(await screen.findByRole('button', { name: 'Delete Media' }));
  if (confirm) { await waitFor(() => expect(screen.queryByRole('heading', { name: 'Lesson' })).not.toBeInTheDocument()); expect(axios.delete).toHaveBeenCalledWith('http://localhost:5000/api/media/one', headers); }
  else { expect(axios.delete).not.toHaveBeenCalled(); expect(screen.getByRole('heading', { name: 'Lesson' })).toBeInTheDocument(); }
});
test('delete failure keeps media visible', async () => {
  axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/me') ? {} : [media] })); axios.delete.mockRejectedValue(new Error('offline'));
  vi.spyOn(window, 'confirm').mockReturnValue(true); const user = userEvent.setup(); mount(); await user.click(await screen.findByRole('button', { name: 'Delete Media' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Failed to delete'); expect(screen.getByRole('heading', { name: 'Lesson' })).toBeInTheDocument();
});
test('expired session is visible', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {}); axios.get.mockRejectedValue({ response: { status: 401 } }); mount();
  expect(await screen.findByRole('status')).toHaveTextContent('Session expired');
});
