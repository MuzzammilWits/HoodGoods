import { validate } from 'class-validator';
import { UpdateStoreDto } from './update-store.dto'; // Adjust path as needed

// Re-define these here for clarity in tests, or import if exported from DTO file
const VALID_STANDARD_TIMES = ['3-5', '5-7', '7-9'];
const VALID_EXPRESS_TIMES = ['0-1', '1-2', '2-3'];

describe('UpdateStoreDto', () => {
  // --- Test Suite for standardPrice ---
  describe('standardPrice', () => {
    it('should validate a valid standardPrice (integer)', async () => {
      const dto = new UpdateStoreDto();
      dto.standardPrice = 10;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate a valid standardPrice (decimal)', async () => {
      const dto = new UpdateStoreDto();
      dto.standardPrice = 10.99;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate a standardPrice with max 4 decimal places', async () => {
      const dto = new UpdateStoreDto();
      dto.standardPrice = 10.1234;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should not validate a standardPrice with more than 4 decimal places', async () => {
      const dto = new UpdateStoreDto();
      dto.standardPrice = 10.12345;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should not validate a negative standardPrice', async () => {
      const dto = new UpdateStoreDto();
      dto.standardPrice = -5;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should not validate if standardPrice is not a number', async () => {
      const dto = new UpdateStoreDto();
      dto.standardPrice = 'not-a-price' as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should be valid if standardPrice is undefined (optional)', async () => {
      const dto = new UpdateStoreDto();
      // standardPrice is not set
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  // --- Test Suite for standardTime ---
  describe('standardTime', () => {
    VALID_STANDARD_TIMES.forEach(validTime => {
      it(`should validate a valid standardTime: ${validTime}`, async () => {
        const dto = new UpdateStoreDto();
        dto.standardTime = validTime;
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });

    it('should not validate an invalid standardTime string', async () => {
      const dto = new UpdateStoreDto();
      dto.standardTime = '10-12'; // Not in VALID_STANDARD_TIMES
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isIn');
    });

    it('should not validate if standardTime is not a string', async () => {
      const dto = new UpdateStoreDto();
      dto.standardTime = 123 as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should be valid if standardTime is undefined (optional)', async () => {
      const dto = new UpdateStoreDto();
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  // --- Test Suite for expressPrice ---
  describe('expressPrice', () => {
    it('should validate a valid expressPrice (integer)', async () => {
      const dto = new UpdateStoreDto();
      dto.expressPrice = 15;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate a valid expressPrice (decimal)', async () => {
      const dto = new UpdateStoreDto();
      dto.expressPrice = 15.75;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate an expressPrice with max 4 decimal places', async () => {
      const dto = new UpdateStoreDto();
      dto.expressPrice = 15.1234;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should not validate an expressPrice with more than 4 decimal places', async () => {
      const dto = new UpdateStoreDto();
      dto.expressPrice = 15.12345;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should not validate a negative expressPrice', async () => {
      const dto = new UpdateStoreDto();
      dto.expressPrice = -1;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should not validate if expressPrice is not a number', async () => {
      const dto = new UpdateStoreDto();
      dto.expressPrice = 'expensive' as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should be valid if expressPrice is undefined (optional)', async () => {
      const dto = new UpdateStoreDto();
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  // --- Test Suite for expressTime ---
  describe('expressTime', () => {
    VALID_EXPRESS_TIMES.forEach(validTime => {
      it(`should validate a valid expressTime: ${validTime}`, async () => {
        const dto = new UpdateStoreDto();
        dto.expressTime = validTime;
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });
    });

    it('should not validate an invalid expressTime string', async () => {
      const dto = new UpdateStoreDto();
      dto.expressTime = '4-5'; // Not in VALID_EXPRESS_TIMES
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isIn');
    });

    it('should not validate if expressTime is not a string', async () => {
      const dto = new UpdateStoreDto();
      dto.expressTime = 45 as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should be valid if expressTime is undefined (optional)', async () => {
      const dto = new UpdateStoreDto();
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  // --- Test Suite for combinations and optionality ---
  describe('Combined and Optional Fields', () => {
    it('should be valid if all fields are undefined (all optional)', async () => {
      const dto = new UpdateStoreDto();
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should be valid with a mix of valid optional fields', async () => {
      const dto = new UpdateStoreDto();
      dto.standardPrice = 20;
      dto.expressTime = VALID_EXPRESS_TIMES[0];
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should be invalid if one field is invalid and others are valid/undefined', async () => {
      const dto = new UpdateStoreDto();
      dto.standardPrice = 20;
      dto.expressTime = 'invalid-time'; // Invalid
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('expressTime');
      expect(errors[0].constraints).toHaveProperty('isIn');
    });

    it('should be valid with all fields correctly populated', async () => {
        const dto = new UpdateStoreDto();
        dto.standardPrice = 12.50;
        dto.standardTime = VALID_STANDARD_TIMES[1];
        dto.expressPrice = 25.00;
        dto.expressTime = VALID_EXPRESS_TIMES[1];
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });

    it('should be invalid if multiple fields are invalid', async () => {
        const dto = new UpdateStoreDto();
        dto.standardPrice = -10; // Invalid
        dto.standardTime = "invalid"; // Invalid
        dto.expressPrice = "not-a-number" as any; // Invalid
        dto.expressTime = "also-invalid"; // Invalid
        const errors = await validate(dto);
        expect(errors.length).toBe(4); // Expect an error for each invalid field
    });
  });
});
