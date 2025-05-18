import { Test, TestingModule } from '@nestjs/testing';
// Make sure the path below points to the actual location of upload.service.ts
import { UploadService } from '../upload/upload.service';
import { SupabaseService } from '../supabase.service'; // Adjust path as needed
import { ConfigService } from '@nestjs/config'; // SupabaseService might depend on ConfigService
import { BadRequestException } from '@nestjs/common'; // For more specific error testing

// Helper to create a mock Express.Multer.File object
const createMockFile = (
  filename = 'test-image.jpg',
  mimetype = 'image/jpeg',
  size = 1024,
): Express.Multer.File => {
  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype: mimetype,
    size: size,
    buffer: Buffer.from('test file content ' + filename), // Unique content per file
    stream: null as any,
    destination: './uploads',
    filename: `mock-${filename}`,
    path: `./uploads/mock-${filename}`,
  };
};

describe('UploadService', () => {
  let service: UploadService;
  let supabaseService: SupabaseService;

  // Mock the Supabase client and its chained methods
  const mockSupabaseUpload = jest.fn();
  const mockSupabaseFrom = jest.fn(() => ({ upload: mockSupabaseUpload }));
  const mockSupabaseStorage = { from: mockSupabaseFrom };
  const mockSupabaseClient = { storage: mockSupabaseStorage };

  const mockSupabaseService = {
    getClient: jest.fn(() => mockSupabaseClient),
  };

  let originalDateNow: () => number;
  const mockTimestamp = 1678886400000; // Example: March 15, 2023 12:00:00 PM UTC

  beforeEach(async () => {
    // Mock Date.now() for consistent filePath generation
    originalDateNow = Date.now;
    Date.now = jest.fn(() => mockTimestamp);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        // Example: Mock ConfigService if SupabaseService depends on it
        // {
        //   provide: ConfigService,
        //   useValue: { get: jest.fn().mockReturnValue('mock-value') },
        // },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    // Restore original Date.now()
    Date.now = originalDateNow;
    // Reset all mocks: clears call history, instances, and mock implementations/return values.
    jest.clearAllMocks();
    // Specifically reset the Supabase upload mock to ensure its resolved/rejected state is cleared.
    mockSupabaseUpload.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadImage', () => {
    const defaultMockFile = createMockFile('test.jpg', 'image/jpeg');
    const expectedDefaultFilePath = `uploads/${mockTimestamp}-test.jpg`;

    it('should successfully upload an image and return path and URL', async () => {
      const mockSupabaseResponseData = { path: expectedDefaultFilePath };
      // Configure mock for this specific test
      mockSupabaseUpload.mockResolvedValue({
        data: mockSupabaseResponseData,
        error: null,
      });

      const result = await service.uploadImage(defaultMockFile);

      expect(supabaseService.getClient).toHaveBeenCalledTimes(1);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('images');
      expect(mockSupabaseUpload).toHaveBeenCalledWith(
        expectedDefaultFilePath,
        defaultMockFile.buffer,
        { contentType: defaultMockFile.mimetype },
      );
      expect(result).toEqual({
        path: expectedDefaultFilePath,
        url: `https://euudlgzarnvbsvzlizcu.supabase.co/storage/v1/object/public/images/${expectedDefaultFilePath}`,
      });
    });

    it('should throw an error if Supabase storage returns an error', async () => {
      const errorMessage = 'Supabase upload failed: Bucket not found';
      // Configure mock for this specific test
      mockSupabaseUpload.mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      });

      await expect(service.uploadImage(defaultMockFile)).rejects.toThrow(errorMessage);
      expect(mockSupabaseUpload).toHaveBeenCalledWith(
        expectedDefaultFilePath,
        defaultMockFile.buffer,
        { contentType: defaultMockFile.mimetype },
      );
    });

    it('should construct the correct file path with a different original filename', async () => {
      const differentFile = createMockFile('another-image.png', 'image/png');
      const expectedDifferentPath = `uploads/${mockTimestamp}-another-image.png`;
      // Configure mock for this specific test
      mockSupabaseUpload.mockResolvedValue({
        data: { path: expectedDifferentPath },
        error: null,
      });

      await service.uploadImage(differentFile);

      expect(mockSupabaseUpload).toHaveBeenCalledWith(
        expectedDifferentPath,
        differentFile.buffer,
        { contentType: differentFile.mimetype },
      );
    });

    it('should proceed with "undefined" in filepath if file.originalname is missing, and call Supabase upload', async () => {
      // Create a file mock where originalname would be undefined
      // Casting to any first, then to Express.Multer.File to bypass strict checks for test setup
      const malformedFile: Express.Multer.File = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test for undefined originalname'),
        // originalname is omitted, so it will be undefined
      } as any as Express.Multer.File;

      const expectedPathWithUndefined = `uploads/${mockTimestamp}-undefined`;

      // Configure mock for this specific test
      mockSupabaseUpload.mockResolvedValue({
        data: { path: expectedPathWithUndefined },
        error: null,
      });

      const result = await service.uploadImage(malformedFile);

      // Verify that the upload was attempted with the path containing "undefined"
      expect(mockSupabaseUpload).toHaveBeenCalledWith(
        expectedPathWithUndefined,
        malformedFile.buffer,
        { contentType: malformedFile.mimetype },
      );
      // Verify the result based on the successful (mocked) upload
      expect(result.path).toBe(expectedPathWithUndefined);
      expect(result.url).toContain(expectedPathWithUndefined);
    });

    it('should throw an error if file.buffer is undefined when Supabase upload is attempted', async () => {
      const fileWithoutBuffer: Express.Multer.File = {
        originalname: 'no-buffer.jpg',
        mimetype: 'image/jpeg',
        // buffer is omitted, so it will be undefined
      } as any as Express.Multer.File;

      const expectedPathForNoBufferFile = `uploads/${mockTimestamp}-no-buffer.jpg`;
      const errorMessage = "File buffer is undefined and cannot be uploaded.";

      // Configure mockSupabaseUpload for this specific test to simulate an error
      // when the buffer is undefined. This mimics how a real client or a more
      // defensive service might react.
      mockSupabaseUpload.mockImplementation(async (path, buffer, options) => {
        if (buffer === undefined) {
          // This simulates the Supabase client itself throwing an error,
          // or a pre-check in a more defensive version of the service.
          throw new TypeError(errorMessage); // Or new Error(errorMessage)
        }
        // This part should ideally not be reached if buffer is undefined
        return { data: { path }, error: null };
      });

      // Expect the service.uploadImage call to reject
      await expect(service.uploadImage(fileWithoutBuffer)).rejects.toThrow(TypeError);
      await expect(service.uploadImage(fileWithoutBuffer)).rejects.toThrow(errorMessage);

      // Verify that the upload attempt was made, which then led to the mock throwing the error
      expect(mockSupabaseUpload).toHaveBeenCalledWith(
        expectedPathForNoBufferFile,
        undefined, // buffer is undefined
        { contentType: fileWithoutBuffer.mimetype },
      );
    });
  });
});
