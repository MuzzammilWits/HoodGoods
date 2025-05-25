import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadForm from './UploadForm'; 
// Mock global fetch
global.fetch = vi.fn();

describe('UploadForm', () => {
  const mockBackendUrl = 'http://localhost:3000';

  beforeEach(() => {
    // Reset mocks before each test
    vi.mocked(global.fetch).mockClear();

    // Mock import.meta.env
    vi.stubGlobal('importMeta', {
      env: { VITE_BACKEND_URL: mockBackendUrl },
    });

    // Mock a successful fetch response by default
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'http://example.com/uploaded-image.jpg' }),
    } as Response);
  });

  afterEach(() => {
    // Clean up any mocks
    vi.restoreAllMocks();
    // Ensure no listeners are left over if a test fails before removeListener
    process.removeAllListeners('unhandledRejection');
  });

  it('should render the file input and upload button', () => {
    // Render the component and get the container
    const { container } = render(<UploadForm />);
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();

    // Select the file input using a more direct query
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument(); // Requires @testing-library/jest-dom
  });

  it('should update file state when a file is selected', async () => {
    const user = userEvent.setup();
    // Render the component and get the container
    const { container } = render(<UploadForm />);

    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    // Select the file input
    const fileInput = container.querySelector('input[type="file"]');

    if (!fileInput) {
        throw new Error("File input not found in the document");
    }

    // Assert the type to HTMLInputElement
    const htmlFileInput = fileInput as HTMLInputElement;
    await user.upload(htmlFileInput, file);

    // Verify the file is in the input element
    expect(htmlFileInput.files?.[0]).toBe(file);
    expect(htmlFileInput.files?.item(0)).toBe(file);
    expect(htmlFileInput.files).toHaveLength(1);
  });

  it('should not call fetch if no file is selected and upload is clicked', async () => {
    const user = userEvent.setup();
    render(<UploadForm />); // Container not needed if not querying directly

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  
  it('should display the preview image after successful upload', async () => {
    const user = userEvent.setup();
    const mockImageUrl = 'http://example.com/uploaded-image.jpg';
    // Default mock in beforeEach handles the fetch response.

    // Render the component and get the container
    const { container } = render(<UploadForm />);

    const file = new File(['preview'], 'preview.jpg', { type: 'image/jpeg' });
    // Select the file input
    const fileInput = container.querySelector('input[type="file"]');

     if (!fileInput) {
        throw new Error("File input not found in the document");
    }

    // Assert the type to HTMLInputElement
    const htmlFileInput = fileInput as HTMLInputElement;
    await user.upload(htmlFileInput, file);

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);

    const previewImage = await screen.findByAltText('Uploaded preview');
    expect(previewImage).toBeInTheDocument();
    expect(previewImage).toHaveAttribute('src', mockImageUrl);
    expect(previewImage).toHaveAttribute('style', 'width: 200px;');
  });

  it('should not display preview image if upload fails (e.g., network error)', async () => {
    const user = userEvent.setup();
    const networkError = new Error('Network error'); // Define the specific error instance
    vi.mocked(global.fetch).mockRejectedValueOnce(networkError);

    const { container } = render(<UploadForm />);
    const file = new File(['network_error'], 'error.jpg', { type: 'image/jpeg' });
    const fileInput = container.querySelector('input[type="file"]');

    if (!fileInput) {
        throw new Error("File input not found in the document");
    }

    const htmlFileInput = fileInput as HTMLInputElement;
    await user.upload(htmlFileInput, file);
    const uploadButton = screen.getByRole('button', { name: /upload/i });

    // We expect 2 assertions:
    // 1. The UI does not show the preview image.
    // 2. The correct unhandled rejection (our networkError) occurs.
    expect.assertions(2);

    let capturedError: any = null;
    const unhandledRejectionListener = (error: any, promise: Promise<any>) => {
      capturedError = error;

      promise.catch(() => {}); // Prevent Node from exiting or logging further by attaching a catch
    };
    process.on('unhandledRejection', unhandledRejectionListener);

    // Perform the action that causes the rejection in the component
    await user.click(uploadButton);

    // Wait for the UI to settle and for the unhandledRejection event to be processed
    await waitFor(() => {
      // Assertion 1: Check the UI state
      expect(screen.queryByAltText('Uploaded preview')).not.toBeInTheDocument();
    });
    
    // Allow a tick for the unhandledRejection event to propagate and be captured
    // Using setImmediate or process.nextTick is more robust than setTimeout(0) for this.
    await new Promise(resolve => process.nextTick(resolve));


    // Assertion 2: Check that our listener caught the specific error
    expect(capturedError).toBe(networkError);

    // Clean up the listener
    process.removeListener('unhandledRejection', unhandledRejectionListener);
  });

   it('should not display preview image if API returns non-ok response', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Upload failed' }), 
      status: 500,
    } as Response);

    const { container } = render(<UploadForm />);
    const file = new File(['api_fail'], 'fail.jpg', { type: 'image/jpeg' });
    const fileInput = container.querySelector('input[type="file"]');

    if (!fileInput) {
        throw new Error("File input not found in the document");
    }

    const htmlFileInput = fileInput as HTMLInputElement;
    await user.upload(htmlFileInput, file);
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    
    // Expecting only the UI check here.
    // If the component's logic for a non-ok response were to throw an unhandled error,
    // a similar pattern to the 'network error' test would be needed.
    expect.assertions(1); 

    try {
        await user.click(uploadButton);
    } catch (error) {
       
    }

    await waitFor(() => {
        expect(screen.queryByAltText('Uploaded preview')).not.toBeInTheDocument();
    });
  });
});