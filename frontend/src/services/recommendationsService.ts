// frontend/src/services/recommendationsService.ts
import axios from 'axios';
import { PopularProductDto } from '../types'; // Or '../types/recommendations' if you created a separate file

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const getBestSellingProducts = async (
  limit?: number,
  timeWindowDays?: number,
): Promise<PopularProductDto[]> => {
  try {
    const params = new URLSearchParams();
    if (limit !== undefined) {
      params.append('limit', String(limit));
    }
    if (timeWindowDays !== undefined) {
      params.append('timeWindowDays', String(timeWindowDays));
    }

    const response = await axios.get<PopularProductDto[]>(
      `${API_URL}/recommendations/best-sellers`,
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching best selling products:', error);
    // You might want to throw the error or return an empty array
    // depending on how you want to handle errors in your components
    throw error;
    // return [];
  }
};