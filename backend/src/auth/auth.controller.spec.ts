import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { User } from './user.entity'; // Assuming path to User entity

// Mock User data based on your User entity
const mockUserPayload = (userId: string, role: string = 'buyer', otherProps: Record<string, any> = {}) => ({
  sub: userId, // 'sub' is commonly used for user ID in JWT payloads
  userID: userId, // Matching your User entity's primary key
  role: role,
  // Add any other properties that your req.user might have from the JWT payload
  ...otherProps,
  // Ensure the structure aligns with what AuthGuard('jwt') populates req.user with
});

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    saveUserInfo: jest.fn(),
    promoteUserToSeller: jest.fn(),
    getUserRole: jest.fn(),
  };

  // Mock request object
  let mockRequest: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
    // Override the AuthGuard('jwt') for all methods in this controller
    .overrideGuard(AuthGuard('jwt'))
    .useValue({
        canActivate: jest.fn(() => true), // Mock canActivate to always return true
    })
    .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    // Initialize mockRequest for each test
    mockRequest = {
      user: mockUserPayload('test-user-id-123'), // Default mock user for each test
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerUser', () => {
    it('should call authService.saveUserInfo with req.user and return its result', async () => {
      const expectedResult = { userId: mockRequest.user.sub, status: 'registered' };
      mockAuthService.saveUserInfo.mockResolvedValue(expectedResult);

      const result = await controller.registerUser(mockRequest);

      expect(service.saveUserInfo).toHaveBeenCalledWith(mockRequest.user);
      expect(result).toEqual(expectedResult);
    });

    it('should handle errors from authService.saveUserInfo', async () => {
      const error = new Error('Registration failed');
      mockAuthService.saveUserInfo.mockRejectedValue(error);

      await expect(controller.registerUser(mockRequest)).rejects.toThrow(error);
      expect(service.saveUserInfo).toHaveBeenCalledWith(mockRequest.user);
    });
  });

  describe('promoteToSeller', () => {
    it('should call authService.promoteUserToSeller with req.user and return its result', async () => {
      const updatedUser = { ...mockRequest.user, role: 'seller' };
      mockAuthService.promoteUserToSeller.mockResolvedValue(updatedUser);

      const result = await controller.promoteToSeller(mockRequest);

      expect(service.promoteUserToSeller).toHaveBeenCalledWith(mockRequest.user);
      expect(result).toEqual(updatedUser);
    });

    it('should handle errors from authService.promoteUserToSeller', async () => {
      const error = new Error('Promotion failed');
      mockAuthService.promoteUserToSeller.mockRejectedValue(error);

      await expect(controller.promoteToSeller(mockRequest)).rejects.toThrow(error);
      expect(service.promoteUserToSeller).toHaveBeenCalledWith(mockRequest.user);
    });
  });

  describe('getMe', () => {
    it('should call authService.getUserRole with req.user.sub and return its result', async () => {
      const userRole = { role: 'buyer' };
      mockAuthService.getUserRole.mockResolvedValue(userRole);

      const result = await controller.getMe(mockRequest);

      expect(service.getUserRole).toHaveBeenCalledWith(mockRequest.user.sub);
      expect(result).toEqual(userRole);
    });

    it('should handle cases where req.user or req.user.sub might be undefined (though guard should prevent)', async () => {
      // This scenario should ideally be prevented by the AuthGuard
      // But good to ensure the controller doesn't break catastrophically if it happens
      const requestWithoutUserSub = { user: {} }; // No 'sub'
      // We expect getUserRole to potentially throw or handle this,
      // or the call to it to fail if `undefined` is passed where a string is expected.
      // Let's assume the service handles it by e.g. throwing an error if sub is undefined.
      mockAuthService.getUserRole.mockImplementation((sub) => {
        if (!sub) return Promise.reject(new Error('User sub not provided'));
        return Promise.resolve({ role: 'unknown' });
      });

      await expect(controller.getMe(requestWithoutUserSub)).rejects.toThrow('User sub not provided');
      expect(service.getUserRole).toHaveBeenCalledWith(undefined); // service was called with undefined
    });

     it('should handle errors from authService.getUserRole', async () => {
      const error = new Error('Failed to get user role');
      mockAuthService.getUserRole.mockRejectedValue(error);

      await expect(controller.getMe(mockRequest)).rejects.toThrow(error);
      expect(service.getUserRole).toHaveBeenCalledWith(mockRequest.user.sub);
    });
  });
});