// src/cart/dto/create-cart-item.dto.spec.ts
import 'reflect-metadata'; // Must be the first import
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCartItemDto } from './create-cart-item.dto'; // Adjust path as necessary

describe('CreateCartItemDto', () => {
  const verboseIsNumberMessage = (property: string) => `${property} must be a number conforming to the specified constraints`;

  // --- Test suite for productId ---
  describe('productId', () => {
    it('should validate successfully with a valid productId', async () => {
      const dto = plainToInstance(CreateCartItemDto, { productId: 123, quantity: 1 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail if productId is missing', async () => {
      const dto = plainToInstance(CreateCartItemDto, { quantity: 1 }); // productId is undefined
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'productId')?.constraints?.isNumber).toBe(verboseIsNumberMessage('productId'));
    });

    it('should fail if productId is not a number (e.g., string)', async () => {
      const dto = plainToInstance(CreateCartItemDto, { productId: 'abc', quantity: 1 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'productId')?.constraints?.isNumber).toBe(verboseIsNumberMessage('productId'));
    });

    it('should fail if productId is a boolean', async () => {
      const dto = plainToInstance(CreateCartItemDto, { productId: true, quantity: 1 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'productId')?.constraints?.isNumber).toBe(verboseIsNumberMessage('productId'));
    });

    it('should fail if productId is an object', async () => {
      const dto = plainToInstance(CreateCartItemDto, { productId: { id: 1 }, quantity: 1 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'productId')?.constraints?.isNumber).toBe(verboseIsNumberMessage('productId'));
    });
  });

  // --- Test suite for quantity ---
  describe('quantity', () => {
    it('should validate successfully with a valid positive quantity', async () => {
      const dto = plainToInstance(CreateCartItemDto, { productId: 123, quantity: 5 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate successfully when quantity is 1', async () => {
      const dto = plainToInstance(CreateCartItemDto, { productId: 123, quantity: 1 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail if quantity is missing', async () => {
      const dto = plainToInstance(CreateCartItemDto, { productId: 123 }); // quantity is undefined
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'quantity')?.constraints?.isNumber).toBe(verboseIsNumberMessage('quantity'));
    });

    it('should fail if quantity is not a number (e.g., string)', async () => {
      const dto = plainToInstance(CreateCartItemDto, { productId: 123, quantity: 'abc' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'quantity')?.constraints?.isNumber).toBe(verboseIsNumberMessage('quantity'));
    });

    it('should fail if quantity is zero', async () => {
      const dto = plainToInstance(CreateCartItemDto, { productId: 123, quantity: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const quantityErrors = errors.find(err => err.property === 'quantity')?.constraints;
      expect(quantityErrors?.isPositive).toBe('quantity must be a positive number'); // Default message for @IsPositive
      expect(quantityErrors?.min).toBe('quantity must not be less than 1');         // Default message for @Min(1)
    });

    it('should fail if quantity is a negative number', async () => {
      const dto = plainToInstance(CreateCartItemDto, { productId: 123, quantity: -5 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const quantityErrors = errors.find(err => err.property === 'quantity')?.constraints;
      expect(quantityErrors?.isPositive).toBe('quantity must be a positive number');
      expect(quantityErrors?.min).toBe('quantity must not be less than 1');
    });

    it('should fail if quantity is a float (but less than 1, e.g. 0.5)', async () => {
      const dto = plainToInstance(CreateCartItemDto, { productId: 123, quantity: 0.5 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const quantityErrors = errors.find(err => err.property === 'quantity')?.constraints;
      expect(quantityErrors?.isPositive).toBeUndefined(); 
      expect(quantityErrors?.min).toBe('quantity must not be less than 1'); 
    });

    it('should pass if quantity is a float greater than or equal to 1 (e.g. 1.0, 2.5) if integers are not strictly required', async () => {
      const dto1 = plainToInstance(CreateCartItemDto, { productId: 123, quantity: 1.0 });
      let errors = await validate(dto1);
      expect(errors.length).toBe(0);

      const dto2 = plainToInstance(CreateCartItemDto, { productId: 123, quantity: 2.5 });
      errors = await validate(dto2);
      expect(errors.length).toBe(0);
    });
  });
});