import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('File Upload Functionality', () => {
  beforeEach(() => {
    // Clear any previous state
    vi.clearAllMocks();
  });

  it('should render the upload zone', () => {
    render(<App />);
    const uploadZone = screen.getByRole('button', { name: /drag and drop/i });
    expect(uploadZone).toBeInTheDocument();
  });

  it('should open file picker when upload zone is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const uploadZone = screen.getByRole('button');
    const fileInput = screen.getByLabelText(/Upload video file/i);
    
    // Mock the click behavior
    const clickSpy = vi.spyOn(fileInput, 'click');
    
    await user.click(uploadZone);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should handle file selection via input', async () => {
    render(<App />);
    
    const fileInput = screen.getByLabelText(/Upload video file/i);
    const videoFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    
    // Mock video metadata
    HTMLVideoElement.prototype.load = vi.fn();
    HTMLVideoElement.prototype.play = vi.fn(() => Promise.resolve());
    Object.defineProperty(HTMLVideoElement.prototype, 'duration', {
      value: 30,
      configurable: true
    });
    
    fireEvent.change(fileInput, { target: { files: [videoFile] } });
    
    await waitFor(() => {
      expect(screen.getByText('test.mp4')).toBeInTheDocument();
    });
  });

  it('should reject non-video files', async () => {
    render(<App />);
    
    const fileInput = screen.getByLabelText(/Upload video file/i);
    const textFile = new File(['text content'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.change(fileInput, { target: { files: [textFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/Please select a valid video file/i)).toBeInTheDocument();
    });
  });

  it('should reject files larger than 2GB', async () => {
    render(<App />);
    
    const fileInput = screen.getByLabelText(/Upload video file/i);
    const largeFile = new File(['video content'], 'large.mp4', { type: 'video/mp4' });
    Object.defineProperty(largeFile, 'size', { value: 2 * 1024 * 1024 * 1024 + 1 });
    
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/File size must be less than 2GB/i)).toBeInTheDocument();
    });
  });

  it('should handle drag and drop', async () => {
    const { container } = render(<App />);
    
    const uploadZone = container.querySelector('.upload-zone');
    const videoFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    
    // Mock video metadata
    HTMLVideoElement.prototype.load = vi.fn();
    Object.defineProperty(HTMLVideoElement.prototype, 'duration', {
      value: 30,
      configurable: true
    });
    
    const dragEnterEvent = new DragEvent('dragenter', {
      dataTransfer: new DataTransfer()
    });
    fireEvent.dragEnter(uploadZone, dragEnterEvent);
    
    expect(uploadZone).toHaveClass('active');
    
    const dragOverEvent = new DragEvent('dragover', {
      dataTransfer: new DataTransfer()
    });
    fireEvent.dragOver(uploadZone, dragOverEvent);
    
    const dropEvent = new DragEvent('drop', {
      dataTransfer: new DataTransfer()
    });
    dropEvent.dataTransfer.items.add(videoFile);
    dropEvent.dataTransfer.files = [videoFile];
    
    fireEvent.drop(uploadZone, dropEvent);
    
    await waitFor(() => {
      expect(screen.getByText('test.mp4')).toBeInTheDocument();
    });
  });

  it('should display video preview after selection', async () => {
    render(<App />);
    
    const fileInput = screen.getByLabelText(/Upload video file/i);
    const videoFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    
    // Mock video metadata
    HTMLVideoElement.prototype.load = vi.fn();
    Object.defineProperty(HTMLVideoElement.prototype, 'duration', {
      value: 30,
      configurable: true
    });
    
    fireEvent.change(fileInput, { target: { files: [videoFile] } });
    
    await waitFor(() => {
      const videoElement = screen.getByRole('img', { hidden: true });
      expect(videoElement).toBeInTheDocument();
    });
  });

  it('should show configuration section after file selection', async () => {
    render(<App />);
    
    const fileInput = screen.getByLabelText(/Upload video file/i);
    const videoFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    
    // Mock video metadata
    HTMLVideoElement.prototype.load = vi.fn();
    Object.defineProperty(HTMLVideoElement.prototype, 'duration', {
      value: 60,
      configurable: true
    });
    
    fireEvent.change(fileInput, { target: { files: [videoFile] } });
    
    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });
  });

  it('should allow file reset via "Choose different file" button', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const fileInput = screen.getByLabelText(/Upload video file/i);
    const videoFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    
    // Mock video metadata
    HTMLVideoElement.prototype.load = vi.fn();
    Object.defineProperty(HTMLVideoElement.prototype, 'duration', {
      value: 30,
      configurable: true
    });
    
    fireEvent.change(fileInput, { target: { files: [videoFile] } });
    
    await waitFor(() => {
      expect(screen.getByText('test.mp4')).toBeInTheDocument();
    });
    
    const resetButton = screen.getByRole('button', { name: /Choose different file/i });
    await user.click(resetButton);
    
    await waitFor(() => {
      expect(screen.queryByText('test.mp4')).not.toBeInTheDocument();
    });
  });

  it('should handle keyboard activation (Enter/Space) on upload zone', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const uploadZone = screen.getByRole('button');
    const fileInput = screen.getByLabelText(/Upload video file/i);
    
    const clickSpy = vi.spyOn(fileInput, 'click');
    
    await user.keyboard('{Enter}');
    expect(clickSpy).toHaveBeenCalled();
  });
});
