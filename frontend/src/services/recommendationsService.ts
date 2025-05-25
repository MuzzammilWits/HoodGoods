import axios from 'axios';
import { PopularProductDto } from '../types'; 

const API_URL = import.meta.env.VITE_API_BASE_URLs || 'http://localhost:3000/api';

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
    throw error;
    // return [];
  }
};