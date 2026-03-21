import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const meMock = vi.fn()
  .mockRejectedValueOnce(new Error('unauthorized'))
  .mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com', name: 'User1' } } })
  .mockResolvedValue({ data: { model: 'gemini-2.5-flash', hasApiKey: false } })
  .mockResolvedValue({ data: { jobs: [] } });
const postMock = vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@example.com', name: 'User1' } } });

vi.mock('./lib/apiClient', () => ({
  default: {
    get: (...args) => meMock(...args),
    post: (...args) => postMock(...args),
    put: vi.fn(),
  },
}));

import App from './App';

describe('App auth flow', () => {
  it('can switch to register and submit', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Register/i }));

    fireEvent.change(screen.getByPlaceholderText(/Display name/i), { target: { value: 'User1' } });
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'u1@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalled();
      expect(screen.getByText(/Welcome, User1/i)).toBeInTheDocument();
    });
  });
});
