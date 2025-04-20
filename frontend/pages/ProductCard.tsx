import { Link } from 'react-router-dom';
//import { Product } from '../api/products';
//import { useProducts } from 'src/context/ProductContext';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
}

interface Product {
  productID: string;
  productName: string;
  productdescription: string;
  productCategory: string;
  productprice: number;
  userID: string;
  imageURL: string;
  storeName: string;
}

const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <div className="product-card">
      <Link to={`/products/${product.productID}`}>
        <div className="product-image-container">
          <img 
            src={product.imageURL || '/placeholder-product.jpg'} 
            alt={product.productName}
            className="product-image"
          />
        </div>
        
        <div className="product-info">
          <h3 className="product-name">{product.productName}</h3>
          <div className="product-store">{product.storeName}</div>
          <div className="product-pricing">
            <span className="current-price">R{product.productprice.toFixed(2)}</span>
          </div>
          <div className="product-category">{product.productCategory}</div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;