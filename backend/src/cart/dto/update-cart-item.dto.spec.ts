// __tests__/update-cart-item.dto.spec.ts
import 'reflect-metadata'; // Must be the first import
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateCartItemDto } from './update-cart-item.dto'; // Adjust path as necessary

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
      const dto = plainToInstance(UpdateCartItemDto, {}); // quantity is undefined
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      // When undefined, @IsNumber is the first to fail.
      // If @IsNotEmpty() were present, that would be the primary error.
      expect(errors.find(err => err.property === 'quantity')?.constraints?.isNumber).toBeDefined();
    });

    it('should fail if quantity is not a number (e.g., string)', async () => {
      const dto = plainToInstance(UpdateCartItemDto, { quantity: 'abc' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const quantityError = errors.find(err => err.property === 'quantity');
      expect(quantityError).toBeDefined();
      // Check for the presence of the isNumber constraint violation.
      // The exact message can vary slightly between class-validator versions.
      expect(quantityError?.constraints?.isNumber).toBeDefined();
      // A more specific check if you know the exact default message for your version:
      // expect(quantityError?.constraints?.isNumber).toBe('quantity must be a number conforming to the specified constraints');
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
      // For quantity = 0.5:
      // @IsPositive should PASS (0.5 is positive), so isPositive constraint should NOT be present.
      expect(quantityErrors?.isPositive).toBeUndefined();
      // @Min(1) should FAIL (0.5 is less than 1).
      expect(quantityErrors?.min).toBe('quantity must not be less than 1');
    });

    it('should pass if quantity is a float >= 1 (e.g. 1.0, 1.5) if integers are not strictly required', async () => {
      // If quantity must be an integer, add @IsInt() to the DTO.
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
