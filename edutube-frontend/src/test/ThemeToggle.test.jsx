import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '../components/ThemeToggle';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test.each(['light', 'dark'])('toggles from %s and persists across remount', async theme => {
  document.documentElement.dataset.theme = theme;
  const user = userEvent.setup(); const view = render(<ThemeToggle />);
  const next = theme === 'dark' ? 'light' : 'dark';
  await user.click(screen.getByRole('button', { name: `Switch to ${next} theme` }));
  expect(document.documentElement.dataset.theme).toBe(next); expect(localStorage.getItem('edutube_theme')).toBe(next);
  view.unmount(); render(<ThemeToggle />); expect(screen.getByRole('button', { name: `Switch to ${theme} theme` })).toBeInTheDocument();
});
test('theme remains usable when storage throws', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  const user = userEvent.setup(); render(<ThemeToggle />);
  await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
});
test('theme control works using keyboard', async () => {
  const user = userEvent.setup(); render(<ThemeToggle />); await user.tab(); await user.keyboard('{Enter}');
  expect(document.documentElement.dataset.theme).toBe('dark');
});
const bootstrap = readFileSync('index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
test.each([
  ['dark', false, 'dark'], ['light', true, 'light'], [null, true, 'dark'], [null, false, 'light'], ['invalid', true, 'dark'],
])('initial HTML theme: saved=%s, system dark=%s', (saved, systemDark, expected) => {
  const doc = { documentElement: { dataset: {} } };
  vm.runInNewContext(bootstrap, { document: doc, localStorage: { getItem: () => saved }, matchMedia: () => ({ matches: systemDark }) });
  expect(doc.documentElement.dataset.theme).toBe(expected);
});
test('HTML bootstrap falls back safely when storage is blocked', () => {
  const doc = { documentElement: { dataset: {} } };
  vm.runInNewContext(bootstrap, { document: doc, localStorage: { getItem: () => { throw new Error('blocked'); } } });
  expect(doc.documentElement.dataset.theme).toBe('light');
});
