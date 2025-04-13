import React from 'react';
import './FeaturedProducts.css';
// Import using the utility instead of direct imports
import { abstractArtImg, ecoJewelleryImg, scarfImg, leatherBagImg, getImage } from './utils/ImageImports';

interface ColorOption {
  id: number;
  color: string;
}

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  colorOptions: ColorOption[];
}

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="product-card">
      <div className="product-image">
        {getImage(product.image, product.name, 250, 200)}
      </div>
      <div className="product-details">
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <span className="product-price">{product.price}</span>
        </div>
        <div className="product-colors">
          {product.colorOptions.map(option => (
            <button
              key={option.id}
              className="color-option"
              style={{ backgroundColor: option.color }}
              aria-label={`Color option ${option.id}`}
            />
          ))}
        </div>
      </div>
      <button className="buy-button">Buy</button>
    </div>
  );
};

const FeaturedProducts: React.FC = () => {
  const products: Product[] = [
    {
      id: 1,
      name: 'Abstract Art',
      price: 'R1000',
      image: abstractArtImg,
      colorOptions: [
        { id: 1, color: '#000000' },
        { id: 2, color: '#FFFFFF' },
        { id: 3, color: '#B48C77' }
      ]
    },
    {
      id: 2,
      name: 'Eco - Jewellery Chain',
      price: 'R300',
      image: ecoJewelleryImg,
      colorOptions: [
        { id: 1, color: '#CFB53B' },
        { id: 2, color: '#C0C0C0' },
        { id: 3, color: '#CD7F32' }
      ]
    },
    {
      id: 3,
      name: 'Handwoven Scarf',
      price: 'R450',
      image: scarfImg,
      colorOptions: [
        { id: 1, color: '#FF5733' },
        { id: 2, color: '#3366FF' },
        { id: 3, color: '#33FF57' }
      ]
    },
    {
      id: 4,
      name: 'Hand Made Leather Bag',
      price: 'R2500',
      image: leatherBagImg,
      colorOptions: [
        { id: 1, color: '#8B4513' },
        { id: 2, color: '#D2691E' },
        { id: 3, color: '#A52A2A' }
      ]
    }
  ];

  return (
    <section className="featured-products section">
      <div className="container">
        <div className="section-title">
          <h2>Featured</h2>
          <a href="#" className="view-all">view all</a>
        </div>
        <div className="products-slider">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;