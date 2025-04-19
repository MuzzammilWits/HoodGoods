import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/ContextCart';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
}

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    // Simulate fetching products from Supabase
    const fetchProducts = async () => {
      try {
        // In a real app, this would be an API call to your backend
        // const response = await axios.get('/api/products');
        // setProducts(response.data);
        
        // Mock data for demonstration
        const mockProducts: Product[] = [
          {
            id: 'prod-1',
            name: 'Handmade Ceramic Mug',
            price: 24.99,
            description: 'Beautiful handmade ceramic mug with unique glaze',
            image: 'https://assets.woolworthsstatic.co.za/Reclaymed-Stoneware-Stipple-Mug-LINEN-509307238.jpg?V=5Fuf&o=eyJidWNrZXQiOiJ3dy1vbmxpbmUtaW1hZ2UtcmVzaXplIiwia2V5IjoiaW1hZ2VzL2VsYXN0aWNlcmEvcHJvZHVjdHMvaGVyby8yMDI0LTEwLTE2LzUwOTMwNzIzOF9MSU5FTl9oZXJvLmpwZyJ9&w=800&q=85'
          },
          {
            id: 'prod-2',
            name: 'Wooden Cutting Board',
            price: 35.50,
            description: 'Handcrafted oak cutting board',
            image: 'https://assets.woolworthsstatic.co.za/Acacia-Wood-Double-Handle-Board-NATURAL-507866140.jpg?V=Luov&o=eyJidWNrZXQiOiJ3dy1vbmxpbmUtaW1hZ2UtcmVzaXplIiwia2V5IjoiaW1hZ2VzL2VsYXN0aWNlcmEvcHJvZHVjdHMvaGVyby8yMDI0LTAzLTA4LzUwNzg2NjE0MF9OQVRVUkFMX2hlcm8uanBnIn0&w=800&q=85'
          }
        ];
        
        setProducts(mockProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (isLoading) {
    return <div>Loading products...</div>;
  }

  return (
    <div className="products-container">
      <h1>Artisan Products</h1>
      <div className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <img src={product.image} alt={product.name} className="product-image" />
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p className="product-price">R{product.price.toFixed(2)}</p>
            <button 
                onClick={() => addToCart({
                    productId: product.id,  // Now matches the CartItem interface
                    name: product.name,
                    price: product.price,
                    image: product.image
                })}
                className="add-to-cart-btn"
                >
                Add to Cart
                </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductsPage;