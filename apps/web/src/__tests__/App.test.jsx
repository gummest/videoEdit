import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../lib/apiClient', () => ({
  default: {
    get: vi.fn().mockRejectedValue(new Error('unauthorized')),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import App from '../App';

describe('App landing/auth', () => {
  it('shows product landing and auth controls when user is not logged in', async () => {
    render(<App />);
    expect(await screen.findByText(/VideoEdit Pro AI/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
  });
});
