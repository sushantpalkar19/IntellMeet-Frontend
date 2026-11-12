import { act, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import LocalVideo from './LocalVideo';
import RemoteVideo from './RemoteVideo';

const stream = {} as MediaStream;

beforeAll(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
    configurable: true,
    get() { return this.__testSrcObject ?? null; },
    set(value) { this.__testSrcObject = value; },
  });
});

afterEach(() => vi.restoreAllMocks());

describe('video playback lifecycle', () => {
  it('ignores AbortError from a local stream play interrupted by cleanup', async () => {
    let rejectPlay: ((error: Error) => void) | undefined;
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => new Promise((_resolve, reject) => { rejectPlay = reject; }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = render(<LocalVideo stream={stream} />);
    view.rerender(<LocalVideo stream={null} />);
    await act(async () => { rejectPlay?.(new DOMException('interrupted', 'AbortError')); await Promise.resolve(); });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('ignores AbortError from remote stream cleanup', async () => {
    let rejectPlay: ((error: Error) => void) | undefined;
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => new Promise((_resolve, reject) => { rejectPlay = reject; }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = render(<RemoteVideo stream={stream} userName="Remote User" />);
    view.rerender(<RemoteVideo stream={null} userName="Remote User" />);
    await act(async () => { rejectPlay?.(new DOMException('interrupted', 'AbortError')); await Promise.resolve(); });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('continues reporting non-Abort playback failures', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('decode failed'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<LocalVideo stream={stream} />);
    await act(async () => { await Promise.resolve(); });
    expect(errorSpy).toHaveBeenCalledWith('Error playing local video:', expect.any(Error));
  });
});
