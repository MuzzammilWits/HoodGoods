// backend/src/recommendations/dto/popular-product.dto.test.ts

import { PopularProductDto } from './popular-product.dto';

describe('PopularProductDto', () => {
  const mockRequiredData = {
    productId: 1,
    name: 'Test Product',
    salesCount: 100,
    productPrice: 99.99,
    productquantity: 50,
    storeId: 'store-123',
    userId: 'user-abc',
  };

  const mockOptionalData = {
    imageUrl: 'http://example.com/image.jpg',
    storeName: 'Test Store',
  };

  it('should correctly assign all required properties', () => {
    const dto = new PopularProductDto();
    dto.productId = mockRequiredData.productId;
    dto.name = mockRequiredData.name;
    dto.salesCount = mockRequiredData.salesCount;
    dto.productPrice = mockRequiredData.productPrice;
    dto.productquantity = mockRequiredData.productquantity;
    dto.storeId = mockRequiredData.storeId;
    dto.userId = mockRequiredData.userId;

    expect(dto.productId).toBe(mockRequiredData.productId);
    expect(dto.name).toBe(mockRequiredData.name);
    expect(dto.salesCount).toBe(mockRequiredData.salesCount);
    expect(dto.productPrice).toBe(mockRequiredData.productPrice);
    expect(dto.productquantity).toBe(mockRequiredData.productquantity);
    expect(dto.storeId).toBe(mockRequiredData.storeId);
    expect(dto.userId).toBe(mockRequiredData.userId);

    // Optional fields should be undefined if not set
    expect(dto.imageUrl).toBeUndefined();
    expect(dto.storeName).toBeUndefined();
  });

  it('should correctly assign all properties including optional ones', () => {
    const dto = new PopularProductDto();
    dto.productId = mockRequiredData.productId;
    dto.name = mockRequiredData.name;
    dto.salesCount = mockRequiredData.salesCount;
    dto.productPrice = mockRequiredData.productPrice;
    dto.productquantity = mockRequiredData.productquantity;
    dto.storeId = mockRequiredData.storeId;
    dto.userId = mockRequiredData.userId;
    dto.imageUrl = mockOptionalData.imageUrl;
    dto.storeName = mockOptionalData.storeName;

    expect(dto.productId).toBe(mockRequiredData.productId);
    expect(dto.name).toBe(mockRequiredData.name);
    expect(dto.imageUrl).toBe(mockOptionalData.imageUrl);
    expect(dto.storeName).toBe(mockOptionalData.storeName);
    expect(dto.salesCount).toBe(mockRequiredData.salesCount);
    expect(dto.productPrice).toBe(mockRequiredData.productPrice);
    expect(dto.productquantity).toBe(mockRequiredData.productquantity);
    expect(dto.storeId).toBe(mockRequiredData.storeId);
    expect(dto.userId).toBe(mockRequiredData.userId);
  });

  it('should have correct types for properties', () => {
    const dto = new PopularProductDto();
    dto.productId = 1;
    dto.name = 'Product Name';
    dto.imageUrl = 'url';
    dto.storeName = 'Store Name';
    dto.salesCount = 10;
    dto.productPrice = 19.99;
    dto.productquantity = 5;
    dto.storeId = 's-001';
    dto.userId = 'u-001';

    expect(typeof dto.productId).toBe('number');
    expect(typeof dto.name).toBe('string');
    expect(typeof dto.imageUrl).toBe('string');
    expect(typeof dto.storeName).toBe('string');
    expect(typeof dto.salesCount).toBe('number');
    expect(typeof dto.productPrice).toBe('number');
    expect(typeof dto.productquantity).toBe('number');
    expect(typeof dto.storeId).toBe('string');
    expect(typeof dto.userId).toBe('string');
  });

  it('should allow imageUrl to be undefined', () => {
    const dto = new PopularProductDto();
    dto.productId = mockRequiredData.productId;
    dto.name = mockRequiredData.name;
    dto.salesCount = mockRequiredData.salesCount;
    dto.productPrice = mockRequiredData.productPrice;
    dto.productquantity = mockRequiredData.productquantity;
    dto.storeId = mockRequiredData.storeId;
    dto.userId = mockRequiredData.userId;
    // dto.imageUrl is not set

    expect(dto.imageUrl).toBeUndefined();
  });

  it('should allow storeName to be undefined', () => {
    const dto = new PopularProductDto();
    dto.productId = mockRequiredData.productId;
    dto.name = mockRequiredData.name;
    dto.salesCount = mockRequiredData.salesCount;
    dto.productPrice = mockRequiredData.productPrice;
    dto.productquantity = mockRequiredData.productquantity;
    dto.storeId = mockRequiredData.storeId;
    dto.userId = mockRequiredData.userId;
    // dto.storeName is not set

    expect(dto.storeName).toBeUndefined();
  });

  // Example of how you might use the DTO in a test (more for integration testing)
  it('can be instantiated with partial data and then completed', () => {
    const partialDto: Partial<PopularProductDto> = {
      productId: 2,
      name: 'Another Product',
    };

    const fullDto = new PopularProductDto();
    Object.assign(fullDto, partialDto); // Simulate filling in data

    fullDto.salesCount = 50;
    fullDto.productPrice = 25.00;
    fullDto.productquantity = 10;
    fullDto.storeId = 'store-456';
    fullDto.userId = 'user-def';
    fullDto.storeName = 'Another Store';
    // imageUrl remains undefined

    expect(fullDto.productId).toBe(2);
    expect(fullDto.name).toBe('Another Product');
    expect(fullDto.salesCount).toBe(50);
    expect(fullDto.productPrice).toBe(25.00);
    expect(fullDto.productquantity).toBe(10);
    expect(fullDto.storeId).toBe('store-456');
    expect(fullDto.userId).toBe('user-def');
    expect(fullDto.storeName).toBe('Another Store');
    expect(fullDto.imageUrl).toBeUndefined();
  });
});