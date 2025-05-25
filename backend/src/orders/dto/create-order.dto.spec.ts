// src/orders/dto/create-order.dto.spec.ts
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateOrderDto, CartItemDto } from './create-order.dto';

describe('CartItemDto', () => {
  const validCartItemData = {
    productId: 1,
    quantity: 2,
    pricePerUnitSnapshot: 10.99,
    storeId: 'store-abc-123',
  };

  it('should validate a correct CartItemDto', async () => {
    const cartItem = plainToInstance(CartItemDto, validCartItemData);
    const errors = await validate(cartItem);
    expect(errors.length).toBe(0);
  });

  describe('productId', () => {
    it('should fail if productId is missing', async () => {
      const data = { ...validCartItemData, productId: undefined };
      const cartItem = plainToInstance(CartItemDto, data);
      const errors = await validate(cartItem);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'productId')?.constraints?.isNotEmpty).toBeDefined();
    });

    it('should fail if productId is not a number', async () => {
      const data = { ...validCartItemData, productId: 'not-a-number' as any };
      const cartItem = plainToInstance(CartItemDto, data);
      const errors = await validate(cartItem);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'productId')?.constraints?.isNumber).toBeDefined();
    });
  });

  describe('quantity', () => {
    it('should fail if quantity is missing', async () => {
      const data = { ...validCartItemData, quantity: undefined };
      const cartItem = plainToInstance(CartItemDto, data);
      const errors = await validate(cartItem);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'quantity')?.constraints?.isNotEmpty).toBeDefined();
    });

    it('should fail if quantity is not a number', async () => {
      const data = { ...validCartItemData, quantity: 'not-a-number' as any };
      const cartItem = plainToInstance(CartItemDto, data);
      const errors = await validate(cartItem);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'quantity')?.constraints?.isNumber).toBeDefined();
    });

    it('should fail if quantity is zero', async () => {
      const data = { ...validCartItemData, quantity: 0 };
      const cartItem = plainToInstance(CartItemDto, data);
      const errors = await validate(cartItem);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'quantity')?.constraints?.isPositive).toBeDefined();
    });

    it('should fail if quantity is negative', async () => {
      const data = { ...validCartItemData, quantity: -1 };
      const cartItem = plainToInstance(CartItemDto, data);
      const errors = await validate(cartItem);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'quantity')?.constraints?.isPositive).toBeDefined();
    });
  });

  describe('pricePerUnitSnapshot', () => {
    it('should fail if pricePerUnitSnapshot is missing', async () => {
      const data = { ...validCartItemData, pricePerUnitSnapshot: undefined };
      const cartItem = plainToInstance(CartItemDto, data);
      const errors = await validate(cartItem);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'pricePerUnitSnapshot')?.constraints?.isNotEmpty).toBeDefined();
    });

    it('should fail if pricePerUnitSnapshot is not a number', async () => {
      const data = { ...validCartItemData, pricePerUnitSnapshot: 'price' as any };
      const cartItem = plainToInstance(CartItemDto, data);
      const errors = await validate(cartItem);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'pricePerUnitSnapshot')?.constraints?.isNumber).toBeDefined();
    });

    it('should fail if pricePerUnitSnapshot is negative', async () => {
      const data = { ...validCartItemData, pricePerUnitSnapshot: -0.01 };
      const cartItem = plainToInstance(CartItemDto, data);
      const errors = await validate(cartItem);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'pricePerUnitSnapshot')?.constraints?.min).toBeDefined();
    });

    it('should pass if pricePerUnitSnapshot is zero', async () => {
        const data = { ...validCartItemData, pricePerUnitSnapshot: 0 };
        const cartItem = plainToInstance(CartItemDto, data);
        const errors = await validate(cartItem);
        expect(errors.length).toBe(0);
      });
  });

  describe('storeId', () => {
    it('should fail if storeId is missing', async () => {
      const data = { ...validCartItemData, storeId: undefined };
      const cartItem = plainToInstance(CartItemDto, data);
      const errors = await validate(cartItem);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'storeId')?.constraints?.isNotEmpty).toBeDefined();
    });

    it('should fail if storeId is not a string', async () => {
      const data = { ...validCartItemData, storeId: 123 as any };
      const cartItem = plainToInstance(CartItemDto, data);
      const errors = await validate(cartItem);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'storeId')?.constraints?.isString).toBeDefined();
    });
  });
});

describe('CreateOrderDto', () => {
  const createValidCartItem = (): Record<string, any> => ({
    productId: 1,
    quantity: 1,
    pricePerUnitSnapshot: 10,
    storeId: 'store1',
  });

  const createValidCreateOrderData = (): Record<string, any> => ({
    cartItems: [createValidCartItem(), createValidCartItem()],
    deliverySelections: { store1: 'standard', store2: 'express' },
    selectedArea: 'North',
    selectedPickupPoint: 'Pickup Point A',
    yocoChargeId: 'yc_charge_12345',
    frontendGrandTotal: 125.50,
  });

  it('should validate a correct CreateOrderDto', async () => {
    const orderData = createValidCreateOrderData();
    const orderDto = plainToInstance(CreateOrderDto, orderData);
    const errors = await validate(orderDto);
    expect(errors.length).toBe(0);
  });

  describe('cartItems', () => {
    it('should fail if cartItems is not an array', async () => {
      const orderData = { ...createValidCreateOrderData(), cartItems: 'not-an-array' };
      const orderDto = plainToInstance(CreateOrderDto, orderData);
      const errors = await validate(orderDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'cartItems')?.constraints?.isArray).toBeDefined();
    });

    it('should fail if cartItems is an empty array', async () => {
      const orderData = { ...createValidCreateOrderData(), cartItems: [] };
      const orderDto = plainToInstance(CreateOrderDto, orderData);
      const errors = await validate(orderDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'cartItems')?.constraints?.arrayMinSize).toBeDefined();
    });

    it('should fail if cartItems contains an invalid CartItemDto (nested validation)', async () => {
      const invalidCartItem = { ...createValidCartItem(), quantity: -5 }; // Invalid quantity
      const orderData = { ...createValidCreateOrderData(), cartItems: [createValidCartItem(), invalidCartItem] };
      const orderDto = plainToInstance(CreateOrderDto, orderData);
      const errors = await validate(orderDto);
      expect(errors.length).toBeGreaterThan(0);
      
      const cartItemErrors = errors.find(err => err.property === 'cartItems');
      expect(cartItemErrors).toBeDefined();
      expect(cartItemErrors?.children).toBeDefined();
      // Find the error for the specific invalid item (e.g., the second item at index 1)
      const nestedError = cartItemErrors?.children?.find(child => child.property === '1'); // Index of the invalid item
      expect(nestedError).toBeDefined();
      expect(nestedError?.children?.find(c => c.property === 'quantity')?.constraints?.isPositive).toBeDefined();
    });
  });

  describe('deliverySelections', () => {
    it('should fail if deliverySelections is missing', async () => {
      const orderData = { ...createValidCreateOrderData(), deliverySelections: undefined };
      const orderDto = plainToInstance(CreateOrderDto, orderData);
      const errors = await validate(orderDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'deliverySelections')?.constraints?.isDefined).toBeDefined();
    });

    it('should fail if deliverySelections is not an object', async () => {
      const orderData = { ...createValidCreateOrderData(), deliverySelections: 'not-an-object' };
      const orderDto = plainToInstance(CreateOrderDto, orderData);
      const errors = await validate(orderDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'deliverySelections')?.constraints?.isObject).toBeDefined();
    });

    it('should pass if deliverySelections has string keys and values like "standard" or "express"', async () => {
        const orderData = { ...createValidCreateOrderData(), deliverySelections: { 'storeA': 'standard', 'storeB': 'express' } };
        const orderDto = plainToInstance(CreateOrderDto, orderData);
        const errors = await validate(orderDto);
        expect(errors.length).toBe(0);
      });

    it('should pass even if deliverySelections has values other than "standard" or "express" (DTO only checks for object type)', async () => {
        // This test demonstrates the current limitation of the DTO validation for deliverySelections values.
        const orderData = { ...createValidCreateOrderData(), deliverySelections: { 'storeA': 'other_value' } };
        const orderDto = plainToInstance(CreateOrderDto, orderData as any); // Cast as any if TS complains about 'other_value'
        const errors = await validate(orderDto);
        expect(errors.length).toBe(0); 
                                       
    });
  });

  describe('selectedArea', () => {
    it('should fail if selectedArea is missing', async () => {
      const orderData = { ...createValidCreateOrderData(), selectedArea: undefined };
      const orderDto = plainToInstance(CreateOrderDto, orderData);
      const errors = await validate(orderDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'selectedArea')?.constraints?.isNotEmpty).toBeDefined();
    });

    it('should fail if selectedArea is not a string', async () => {
        const orderData = { ...createValidCreateOrderData(), selectedArea: 123 };
        const orderDto = plainToInstance(CreateOrderDto, orderData as any);
        const errors = await validate(orderDto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.find(err => err.property === 'selectedArea')?.constraints?.isString).toBeDefined();
      });
  });

  describe('selectedPickupPoint', () => {
    it('should fail if selectedPickupPoint is missing', async () => {
      const orderData = { ...createValidCreateOrderData(), selectedPickupPoint: undefined };
      const orderDto = plainToInstance(CreateOrderDto, orderData);
      const errors = await validate(orderDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'selectedPickupPoint')?.constraints?.isNotEmpty).toBeDefined();
    });
    it('should fail if selectedPickupPoint is not a string', async () => {
        const orderData = { ...createValidCreateOrderData(), selectedPickupPoint: 123 };
        const orderDto = plainToInstance(CreateOrderDto, orderData as any);
        const errors = await validate(orderDto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.find(err => err.property === 'selectedPickupPoint')?.constraints?.isString).toBeDefined();
      });
  });

  describe('yocoChargeId', () => {
    it('should fail if yocoChargeId is missing', async () => {
      const orderData = { ...createValidCreateOrderData(), yocoChargeId: undefined };
      const orderDto = plainToInstance(CreateOrderDto, orderData);
      const errors = await validate(orderDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'yocoChargeId')?.constraints?.isNotEmpty).toBeDefined();
    });
    it('should fail if yocoChargeId is not a string', async () => {
        const orderData = { ...createValidCreateOrderData(), yocoChargeId: 123 };
        const orderDto = plainToInstance(CreateOrderDto, orderData as any);
        const errors = await validate(orderDto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.find(err => err.property === 'yocoChargeId')?.constraints?.isString).toBeDefined();
      });
  });

  describe('frontendGrandTotal', () => {
    it('should fail if frontendGrandTotal is missing', async () => {
      const orderData = { ...createValidCreateOrderData(), frontendGrandTotal: undefined };
      const orderDto = plainToInstance(CreateOrderDto, orderData);
      const errors = await validate(orderDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'frontendGrandTotal')?.constraints?.isNotEmpty).toBeDefined();
    });

    it('should fail if frontendGrandTotal is not a number', async () => {
      const orderData = { ...createValidCreateOrderData(), frontendGrandTotal: 'total' };
      const orderDto = plainToInstance(CreateOrderDto, orderData as any);
      const errors = await validate(orderDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'frontendGrandTotal')?.constraints?.isNumber).toBeDefined();
    });

    it('should fail if frontendGrandTotal is negative', async () => {
      const orderData = { ...createValidCreateOrderData(), frontendGrandTotal: -100 };
      const orderDto = plainToInstance(CreateOrderDto, orderData);
      const errors = await validate(orderDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.find(err => err.property === 'frontendGrandTotal')?.constraints?.min).toBeDefined();
    });

    it('should pass if frontendGrandTotal is zero', async () => {
        const orderData = { ...createValidCreateOrderData(), frontendGrandTotal: 0 };
        const orderDto = plainToInstance(CreateOrderDto, orderData);
        const errors = await validate(orderDto);
        expect(errors.length).toBe(0);
      });
  });
});