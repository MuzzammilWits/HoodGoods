export interface ColorOption {
    id: number;
    color: string;
  }
  
  export interface Product {
    id: number;
    name: string;
    price: string;
    image: string;
    colorOptions: ColorOption[];
  }
  
  export interface Shop {
    id: number;
    name: string;
    image: string;
    info: string;
  }
  
  export interface Feature {
    id: number;
    title: string;
    description: string;
    icon: string;
  }