import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { PopularProductDto } from './dto/popular-product.dto';
import { DefaultValuePipe, ParseIntPipe, ArgumentMetadata } from '@nestjs/common'; // Added ArgumentMetadata

// Mock data helper function for PopularProductDto
const mockPopularProduct = (props: Partial<PopularProductDto> = {}): PopularProductDto => ({
  productId: props.productId || Math.floor(Math.random() * 1000) + 1,
  name: props.name || 'Test Product',
  imageUrl: props.imageUrl || 'http://example.com/image.png',
  storeName: props.storeName || 'Test Store',
  salesCount: props.salesCount || Math.floor(Math.random() * 100) + 1,
  productPrice: props.productPrice || parseFloat((Math.random() * 100).toFixed(2)),
  productquantity: props.productquantity || Math.floor(Math.random() * 50) + 1, // Matches DTO field name
  storeId: props.storeId || `store-${Math.random().toString(36).substring(7)}`,
  userId: props.userId || `user-${Math.random().toString(36).substring(7)}`,
  ...props, // Allows overriding any field specifically in a test
});

// Helper to create ArgumentMetadata
const createArgMetadata = (dataName: string, type: 'query' | 'param' | 'body' | 'custom' = 'query'): ArgumentMetadata => ({
    type: type,
    metatype: Number, // Assuming the target type is Number for ParseIntPipe
    data: dataName,
});


describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let service: RecommendationsService;

  // Create a mock RecommendationsService
  const mockRecommendationsService = {
    getBestSellingProducts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        {
          provide: RecommendationsService,
          useValue: mockRecommendationsService,
        },
        // You might need to provide the pipes if they have dependencies or complex setup,
        // but for default pipes, this is often not strictly necessary for them to be newed up.
        // DefaultValuePipe,
        // ParseIntPipe,
      ],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
    service = module.get<RecommendationsService>(RecommendationsService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mock calls after each test
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBestSellingProducts', () => {
    it('should call service with default limit (10) and timeWindowDays (30) if no params provided', async () => {
      const expectedProducts: PopularProductDto[] = [mockPopularProduct()];
      mockRecommendationsService.getBestSellingProducts.mockResolvedValue(expectedProducts);

      // Simulating how NestJS would pass the values after pipes
      // DefaultValuePipe's transform is synchronous.
      const limit = new DefaultValuePipe(10).transform(undefined, createArgMetadata('limit'));
      const timeWindowDays = new DefaultValuePipe(30).transform(undefined, createArgMetadata('timeWindowDays'));

      const result = await controller.getBestSellingProducts(limit, timeWindowDays);

      expect(service.getBestSellingProducts).toHaveBeenCalledWith(10, 30);
      expect(result).toEqual(expectedProducts);
    });

    it('should call service with custom limit and default timeWindowDays', async () => {
      const customLimit = 5;
      const expectedProducts: PopularProductDto[] = [mockPopularProduct()];
      mockRecommendationsService.getBestSellingProducts.mockResolvedValue(expectedProducts);

      // Simulating pipe transformation
      // ParseIntPipe's transform can be async if custom error handling or other features are used,
      // or if the typings suggest it. It's safer to await.
      const limit = await new ParseIntPipe().transform(String(customLimit), createArgMetadata('limit'));
      const timeWindowDays = new DefaultValuePipe(30).transform(undefined, createArgMetadata('timeWindowDays'));

      const result = await controller.getBestSellingProducts(limit, timeWindowDays);

      expect(service.getBestSellingProducts).toHaveBeenCalledWith(customLimit, 30);
      expect(result).toEqual(expectedProducts);
    });

    it('should call service with default limit and custom timeWindowDays', async () => {
      const customTimeWindow = 7;
      const expectedProducts: PopularProductDto[] = [mockPopularProduct()];
      mockRecommendationsService.getBestSellingProducts.mockResolvedValue(expectedProducts);

      // Simulating pipe transformation
      const limit = new DefaultValuePipe(10).transform(undefined, createArgMetadata('limit'));
      const timeWindowDays = await new ParseIntPipe().transform(String(customTimeWindow), createArgMetadata('timeWindowDays'));

      const result = await controller.getBestSellingProducts(limit, timeWindowDays);

      expect(service.getBestSellingProducts).toHaveBeenCalledWith(10, customTimeWindow);
      expect(result).toEqual(expectedProducts);
    });

    it('should call service with custom limit and custom timeWindowDays', async () => {
      const customLimit = 15;
      const customTimeWindow = 60;
      const expectedProducts: PopularProductDto[] = [mockPopularProduct(), mockPopularProduct()];
      mockRecommendationsService.getBestSellingProducts.mockResolvedValue(expectedProducts);

      // Simulating pipe transformation
      const limit = await new ParseIntPipe().transform(String(customLimit), createArgMetadata('limit'));
      const timeWindowDays = await new ParseIntPipe().transform(String(customTimeWindow), createArgMetadata('timeWindowDays'));

      const result = await controller.getBestSellingProducts(limit, timeWindowDays);

      expect(service.getBestSellingProducts).toHaveBeenCalledWith(customLimit, customTimeWindow);
      expect(result).toEqual(expectedProducts);
    });

    it('should return the array of PopularProductDto from the service', async () => {
      const mockProducts: PopularProductDto[] = [
        mockPopularProduct({ productId: 1, name: 'Product A', salesCount: 100, productPrice: 19.99, productquantity: 10, storeId: 'store-abc', userId: 'user-xyz', storeName: 'Store Mart', imageUrl: 'imgA.jpg' }),
        mockPopularProduct({ productId: 2, name: 'Product B', salesCount: 150, productPrice: 29.99, productquantity: 5, storeId: 'store-def', userId: 'user-uvw', storeName: 'Another Store', imageUrl: 'imgB.jpg' }),
      ];
      mockRecommendationsService.getBestSellingProducts.mockResolvedValue(mockProducts);

      const limit = 10; // Arbitrary valid values for this test
      const timeWindowDays = 30;
      const result = await controller.getBestSellingProducts(limit, timeWindowDays);

      expect(result).toBeInstanceOf(Array);
      expect(result).toEqual(mockProducts);
      expect(result.length).toBe(2);
      expect(result[0].productId).toBe(1);
      // ... (other assertions remain the same)
      expect(service.getBestSellingProducts).toHaveBeenCalledWith(limit, timeWindowDays);
    });

     it('should correctly handle optional fields if they are not present', async () => {
      const productWithoutOptionalFields = mockPopularProduct({
        productId: 3,
        name: 'Product C',
        salesCount: 50,
        productPrice: 9.99,
        productquantity: 20,
        storeId: 'store-ghi',
        userId: 'user-rst',
      });
      delete productWithoutOptionalFields.imageUrl;
      delete productWithoutOptionalFields.storeName;

      const expectedProducts: PopularProductDto[] = [productWithoutOptionalFields];
      mockRecommendationsService.getBestSellingProducts.mockResolvedValue(expectedProducts);

      const limit = 1; // For DefaultValuePipe, this will be a direct number
      const timeWindowDays = 30; // For DefaultValuePipe, this will be a direct number

      const result = await controller.getBestSellingProducts(limit, timeWindowDays);

      expect(service.getBestSellingProducts).toHaveBeenCalledWith(limit, timeWindowDays);
      expect(result).toEqual(expectedProducts);
      expect(result[0].imageUrl).toBeUndefined();
      expect(result[0].storeName).toBeUndefined();
      expect(result[0].productId).toBe(3);
    });
  });
});