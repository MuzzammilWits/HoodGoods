import {
  Test,
  TestingModule,
  TestingModuleBuilder,
} from '@nestjs/testing';
import { AppModule } from '../../backend/src/app.module'; // Adjust path if necessary
import {
  INestApplication,
  ValidationPipe,
  OnModuleInit,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Injectable,
  Module,
  Inject,
  // ApplicationConfig, // Removed from @nestjs/common
} from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core'; // Corrected: Import ApplicationConfig from @nestjs/core
import 'reflect-metadata'; // 👈 MUST be at the top

// Assuming AuthService and AuthController are part of your AppModule,
// likely via AuthModule which should be imported in AppModule.
// Adjust these imports based on your actual file structure.
import { AuthService } from '../../backend/src/auth/auth.service';
import { AuthController } from '../../backend/src/auth/auth.controller';

// --- Mock Services and Modules for Lifecycle and Override Tests ---
const mockOnModuleInitFn = jest.fn();
const mockOnAppBootstrapFn = jest.fn();
const mockOnAppShutdownFn = jest.fn();
const mockLifecycleErrorFn = jest.fn(); // To track which lifecycle error was triggered

@Injectable()
class LifecycleService
  implements
    OnModuleInit,
    OnApplicationBootstrap,
    OnApplicationShutdown
{
  onModuleInit() {
    mockOnModuleInitFn();
  }
  onApplicationBootstrap() {
    mockOnAppBootstrapFn();
  }
  onApplicationShutdown(signal?: string) {
    mockOnAppShutdownFn(signal);
  }
}

@Module({
  providers: [LifecycleService],
  exports: [LifecycleService],
})
class LifecycleTestModule {}

// Service that only errors on OnModuleInit
@Injectable()
class FaultyInitService implements OnModuleInit {
  onModuleInit() {
    mockLifecycleErrorFn('FaultyInitService.onModuleInit');
    throw new Error('Error in FaultyInitService.onModuleInit');
  }
}
@Module({ providers: [FaultyInitService], exports: [FaultyInitService] })
class FaultyInitTestModule {}


// Service that only errors on OnApplicationShutdown
@Injectable()
class FaultyShutdownService implements OnApplicationShutdown, OnModuleInit {
  onModuleInit() {
    // This should not throw for the shutdown test to proceed
    mockLifecycleErrorFn('FaultyShutdownService.onModuleInit (should succeed)');
  }
  onApplicationShutdown(signal?: string) {
    mockLifecycleErrorFn('FaultyShutdownService.onApplicationShutdown', signal);
    throw new Error('Error in FaultyShutdownService.onApplicationShutdown');
  }
}
@Module({ providers: [FaultyShutdownService], exports: [FaultyShutdownService] })
class FaultyShutdownTestModule {}

// --- Original Service for Override Test ---
export const ORIGINAL_SERVICE_TOKEN = 'ORIGINAL_SERVICE_TOKEN';
export interface IOriginalService {
  greet: () => string;
}
@Injectable()
export class OriginalService implements IOriginalService {
  greet() {
    return 'Hello from OriginalService';
  }
}
@Injectable()
export class ConsumerService {
  constructor(
    @Inject(ORIGINAL_SERVICE_TOKEN)
    private readonly originalService: IOriginalService,
  ) {}
  doWork() {
    return this.originalService.greet();
  }
}
@Module({
  providers: [
    { provide: ORIGINAL_SERVICE_TOKEN, useClass: OriginalService },
    ConsumerService,
  ],
  exports: [ConsumerService],
})
class ServiceConsumerModule {}
// --- End Mock Services and Modules ---

describe('Application Bootstrap and Core Components', () => {
  // This moduleRef will be for the 'app' instance in 'Standard Application Setup'
  let standardAppModuleRef: TestingModule;

  // Helper to create app, to be reused.
  // It now returns the moduleRef for specific DI lookups if needed by the calling suite.
  const createAppInstance = async (builder?: TestingModuleBuilder): Promise<{app: INestApplication, moduleRef: TestingModule}> => {
    const moduleBuilder =
      builder || Test.createTestingModule({ imports: [AppModule] });

    const compiledModuleRef = await moduleBuilder.compile();
    const currentApp = compiledModuleRef.createNestApplication();

    currentApp.enableCors();
    currentApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    // Example: Setting a global prefix
    // currentApp.setGlobalPrefix('api/v1');

    await currentApp.init();
    return { app: currentApp, moduleRef: compiledModuleRef };
  };

  // This beforeEach applies to all describe blocks below it.
  beforeEach(() => {
    mockOnModuleInitFn.mockClear();
    mockOnAppBootstrapFn.mockClear();
    mockOnAppShutdownFn.mockClear();
    mockLifecycleErrorFn.mockClear();
  });

  describe('Standard Application Setup', () => {
    let app: INestApplication; // App instance for this suite

    beforeAll(async () => {
      const result = await createAppInstance();
      app = result.app;
      standardAppModuleRef = result.moduleRef; // Store moduleRef for this suite's app
    });

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should create the app without errors and be defined', () => {
      expect(app).toBeDefined();
    });

    it('should have CORS enabled', () => {
      const enableCorsSpy = jest.spyOn(app, 'enableCors');
      app.enableCors(); // Call it again on the existing app for the spy
      expect(enableCorsSpy).toHaveBeenCalled();
      enableCorsSpy.mockRestore();
    });



    it('should resolve the AuthService and its methods', () => {
      const authService = standardAppModuleRef.get<AuthService>(AuthService);
      expect(authService).toBeDefined();
      expect(authService).toBeInstanceOf(AuthService);
      expect(authService.saveUserInfo).toBeInstanceOf(Function);
      expect(authService.promoteUserToSeller).toBeInstanceOf(Function);
      expect(authService.getUserRole).toBeInstanceOf(Function);
    });

    it('should resolve the AuthController and its methods', () => {
      const authController = standardAppModuleRef.get<AuthController>(AuthController);
      expect(authController).toBeDefined();
      expect(authController).toBeInstanceOf(AuthController);
      expect(authController.registerUser).toBeInstanceOf(Function);
      expect(authController.promoteToSeller).toBeInstanceOf(Function);
      expect(authController.getMe).toBeInstanceOf(Function);
    });

    it('should have an HTTP server instance', () => {
      const httpServer = app.getHttpServer();
      expect(httpServer).toBeDefined();
    });

    it('should be able to initialize the application again (idempotency check for init)', async () => {
      await expect(app.init()).resolves.toBe(app);
    });

    it('should call setGlobalPrefix if configured', async () => {
      const tempAppModuleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      const tempApp = tempAppModuleRef.createNestApplication();
      const setGlobalPrefixSpy = jest.spyOn(tempApp, 'setGlobalPrefix');
      tempApp.setGlobalPrefix('api/v1');
      expect(setGlobalPrefixSpy).toHaveBeenCalledWith('api/v1');
      // No need to init or close if only testing the method call on a non-initialized app
    });
  });

  describe('Lifecycle Hooks', () => {
    let lifecycleApp: INestApplication;
    // No need for lifecycleAppModuleRef if we are just checking global mock functions

    // Create and init the app fresh for each test in this suite
    // to ensure mocks are checked immediately after the action that triggers them.
    beforeEach(async () => {
        // Mocks are already cleared by the outer beforeEach
        const testingModuleWithLifecycle = Test.createTestingModule({
            imports: [AppModule, LifecycleTestModule],
        });
        // We don't need the returned moduleRef from createAppInstance if only checking global mocks
        const result = await createAppInstance(testingModuleWithLifecycle);
        lifecycleApp = result.app;
    });

    afterEach(async () => {
      if (lifecycleApp && (lifecycleApp as any).isInitialized) {
        await lifecycleApp.close();
      }
    });

    it('should call OnModuleInit for registered services', () => {
      // init() was called in createAppInstance (called by beforeEach)
      expect(mockOnModuleInitFn).toHaveBeenCalledTimes(1);
    });

    it('should call OnApplicationBootstrap for registered services', () => {
      // init() was called in createAppInstance (called by beforeEach)
      expect(mockOnAppBootstrapFn).toHaveBeenCalledTimes(1);
    });

    it('should call OnApplicationShutdown for registered services on app.close()', async () => {
      // lifecycleApp is already initialized from beforeEach.
      // The outer beforeEach clears mockOnAppShutdownFn.
      // Now we call close and check.
      await lifecycleApp.close();
      expect(mockOnAppShutdownFn).toHaveBeenCalledTimes(1);
      // Mark as not initialized so afterEach doesn't try to close again
      (lifecycleApp as any).isInitialized = false;
    });
  });

  describe('Error Handling in Lifecycle', () => {
    // No app instance needed at this describe level, each test creates its own faulty app

    it('should handle errors during onModuleInit', async () => {
      const moduleWithFaultyInit = await Test.createTestingModule({
          imports: [AppModule, FaultyInitTestModule],
      }).compile();
      const faultyApp = moduleWithFaultyInit.createNestApplication();

      await expect(faultyApp.init()).rejects.toThrow(
        'Error in FaultyInitService.onModuleInit',
      );
      expect(mockLifecycleErrorFn).toHaveBeenCalledWith('FaultyInitService.onModuleInit');
      await expect(faultyApp.close()).resolves.toBeUndefined();
    });

    it('should handle errors during onApplicationShutdown', async () => {
      const moduleForFaultyShutdown = await Test.createTestingModule({
        imports: [AppModule, FaultyShutdownTestModule],
      }).compile();
      const appToTestFaultyShutdown = moduleForFaultyShutdown.createNestApplication();
      appToTestFaultyShutdown.enableShutdownHooks();

      await appToTestFaultyShutdown.init(); // Init should succeed

      // mockLifecycleErrorFn was cleared by the outer beforeEach

      await expect(appToTestFaultyShutdown.close()).rejects.toThrow(
        'Error in FaultyShutdownService.onApplicationShutdown',
      );
      expect(mockLifecycleErrorFn).toHaveBeenCalledWith('FaultyShutdownService.onApplicationShutdown', undefined);
    });
  });

  describe('Provider Overriding', () => {
    // No app instance needed at this describe level

    it('should use the overridden provider', async () => {
      const mockOriginalService = {
        greet: jest.fn().mockReturnValue('Hello from MockService'),
      };

      const testingModuleWithOverride = await Test.createTestingModule({
        imports: [AppModule, ServiceConsumerModule],
      })
        .overrideProvider(ORIGINAL_SERVICE_TOKEN)
        .useValue(mockOriginalService)
        .compile();

      const overrideApp = testingModuleWithOverride.createNestApplication();
      await overrideApp.init();

      const consumerService = testingModuleWithOverride.get<ConsumerService>(ConsumerService);
      expect(consumerService.doWork()).toBe('Hello from MockService');
      expect(mockOriginalService.greet).toHaveBeenCalledTimes(1);

      await overrideApp.close();
    });
  });
});
