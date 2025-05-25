// __tests__/update-cart-item.dto.spec.ts
import 'reflect-metadata'; // Must be the first import
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateCartItemDto } from './update-cart-item.dto'; 

describe('UpdateCartItemDto', () => {
  // --- Test suite for quantity ---
  describe('quantity', () => {
    it('should validate successfully with a valid positive quantity', async () => {
      const dto = plainToInstance(UpdateCartItemDto, { quantity: 5 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate successfully when quantity is 1', async () => {
      const dto = plainToInstance(UpdateCartItemDto, { quantity: 1 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail if quantity is missing', async () => {
      const dto = plainToInstance(UpdateCartItemDto, {}); 
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'quantity')?.constraints?.isNumber).toBeDefined();
    });

    it('should fail if quantity is not a number (e.g., string)', async () => {
      const dto = plainToInstance(UpdateCartItemDto, { quantity: 'abc' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const quantityError = errors.find(err => err.property === 'quantity');
      expect(quantityError).toBeDefined();
      expect(quantityError?.constraints?.isNumber).toBeDefined();
    });

    it('should fail if quantity is zero', async () => {
      const dto = plainToInstance(UpdateCartItemDto, { quantity: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const quantityErrors = errors.find(err => err.property === 'quantity')?.constraints;
      expect(quantityErrors?.isPositive).toBe('quantity must be a positive number');
      expect(quantityErrors?.min).toBe('quantity must not be less than 1');
    });

    it('should fail if quantity is a negative number', async () => {
      const dto = plainToInstance(UpdateCartItemDto, { quantity: -5 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const quantityErrors = errors.find(err => err.property === 'quantity')?.constraints;
      expect(quantityErrors?.isPositive).toBe('quantity must be a positive number');
      expect(quantityErrors?.min).toBe('quantity must not be less than 1');
    });

    it('should fail if quantity is a float less than 1 (e.g., 0.5)', async () => {
      const dto = plainToInstance(UpdateCartItemDto, { quantity: 0.5 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const quantityErrors = errors.find(err => err.property === 'quantity')?.constraints;
      expect(quantityErrors?.isPositive).toBeUndefined();
      expect(quantityErrors?.min).toBe('quantity must not be less than 1');
    });

    it('should pass if quantity is a float >= 1 (e.g. 1.0, 1.5) if integers are not strictly required', async () => {
      // Currently, 1.5 will pass @IsNumber, @IsPositive, and @Min(1).
      const dto = plainToInstance(UpdateCartItemDto, { quantity: 1.5 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);

      const dto2 = plainToInstance(UpdateCartItemDto, { quantity: 1.0 });
      const errors2 = await validate(dto2);
      expect(errors2.length).toBe(0);
    });
  });
});
