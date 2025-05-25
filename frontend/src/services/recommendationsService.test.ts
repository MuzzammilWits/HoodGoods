import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import type { PopularProductDto } from '../types'; // Use 'type' import

// Mock axios at the top
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const MOCK_API_URL = 'http://test-api.com/api';
// const DEFAULT_API_URL = 'http://localhost:3000/api'; 

// Define mockProductsData (ensure this matches your DTO structure)
const mockProductsData: PopularProductDto[] = [
  {
    productId: 1,
    name: 'Awesome T-Shirt',
    imageUrl: 'http://example.com/image1.jpg',
    storeName: 'Cool Store',
    salesCount: 150,
    productPrice: 25.99,
    productquantity: 50,
    storeId: 'store123',
    userId: 'user789',
  },
  {
    productId: 2,
    name: 'Super Gadget',
    storeName: 'Gadget World',
    salesCount: 120,
    productPrice: 99.50,
    productquantity: 25,
    storeId: 'store456',
    userId: 'userABC',
  },
  {
    productId: 3,
    name: 'Fantastic Book',
    imageUrl: 'http://example.com/book.png',
    storeName: 'Readers Corner',
    salesCount: 95,
    productPrice: 14.00,
    productquantity: 100,
    storeId: 'store789',
    userId: 'userXYZ',
  }
];

describe('recommendationsService', () => {
  // Declare the function type, it will be assigned in beforeEach
  let getBestSellingProducts: (limit?: number, timeWindowDays?: number) => Promise<PopularProductDto[]>;

  beforeEach(async () => {
    vi.resetAllMocks(); // Reset spies, axios mock calls, etc.

    // Use vi.stubEnv to set the environment variable for Vite
    vi.stubEnv('VITE_API_BASE_URLs', MOCK_API_URL);

    // Dynamically importing the module AFTER stubbing the environment.
    // This ensures the API_URL constant in your service gets the mocked value.
    // Verify this path is correct relative to your test file.iroknow googled it 
    const serviceModule = await import('./recommendationsService');
    getBestSellingProducts = serviceModule.getBestSellingProducts;
  });

  afterEach(() => {
    vi.unstubAllEnvs();   // Cleaning up environment stubs
    vi.resetModules();    // Clears the module cache for the next test
  });

  it('should fetch best selling products with default parameters', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockProductsData });
    const products = await getBestSellingProducts();

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${MOCK_API_URL}/recommendations/best-sellers`,
      { params: new URLSearchParams() }
    );
    expect(products).toEqual(mockProductsData);
  });

  it('should fetch best selling products with a limit', async () => {
    const limit = 1;
    const expectedProducts = mockProductsData.slice(0, limit);
    mockedAxios.get.mockResolvedValueOnce({ data: expectedProducts });

    const expectedParams = new URLSearchParams();
    expectedParams.append('limit', String(limit));

    const products = await getBestSellingProducts(limit);

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${MOCK_API_URL}/recommendations/best-sellers`,
      { params: expectedParams }
    );
    expect(products).toEqual(expectedProducts);
  });

  it('should fetch best selling products with a timeWindowDays', async () => {
    const timeWindowDays = 60;
    mockedAxios.get.mockResolvedValueOnce({ data: mockProductsData });

    const expectedParams = new URLSearchParams();
    expectedParams.append('timeWindowDays', String(timeWindowDays));

    const products = await getBestSellingProducts(undefined, timeWindowDays);

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${MOCK_API_URL}/recommendations/best-sellers`,
      { params: expectedParams }
    );
    expect(products).toEqual(mockProductsData);
  });

  it('should fetch best selling products with both limit and timeWindowDays', async () => {
    const limit = 2;
    const timeWindowDays = 15;
    const expectedProducts = mockProductsData.slice(0, limit);
    mockedAxios.get.mockResolvedValueOnce({ data: expectedProducts });

    const expectedParams = new URLSearchParams();
    expectedParams.append('limit', String(limit));
    expectedParams.append('timeWindowDays', String(timeWindowDays));

    const products = await getBestSellingProducts(limit, timeWindowDays);

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${MOCK_API_URL}/recommendations/best-sellers`,
      { params: expectedParams }
    );
    expect(products).toEqual(expectedProducts);
  });

  

  it('should handle API errors by throwing the error', async () => {
    const errorMessage = 'Network Error';
    mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getBestSellingProducts()).rejects.toThrow(errorMessage);

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining(`${MOCK_API_URL}/recommendations/best-sellers`), // Ensure MOCK_API_URL is used
      expect.anything()
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching best selling products:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('should return an empty array if API returns empty data', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] });
    const products = await getBestSellingProducts();

    expect(products).toEqual([]);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${MOCK_API_URL}/recommendations/best-sellers`, // Ensure MOCK_API_URL
      { params: new URLSearchParams() }
    );
  });

  it('should correctly pass "limit" as a string in query params when only limit is provided', async () => {
    const limit = 5;
    mockedAxios.get.mockResolvedValueOnce({ data: [] });
    await getBestSellingProducts(limit);

    const expectedParams = new URLSearchParams();
    expectedParams.append('limit', '5');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${MOCK_API_URL}/recommendations/best-sellers`, // Ensure MOCK_API_URL
      { params: expectedParams }
    );
  });

  it('should correctly pass "timeWindowDays" as a string in query params when only timeWindowDays is provided', async () => {
    const timeWindowDays = 45;
    mockedAxios.get.mockResolvedValueOnce({ data: [] });
    await getBestSellingProducts(undefined, timeWindowDays);

    const expectedParams = new URLSearchParams();
    expectedParams.append('timeWindowDays', '45');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `${MOCK_API_URL}/recommendations/best-sellers`, // Ensure MOCK_API_URL
      { params: expectedParams }
    );
  });

  it('should not append "limit" if it is undefined', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockProductsData });
    await getBestSellingProducts(undefined, 30);

    const call = mockedAxios.get.mock.calls[0];
    expect(call[0]).toBe(`${MOCK_API_URL}/recommendations/best-sellers`); // Ensure MOCK_API_URL
    const params = call[1]?.params as URLSearchParams;
    expect(params.has('limit')).toBe(false);
    expect(params.get('timeWindowDays')).toBe('30');
  });

  it('should not append "timeWindowDays" if it is undefined', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockProductsData });
    await getBestSellingProducts(5, undefined);

    const call = mockedAxios.get.mock.calls[0];
    expect(call[0]).toBe(`${MOCK_API_URL}/recommendations/best-sellers`); // Ensure MOCK_API_URL
    const params = call[1]?.params as URLSearchParams;
    expect(params.has('timeWindowDays')).toBe(false);
    expect(params.get('limit')).toBe('5');
  });
});
