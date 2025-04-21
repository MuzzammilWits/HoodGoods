export class FilterProductsDto {
    productCategory?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
    storeName?: string;
    userID?: string;
  }