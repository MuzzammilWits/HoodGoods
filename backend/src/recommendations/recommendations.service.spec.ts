import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { PopularProductDto } from './dto/popular-product.dto';
import { DefaultValuePipe, ParseIntPipe, ArgumentMetadata } from '@nestjs/common';

// Mock data helper function for PopularProductDto
const mockPopularProduct = (props: Partial<PopularProductDto> = {}): PopularProductDto => ({
  productId: props.productId || Math.floor(Math.random() * 1000) + 1,
  name: props.name || 'Test Product',
  imageUrl: props.imageUrl === null ? undefined : (props.imageUrl || 'http://example.com/image.png'),
  storeName: props.storeName === null ? undefined : (props.storeName || 'Test Store'),
  salesCount: props.salesCount || Math.floor(Math.random() * 100) + 1,
  productPrice: props.productPrice || parseFloat((Math.random() * 100).toFixed(2)),
  productquantity: props.productquantity || Math.floor(Math.random() * 50) + 1,
  storeId: props.storeId || `store-${Math.random().toString(36).substring(7)}`,
  userId: props.userId || `user-${Math.random().toString(36).substring(7)}`,
  ...props,
});

// Helper to create ArgumentMetadata
const createArgMetadata = (dataName: string, metatype?: any, type: 'query' | 'param' | 'body' | 'custom' = 'query'): ArgumentMetadata => ({
    type: type,
    metatype: metatype || Number, // Default to Number, adjust if other types are expected by pipes
    data: dataName,
});


describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let service: RecommendationsService;

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
      ],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
    service = module.get<RecommendationsService>(RecommendationsService); // Though it's the mock
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBestSellingProducts', () => {
    it('should call service with default limit (10) and timeWindowDays (30) if no params provided', async () => {
      const expectedProducts: PopularProductDto[] = [mockPopularProduct()];
      mockRecommendationsService.getBestSellingProducts.mockResolvedValue(expectedProducts);

      const limit = new DefaultValuePipe(10).transform(undefined, createArgMetadata('limit', Number));
      // ParseIntPipe runs after DefaultValuePipe, so the input to ParseIntPipe is the result of DefaultValuePipe
      const finalLimit = await new ParseIntPipe().transform(limit, createArgMetadata('limit', Number));

      const timeWindowDays = new DefaultValuePipe(30).transform(undefined, createArgMetadata('timeWindowDays', Number));
      const finalTimeWindowDays = await new ParseIntPipe().transform(timeWindowDays, createArgMetadata('timeWindowDays', Number));


      const result = await controller.getBestSellingProducts(finalLimit, finalTimeWindowDays);

      expect(service.getBestSellingProducts).toHaveBeenCalledWith(10, 30);
      expect(result).toEqual(expectedProducts);
    });

    it('should call service with custom limit and default timeWindowDays', async () => {
      const customLimit = 5;
      const expectedProducts: PopularProductDto[] = [mockPopularProduct()];
      mockRecommendationsService.getBestSellingProducts.mockResolvedValue(expectedProducts);

      // Simulate DefaultValuePipe (won't apply as value is provided), then ParseIntPipe for limit
      const limit = await new ParseIntPipe().transform(String(customLimit), createArgMetadata('limit', Number));

      // Simulate DefaultValuePipe then ParseIntPipe for timeWindowDays
      const timeWindowDaysDefault = new DefaultValuePipe(30).transform(undefined, createArgMetadata('timeWindowDays', Number));
      const timeWindowDays = await new ParseIntPipe().transform(timeWindowDaysDefault, createArgMetadata('timeWindowDays', Number));

      const result = await controller.getBestSellingProducts(limit, timeWindowDays);

      expect(service.getBestSellingProducts).toHaveBeenCalledWith(customLimit, 30);
      expect(result).toEqual(expectedProducts);
    });

    it('should call service with default limit and custom timeWindowDays', async () => {
      const customTimeWindow = 7;
      const expectedProducts: PopularProductDto[] = [mockPopularProduct()];
      mockRecommendationsService.getBestSellingProducts.mockResolvedValue(expectedProducts);

      // Simulate DefaultValuePipe then ParseIntPipe for limit
      const limitDefault = new DefaultValuePipe(10).transform(undefined, createArgMetadata('limit', Number));
      const limit = await new ParseIntPipe().transform(limitDefault, createArgMetadata('limit', Number));

      // Simulate DefaultValuePipe (won't apply), then ParseIntPipe for timeWindowDays
      const timeWindowDays = await new ParseIntPipe().transform(String(customTimeWindow), createArgMetadata('timeWindowDays', Number));


      const result = await controller.getBestSellingProducts(limit, timeWindowDays);

      expect(service.getBestSellingProducts).toHaveBeenCalledWith(10, customTimeWindow);
      expect(result).toEqual(expectedProducts);
    });

    it('should call service with custom limit and custom timeWindowDays', async () => {
      const customLimit = 15;
      const customTimeWindow = 60;
      const expectedProducts: PopularProductDto[] = [mockPopularProduct(), mockPopularProduct()];
      mockRecommendationsService.getBestSellingProducts.mockResolvedValue(expectedProducts);

      const limit = await new ParseIntPipe().transform(String(customLimit), createArgMetadata('limit', Number));
      const timeWindowDays = await new ParseIntPipe().transform(String(customTimeWindow), createArgMetadata('timeWindowDays', Number));

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

      // Using arbitrary valid numbers directly as pipe simulation is tested elsewhere for this specific outcome
      const limit = 10;
      const timeWindowDays = 30;
      const result = await controller.getBestSellingProducts(limit, timeWindowDays);

      expect(result).toBeInstanceOf(Array);
      expect(result).toEqual(mockProducts);
      expect(result.length).toBe(2);
      expect(result[0].productId).toBe(1);
      expect(result[0].name).toBe('Product A');
      expect(service.getBestSellingProducts).toHaveBeenCalledWith(limit, timeWindowDays);
    });

     it('should correctly handle optional fields (imageUrl, storeName) if they are not present in DTO', async () => {
      const productWithoutOptionalFields = mockPopularProduct({
        productId: 3,
        name: 'Product C',
        // Intentionally set to undefined to simulate DB value that might be null
        imageUrl: undefined,
        storeName: undefined,
        salesCount: 50,
        productPrice: 9.99,
        productquantity: 20,
        storeId: 'store-ghi',
        userId: 'user-rst',
      });


      const expectedProducts: PopularProductDto[] = [productWithoutOptionalFields];
      mockRecommendationsService.getBestSellingProducts.mockResolvedValue(expectedProducts);

      const limit = 1;
      const timeWindowDays = 30;
      const result = await controller.getBestSellingProducts(limit, timeWindowDays);

      expect(service.getBestSellingProducts).toHaveBeenCalledWith(limit, timeWindowDays);
      expect(result).toEqual(expectedProducts);
      // If DTO defines them as string | undefined, undefined from DB should be passed as undefined.
      expect(result[0].imageUrl).toBeUndefined();
      expect(result[0].storeName).toBeUndefined();
      expect(result[0].productId).toBe(3);
    });

    it('should throw error if ParseIntPipe receives non-numeric string for limit', async () => {
        const limit = 'not-a-number';
        const timeWindowDays = '30'; // valid

        const parseIntPipe = new ParseIntPipe();
        try {
            await parseIntPipe.transform(limit, createArgMetadata('limit', Number));
        } catch (error) {
            expect(error).toBeInstanceOf(Error); // Or BadRequestException if that's what ParseIntPipe throws
            // Check for specific error message if needed:
            // expect(error.message).toContain('Validation failed (numeric string is expected)');
        }
    });

    it('should throw error if ParseIntPipe receives non-numeric string for timeWindowDays', async () => {
        const limit = '10'; // valid
        const timeWindowDays = 'thirty-days';

        const parseIntPipe = new ParseIntPipe();
        try {
            await parseIntPipe.transform(timeWindowDays, createArgMetadata('timeWindowDays', Number));
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            // expect(error.message).toContain('Validation failed (numeric string is expected)');
        }
    });
  });
});