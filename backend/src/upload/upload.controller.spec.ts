import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer'; // Import Multer for Express.Multer.File type

// Helper to create a mock Express.Multer.File object
const createMockFile = (
  filename = 'test-image.jpg',
  mimetype = 'image/jpeg',
  size = 1024,
): Express.Multer.File => {
  return {
    fieldname: 'file', // This should match the fieldname in FileInterceptor('file')
    originalname: filename,
    encoding: '7bit',
    mimetype: mimetype,
    size: size,
    buffer: Buffer.from('test file content'), // Mock file content
    stream: null as any, // Stream is not typically used in basic unit tests like this
    destination: './uploads', // Mock destination
    filename: `mock-${filename}`, // Mock generated filename
    path: `./uploads/mock-${filename}`, // Mock path
  };
};

describe('UploadController', () => {
  let controller: UploadController;
  let service: UploadService;

  const mockUploadService = {
    uploadImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    })
    // We don't need to override the FileInterceptor itself for unit testing the controller's logic,
    // as we will be directly passing the @UploadedFile() parameter.
    // The interceptor's job is to populate that parameter based on the request.
    // For e2e tests, the interceptor would be fully active.
    .compile();

    controller = module.get<UploadController>(UploadController);
    service = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadImage', () => {
    it('should call uploadService.uploadImage with the uploaded file and return its result', async () => {
      const mockFile = createMockFile();
      const expectedResult = {
        message: 'File uploaded successfully',
        url: 'http://example.com/uploads/test-image.jpg',
        filename: 'test-image.jpg',
      };
      mockUploadService.uploadImage.mockResolvedValue(expectedResult);

      const result = await controller.uploadImage(mockFile);

      // Check if the service method was called with the mock file
      expect(service.uploadImage).toHaveBeenCalledWith(mockFile);
      // Check if the controller returned the result from the service
      expect(result).toEqual(expectedResult);
    });

    it('should handle cases where no file is uploaded (file is undefined)', async () => {
      // This scenario simulates if the FileInterceptor somehow allows an undefined file
      // or if the @UploadedFile decorator returns undefined when no file is present.
      // Note: Typically, FileInterceptor might throw an error or handle this before it reaches the controller.
      // If it does reach the controller as undefined, the service should handle it.
      const undefinedFile = undefined as unknown as Express.Multer.File; // Cast to satisfy type, but it's undefined
      const expectedErrorResult = {
        statusCode: 400,
        message: 'No file uploaded or file is invalid.', // Example error from service
      };
      // Assuming the service would throw or return an error structure
      mockUploadService.uploadImage.mockImplementation(async (fileArg) => {
        if (!fileArg) {
          // Simulate service throwing an error or returning a specific error DTO
          // For this example, let's assume it returns an error object
          // throw new BadRequestException('No file uploaded.');
          return Promise.resolve(expectedErrorResult);
        }
        return Promise.resolve({ url: 'some-url' });
      });

      const result = await controller.uploadImage(undefinedFile);

      expect(service.uploadImage).toHaveBeenCalledWith(undefinedFile);
      expect(result).toEqual(expectedErrorResult); // Or check for thrown exception if service throws
    });

    it('should handle errors from uploadService.uploadImage', async () => {
      const mockFile = createMockFile('error-file.png');
      const error = new Error('Upload failed due to network issue');
      mockUploadService.uploadImage.mockRejectedValue(error);

      // We expect the controller to propagate the error or handle it as per application design
      await expect(controller.uploadImage(mockFile)).rejects.toThrow(error);
      expect(service.uploadImage).toHaveBeenCalledWith(mockFile);
    });

    it('should correctly pass a different file type to the service', async () => {
        const mockPngFile = createMockFile('document.png', 'image/png', 2048);
        const expectedResult = {
            message: 'PNG uploaded',
            url: 'http://example.com/uploads/document.png',
            filename: 'document.png'
        };
        mockUploadService.uploadImage.mockResolvedValue(expectedResult);

        const result = await controller.uploadImage(mockPngFile);
        expect(service.uploadImage).toHaveBeenCalledWith(mockPngFile);
        expect(result).toEqual(expectedResult);
    });
  });
});
