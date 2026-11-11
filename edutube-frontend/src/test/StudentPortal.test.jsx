import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import StudentPortal from '../components/StudentPortal';
vi.mock('axios');
const media = { _id: 'one', name: 'React lesson', authorId: 'teacher', authorName: 'Teacher', mimetype: 'application/pdf', fileUrl: 'https://example.test/a.pdf', timestamp: '2026-01-01', tags: ['react'], upvotes: 0, upvotedBy: [] };
const headers = { headers: { Authorization: 'Bearer token' } };
beforeEach(() => { vi.resetAllMocks(); axios.get.mockImplementation(url => Promise.resolve({ data: url.includes('/media/search') ? [media] : [] })); });
function mount() { return render(<StudentPortal user={{ userId: 'learner', role: 'student' }} token="token" />); }
async function search(user, query = 'react') {
  await user.type(screen.getByRole('textbox', { name: 'Search lessons' }), query);
  await user.click(screen.getByRole('button', { name: /^Search$/ }));
}
async function lesson(user) { mount(); await search(user); await screen.findByRole('heading', { name: media.name }); }
test('loads saved data with authorization and shows initial guidance', async () => {
  mount(); expect(screen.getByText('Your learning starts here')).toBeInTheDocument();
  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(3));
  expect(axios.get).toHaveBeenCalledWith('http://localhost:5000/api/users/interests', headers);
});
test('requires nonblank search', async () => {
  const user = userEvent.setup(); mount(); await user.click(screen.getByRole('button', { name: 'Search' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a search term'); expect(axios.get).toHaveBeenCalledTimes(3);
});
test.each([['tag', 'C++ & React', 'tag=C%2B%2B%20%26%20React'], ['educator', 'prof & roy', 'author=prof%20%26%20roy']])('encodes %s searches', async (type, query, encoded) => {
  const user = userEvent.setup(); mount(); await user.selectOptions(screen.getByLabelText('Search method'), type); await search(user, query);
  expect(await screen.findByRole('heading', { name: media.name })).toBeInTheDocument(); expect(axios.get).toHaveBeenCalledWith(`http://localhost:5000/api/media/search?${encoded}`);
});
test('natural-language search displays interpretation and results', async () => {
  axios.post.mockResolvedValue({ data: { results: [media], interpretedAs: { type: 'tag', value: 'react' } } });
  const user = userEvent.setup(); mount(); await user.selectOptions(screen.getByLabelText('Search method'), 'ai'); await user.type(screen.getByLabelText('Search lessons'), 'Teach me react'); await user.click(screen.getByRole('button', { name: /AI Search/i }));
  expect(await screen.findByText(/AI understood your search/)).toHaveTextContent('react'); expect(screen.getByRole('heading', { name: media.name })).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/ai/agent-search', { query: 'Teach me react' }, headers);
});
test.each(['empty', 'failure'])('shows %s search feedback', async mode => {
  axios.get.mockImplementation(url => url.includes('/media/search') && mode === 'failure' ? Promise.reject(new Error('offline')) : Promise.resolve({ data: [] }));
  const user = userEvent.setup(); mount(); await search(user);
  expect(await screen.findByRole('alert')).toHaveTextContent(mode === 'empty' ? 'No media found' : 'Search failed'); expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled();
});
test('pending search disables form and displays status', async () => {
  let resolve; axios.get.mockImplementation(url => url.includes('/media/search') ? new Promise(done => { resolve = done; }) : Promise.resolve({ data: [] }));
  const user = userEvent.setup(); mount(); await search(user);
  expect(screen.getByLabelText('Search lessons')).toBeDisabled(); expect(screen.getByRole('status')).toHaveTextContent('Finding'); resolve({ data: [media] }); await screen.findByRole('heading', { name: media.name });
});
test('saved educator, topic and bookmark shortcuts search their targets', async () => {
  axios.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/subscriptions') ? ['teacher'] : url.endsWith('/interests') ? ['react'] : url.endsWith('/saved-media') ? [{ mediaId: 'one', name: 'Saved lesson' }] : [media] }));
  const user = userEvent.setup(); mount(); await user.click(await screen.findByRole('button', { name: 'teacher' }));
  await waitFor(() => expect(axios.get).toHaveBeenCalledWith('http://localhost:5000/api/media/search?author=teacher'));
  await user.click(screen.getByRole('button', { name: 'react', exact: true })); await waitFor(() => expect(axios.get).toHaveBeenCalledWith('http://localhost:5000/api/media/search?tag=react'));
  await user.click(screen.getByRole('button', { name: /Saved lesson/ })); await waitFor(() => expect(axios.get).toHaveBeenCalledWith('http://localhost:5000/api/media/search?id=one'));
});
test('toggles subscriptions, interests, bookmarks and votes', async () => {
  axios.put.mockImplementation(url => Promise.resolve({ data: url.endsWith('/subscribe') ? ['teacher'] : url.endsWith('/interest') ? ['react'] : url.endsWith('/saved-media') ? [{ mediaId: 'one', name: media.name }] : { upvotes: 1, upvotedBy: ['learner'] } }));
  const user = userEvent.setup(); await lesson(user);
  await user.click(screen.getByRole('button', { name: 'Subscribe' })); expect(await screen.findByRole('button', { name: 'Unsubscribe' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save topic react' })); expect(await screen.findByRole('button', { name: 'Unsave topic react' })).toBeInTheDocument();
  await user.click(screen.getByTitle('Bookmark this Media')); expect(await screen.findByTitle('Remove Bookmark')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /0$/ })); await waitFor(() => expect(axios.put).toHaveBeenCalledWith('http://localhost:5000/api/media/upvote/one', { userId: 'learner' }, headers));
});
test.each(['image/png', 'video/mp4', 'text/plain'])('renders %s without PDF tutor', async mimetype => {
  axios.get.mockImplementation(url => Promise.resolve({ data: url.includes('/media/search') ? [{ ...media, mimetype, tags: [] }] : [] }));
  const user = userEvent.setup(); const view = mount(); await search(user); await screen.findByRole('heading', { name: media.name });
  expect(screen.queryByRole('button', { name: /Ask AI Tutor/ })).not.toBeInTheDocument();
  if (mimetype.includes('image')) expect(screen.getByRole('img')).toHaveAttribute('alt', media.name);
  if (mimetype.includes('video')) expect(view.container.querySelector('video')).toHaveAttribute('controls');
});
test('AI tutor sends history, clears input, displays answer and reuses processed document', async () => {
  axios.post.mockImplementation(url => Promise.resolve({ data: url.includes('/ask/') ? { answer: 'React builds interfaces.' } : {} }));
  const user = userEvent.setup(); await lesson(user); await user.click(screen.getByRole('button', { name: /Ask AI Tutor/ }));
  await screen.findByText(/I have read this document/); expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  await user.type(screen.getByLabelText('Question for AI tutor'), 'What is React?'); await user.click(screen.getByRole('button', { name: 'Send' }));
  expect(await screen.findByText('React builds interfaces.')).toBeInTheDocument(); expect(screen.getByLabelText('Question for AI tutor')).toHaveValue('');
  expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/ai/ask/one', { question: 'What is React?', history: [expect.objectContaining({ role: 'ai' })] }, headers);
  await user.click(screen.getByRole('button', { name: 'Close AI Tutor' })); await user.click(screen.getByRole('button', { name: /Ask AI Tutor/ }));
  expect(axios.post.mock.calls.filter(([url]) => url.includes('/process/'))).toHaveLength(1);
});
test.each(['process', 'ask'])('AI %s failure is visible', async stage => {
  axios.post.mockImplementation(url => url.includes(`/${stage}/`) ? Promise.reject(new Error('offline')) : Promise.resolve({ data: {} }));
  const user = userEvent.setup(); await lesson(user); await user.click(screen.getByRole('button', { name: /Ask AI Tutor/ }));
  if (stage === 'process') expect(await screen.findByText(/failed to process/)).toBeInTheDocument();
  else { await screen.findByText(/I have read/); await user.type(screen.getByLabelText('Question for AI tutor'), 'Explain'); await user.click(screen.getByRole('button', { name: 'Send' })); expect(await screen.findByText(/error occurred while fetching/)).toBeInTheDocument(); }
});
test('saved-data failure leaves search usable', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {}); axios.get.mockRejectedValue(new Error('offline')); mount();
  await waitFor(() => expect(console.error).toHaveBeenCalled()); expect(screen.getByLabelText('Search lessons')).toBeEnabled();
});
