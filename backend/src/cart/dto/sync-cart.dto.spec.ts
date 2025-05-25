// __tests__/sync-cart.dto.spec.ts
import 'reflect-metadata'; // Must be the first import
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SyncCartDto } from './sync-cart.dto'; 
import { CreateCartItemDto } from './create-cart-item.dto'; 

describe('SyncCartDto', () => {
  const createValidCartItemData = (productId = 1, quantity = 1) => ({
    productId,
    quantity,
  });

  it('should validate successfully with a valid array of items', async () => {
    const dto = plainToInstance(SyncCartDto, {
      items: [createValidCartItemData(1, 2), createValidCartItemData(2, 3)],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate successfully with an empty array of items', async () => {
    const dto = plainToInstance(SyncCartDto, { items: [] });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if items is not an array', async () => {
    const dto = plainToInstance(SyncCartDto, { items: 'not-an-array' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.find(err => err.property === 'items')?.constraints?.isArray).toBeDefined();
  });

  it('should fail if items is missing (undefined)', async () => {
    const dto = plainToInstance(SyncCartDto, {}); // items is undefined
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.find(err => err.property === 'items')?.constraints?.isArray).toBeDefined();
   
  });

  

  it('should fail if items array contains an invalid CreateCartItemDto (e.g., missing productId)', async () => {
    const invalidItem = { quantity: 5 }; // Missing productId
    const dto = plainToInstance(SyncCartDto, { items: [createValidCartItemData(), invalidItem] });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const itemsError = errors.find(err => err.property === 'items');
    expect(itemsError).toBeDefined();
    const nestedError = itemsError?.children?.find(child => child.property === '1'); 
    expect(nestedError).toBeDefined();
    expect(nestedError?.children?.find(c => c.property === 'productId')?.constraints?.isNumber).toBeDefined();
  });

  it('should fail if items array contains an invalid CreateCartItemDto (e.g., invalid quantity)', async () => {
    const invalidItem = { productId: 10, quantity: 0 }; // Invalid quantity (must be >= 1)
    const dto = plainToInstance(SyncCartDto, { items: [invalidItem] });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const itemsError = errors.find(err => err.property === 'items');
    expect(itemsError).toBeDefined();
    const nestedError = itemsError?.children?.find(child => child.property === '0'); 
    expect(nestedError).toBeDefined();
    const quantityConstraintErrors = nestedError?.children?.find(c => c.property === 'quantity')?.constraints;
    expect(quantityConstraintErrors?.isPositive).toBeDefined();
    expect(quantityConstraintErrors?.min).toBeDefined();
  });

  it('should correctly transform and validate nested CreateCartItemDto instances', async () => {
    
    const plainItems = [
      { productId: 101, quantity: 1 },
      { productId: 102, quantity: 2 },
    ];
    const dto = plainToInstance(SyncCartDto, { items: plainItems });
    expect(dto.items[0]).toBeInstanceOf(CreateCartItemDto);
    expect(dto.items[1]).toBeInstanceOf(CreateCartItemDto);

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
