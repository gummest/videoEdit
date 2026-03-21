import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import App from './App';

vi.mock('axios', () => ({
  default: {
    defaults: {},
    get: vi.fn().mockRejectedValue(new Error('not authenticated')),
    post: vi.fn(),
  },
}));

describe('App preview object URL lifecycle', () => {
  let container;
  let root;
  let revokeSpy;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:default';
    if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};

    vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:preview-1')
      .mockReturnValueOnce('blob:metadata-1')
      .mockReturnValueOnce('blob:preview-2')
      .mockReturnValueOnce('blob:metadata-2');

    revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    root = createRoot(container);
    root.render(<App />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    vi.restoreAllMocks();
  });

  it('revokes old preview URL only when replacing with a new file', async () => {
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeTruthy();

    const file1 = new File(['first'], 'first.mp4', { type: 'video/mp4' });
    Object.defineProperty(input, 'files', { value: [file1], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(revokeSpy).not.toHaveBeenCalledWith('blob:preview-1');

    const file2 = new File(['second'], 'second.mp4', { type: 'video/mp4' });
    Object.defineProperty(input, 'files', { value: [file2], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(revokeSpy).toHaveBeenCalledWith('blob:preview-1');
  });
});
