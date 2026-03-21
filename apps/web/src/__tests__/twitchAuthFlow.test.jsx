import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import App from '../App';
import axios from 'axios';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: {},
  },
}));

describe('Twitch auth driven library loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('auto-loads my Twitch library when authenticated and Twitch tab is selected', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          user: {
            id: '1',
            login: 'mesut',
            displayName: 'Mesut',
            profileImageUrl: '',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          broadcaster: { login: 'mesut', displayName: 'Mesut' },
          vods: [],
          clips: [],
          clipWindow: { allTime: true },
        },
      });

    render(<App />);

    const twitchTab = await screen.findByRole('tab', { name: /Twitch Library/i });
    twitchTab.click();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/twitch/my-library', expect.any(Object));
    });
  });
});
