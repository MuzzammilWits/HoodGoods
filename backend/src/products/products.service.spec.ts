// import { Test, TestingModule } from '@nestjs/testing';
// import { getRepositoryToken } from '@nestjs/typeorm';
// import { Repository, SelectQueryBuilder } from 'typeorm';
// import { ProductsService } from './products.service';
// import { Product } from './entities/product.entity';

// // Mock TypeORM Repository type
// import { ObjectLiteral } from 'typeorm';

// type MockRepository<T extends ObjectLiteral = any> = Partial<Record<keyof Repository<T>, jest.Mock>> & {
//     createQueryBuilder?: jest.Mock; // Explicitly add createQueryBuilder
//   };

// // Mock TypeORM QueryBuilder
// // We only need to mock the methods actually used in the service
// type MockQueryBuilder<T extends ObjectLiteral = any> = Partial<Record<keyof SelectQueryBuilder<T>, jest.Mock>>;

// // Factory function to create mock repositories
// const createMockRepository = <T extends ObjectLiteral = any>(): MockRepository<T> => ({
//   find: jest.fn(),
//   createQueryBuilder: jest.fn(() => createMockQueryBuilder<T>()!) as jest.Mock, // Explicitly mock createQueryBuilder and ensure it's defined
//   ...({} as MockRepository<T>),
// });

// // Factory function to create mock query builders
// const createMockQueryBuilder = <T extends ObjectLiteral = any>(): MockQueryBuilder<T> => ({
//     andWhere: jest.fn().mockReturnThis(), // Return this for chaining possibility
//     getMany: jest.fn(),
//   });

// describe('ProductsService', () => {
//   let service: ProductsService;
//   let productRepository: MockRepository<Product>;
//   let mockQueryBuilder: MockQueryBuilder<Product>; // Store the mock query builder

//   // Mock product data
//   const mockProduct1: Product = {
//     prodId: 1,
//     name: 'Active Product 1',
//     description: 'Desc 1',
//     price: 10.99,
//     category: 'Category A',
//     imageUrl: 'http://example.com/img1.jpg',
//     userId: 'user1',
//     storeName: 'Store A',
//     isActive: true, // Important for findAllActive
//   };

//   const mockProduct2: Product = {
//     prodId: 2,
//     name: 'Inactive Product 2',
//     description: 'Desc 2',
//     price: 25.00,
//     category: 'Category B',
//     imageUrl: 'http://example.com/img2.jpg',
//     userId: 'user2',
//     storeName: 'Store B',
//     isActive: false, // Important for findAllActive
//   };

//   const mockProduct3: Product = {
//     prodId: 3,
//     name: 'Active Product 3',
//     description: 'Desc 3',
//     price: 5.00,
//     category: 'Category A', // Same category as mockProduct1
//     imageUrl: 'http://example.com/img3.jpg',
//     userId: 'user1',
//     storeName: 'Store A',
//     isActive: true,
//   };

//   const allMockProducts = [mockProduct1, mockProduct2, mockProduct3];
//   const activeMockProducts = [mockProduct1, mockProduct3];
//   const categoryAMockProducts = [mockProduct1, mockProduct3];

//   beforeEach(async () => {
//     // Create a fresh mock query builder for each test
//     mockQueryBuilder = createMockQueryBuilder<Product>();

//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         ProductsService,
//         {
//           provide: getRepositoryToken(Product),
//           useValue: createMockRepository<Product>(),
//         },
//       ],
//     }).compile();

//     service = module.get<ProductsService>(ProductsService);
//     productRepository = module.get(getRepositoryToken(Product));

//     // Crucially, make createQueryBuilder return our specific mock builder instance
//     productRepository.createQueryBuilder?.mockReturnValue(mockQueryBuilder);

//     // Reset mocks (find specifically, createQueryBuilder setup is above)
//     productRepository.find?.mockReset();
//     mockQueryBuilder.andWhere?.mockClear(); // Use clear for builder mocks if needed
//     mockQueryBuilder.getMany?.mockClear();
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });

//   // --- Tests for findAllActive ---
//   describe('findAllActive', () => {
//     it('should return only active products ordered by prodId ASC', async () => {
//       // Arrange: Mock the find method to return only active products
//       productRepository.find?.mockResolvedValue(activeMockProducts);

//       // Act
//       const result = await service.findAllActive();

//       // Assert
//       expect(productRepository.find).toHaveBeenCalledTimes(1);
//       expect(productRepository.find).toHaveBeenCalledWith({
//         where: { isActive: true },
//         order: { prodId: 'ASC' },
//       });
//       expect(result).toEqual(activeMockProducts);
//       // Ensure no inactive products are present (optional belt-and-braces check)
//       expect(result.some(p => !p.isActive)).toBe(false);
//     });

//     it('should return an empty array if no active products are found', async () => {
//         // Arrange
//         productRepository.find?.mockResolvedValue([]);

//         // Act
//         const result = await service.findAllActive();

//         // Assert
//         expect(productRepository.find).toHaveBeenCalledWith({
//           where: { isActive: true },
//           order: { prodId: 'ASC' },
//         });
//         expect(result).toEqual([]);
//       });
//   });

//   // --- Tests for findAll ---
//   describe('findAll', () => {
//     it('should return all products when no filters are provided', async () => {
//       // Arrange: Mock the result of the query builder chain
//       mockQueryBuilder.getMany?.mockResolvedValue(allMockProducts);

//       // Act
//       const result = await service.findAll(); // No filters argument

//       // Assert
//       expect(productRepository.createQueryBuilder).toHaveBeenCalledWith('product');
//       expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled(); // No filter applied
//       expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
//       expect(result).toEqual(allMockProducts);
//     });

//     it('should return all products when filters object is empty', async () => {
//         // Arrange
//         mockQueryBuilder.getMany?.mockResolvedValue(allMockProducts);

//         // Act
//         const result = await service.findAll({}); // Empty filters object

//         // Assert
//         expect(productRepository.createQueryBuilder).toHaveBeenCalledWith('product');
//         expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
//         expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
//         expect(result).toEqual(allMockProducts);
//       });

//     it('should filter products by category when category filter is provided', async () => {
//         const category = 'Category A';
//         // Arrange: Mock getMany to return only products of Category A
//         mockQueryBuilder.getMany?.mockResolvedValue(categoryAMockProducts);

//         // Act
//         const result = await service.findAll({ category: category });

//         // Assert
//         expect(productRepository.createQueryBuilder).toHaveBeenCalledWith('product');
//         // Check if andWhere was called correctly
//         expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1);
//         // *** Adjusted Assertion: Check specific column name used in service ***
//         expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
//             'product.productCategory = :category', // Match the service code
//             { category: category }
//         );
//         expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
//         expect(result).toEqual(categoryAMockProducts);
//         // Optional check: ensure all returned products match the category
//         expect(result.every(p => p.category === category)).toBe(true);
//     });


//     it('should return an empty array if no products match the filter', async () => {
//         const category = 'NonExistentCategory';
//         // Arrange
//         mockQueryBuilder.getMany?.mockResolvedValue([]); // Simulate no results

//         // Act
//         const result = await service.findAll({ category: category });

//         // Assert
//         expect(productRepository.createQueryBuilder).toHaveBeenCalledWith('product');
//         expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1);
//         expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
//             'product.productCategory = :category', // Match the service code

//           { category: category }
//         );
//         expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
//         expect(result).toEqual([]);
//       });
//   });
// });