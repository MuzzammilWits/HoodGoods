// src/orders/dto/update-order-status.dto.spec.ts
import 'reflect-metadata'; // Ensure this is at the very top

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateOrderStatusDto } from './update-order-status.dto';

// Re-define or import if accessible from DTO, for clarity in tests
const ALLOWED_STATUSES_FOR_TEST = ['Processing', 'Packaging', 'Ready for Pickup', 'Shipped', 'Delivered', 'Cancelled'] as const;

describe('UpdateOrderStatusDto', () => {
  describe('status', () => {
    // Test valid statuses
    ALLOWED_STATUSES_FOR_TEST.forEach(validStatus => {
      it(`should validate successfully when status is "${validStatus}"`, async () => {
        const dto = plainToInstance(UpdateOrderStatusDto, { status: validStatus });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });

    it('should fail if status is missing', async () => {
      const dto = plainToInstance(UpdateOrderStatusDto, { status: undefined });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const statusError = errors.find(err => err.property === 'status');
      expect(statusError).toBeDefined();
      expect(statusError?.constraints?.isNotEmpty).toContain('Status cannot be empty');
    });

    it('should fail if status is an empty string', async () => {
      const dto = plainToInstance(UpdateOrderStatusDto, { status: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const statusError = errors.find(err => err.property === 'status');
      expect(statusError).toBeDefined();
      // @IsNotEmpty typically covers empty strings. @IsIn might also fail if "" is not in ALLOWED_STATUSES.
      expect(statusError?.constraints?.isNotEmpty).toBeDefined();
    });

    it('should fail if status is not a string', async () => {
      const dto = plainToInstance(UpdateOrderStatusDto, { status: 123 as any });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const statusError = errors.find(err => err.property === 'status');
      expect(statusError).toBeDefined();
      expect(statusError?.constraints?.isString).toBeDefined();
      // It might also trigger @IsIn if the non-string value doesn't match any allowed status
      expect(statusError?.constraints?.isIn).toBeDefined();
    });

    it('should fail if status is not one of the allowed values', async () => {
      const dto = plainToInstance(UpdateOrderStatusDto, { status: 'InvalidStatusValue' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const statusError = errors.find(err => err.property === 'status');
      expect(statusError).toBeDefined();
      expect(statusError?.constraints?.isIn).toContain('Invalid status value provided.');
    });

    it('should fail if status is null', async () => {
      const dto = plainToInstance(UpdateOrderStatusDto, { status: null as any });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const statusError = errors.find(err => err.property === 'status');
      expect(statusError).toBeDefined();
      // Depending on class-validator version and strictness, null can fail multiple rules.
      // @IsNotEmpty is a primary candidate.
      expect(statusError?.constraints?.isNotEmpty).toBeDefined();
    });
  });
});