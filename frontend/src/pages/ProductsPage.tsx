import { useEffect, useState } from 'react';
import { useCart } from '../context/ContextCart';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './ProductsPage.css'; // Assuming this CSS file exists and styles the classes

interface Product {
  prodId: number;
  name: string;
  description: string;
  category: string;
  price: number;
  userId: string;
  imageUrl: string;
  storeName : string;
  isActive : boolean;
  productquantity : number;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();

  const selectedCategory = searchParams.get('category') || '';

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true); // Ensure loading state is set at the beginning
      try {
        const response = await axios.get(`${backendUrl}/products`);

        // Basic validation of response data
        if (!Array.isArray(response.data)) {
           // Check if it's an object with a products array (adjust if backend structure differs)
          if (typeof response.data === 'object' && response.data !== null && Array.isArray(response.data.products)) {
            setProducts(response.data.products); // Example adjustment
          } else {
            console.error("Unexpected data format:", response.data);
            throw new Error('Invalid data format received from server');
          }
        } else {
           setProducts(response.data);
        }

        setError(null);
      } catch (err) {
        const errorMessage = axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load products';

        console.error("Fetch products error:", errorMessage, err); // Log detailed error
        setError(errorMessage);
        setProducts([]); // Clear products on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []); // Removed dependency array cycle possibility for fetch

  // Effect for filtering products based on category or products changing
  useEffect(() => {
    if (selectedCategory) {
      setFilteredProducts(
        products.filter(product => product.category === selectedCategory)
      );
    } else {
      setFilteredProducts(products); // Show all if no category selected
    }
  }, [selectedCategory, products]); // Runs when category or products list changes

  const handleCategoryChange = (category: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (category) {
      newParams.set('category', category);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams, { replace: true }); // Use replace to avoid history clutter
  };

// Inside ProductsPage component...

interface AddToCartItem {
  productId: number;
  productName: string;
  productPrice: number;
  imageUrl?: string;
}

const handleAddToCart = async (product: Product) => {
  try {
    const price = Number(product.price);
    if (isNaN(price)) {
      throw new Error('Product price is invalid');
    }

    // Prepare the item object matching the AddToCartItem interface
    const itemToAdd: AddToCartItem = { // Explicitly use the interface type (optional but good practice)
      productId: product.prodId,
      productName: product.name,
      productPrice: price,
      // --- FIX: Change 'image' to 'imageUrl' ---
      imageUrl: product.imageUrl || undefined // Use undefined or omit if placeholder isn't desired here
      // If product.imageUrl can be null/empty, sending undefined is fine.
      // The context logic might handle adding a default if needed, or CartPage handles display fallback.
    };

    // Now itemToAdd correctly has the imageUrl property
    await addToCart(itemToAdd);

    alert(`${product.name} added to cart!`);

  } catch (error) {
     console.error('Error adding to cart:', error);
     setError(error instanceof Error ? error.message : 'Failed to add item to cart');
  }
};

// ... rest of the component

  // Memoize category calculation if products list is large, otherwise fine as is
  const categories = [...new Set(products.map(product => product.category))];

  // --- Render Logic ---

  if (isLoading) {
    // Using <p> for semantic text content
    return <p className="loading-spinner">Loading products...</p>;
  }

  if (error) {
    // Using <div> with role="alert" for accessibility of error messages
    return (
      <section className="error-message" role="alert">
        <p>{error}</p> {/* Put error text in a paragraph */}
        <button
          onClick={() => {
            // Trigger refetch by resetting state and letting useEffect run
            setError(null);
            setProducts([]); // Clear potentially stale data
            // setIsLoading(true); // Let useEffect handle loading state
            // Trigger useEffect by changing a dependency if needed, or rely on mount/initial load
             // Re-fetch logic is handled by the main useEffect
             window.location.reload(); // Simple retry, consider more sophisticated state reset
          }}
          className="retry-button"
        >
          Retry
        </button>
      </section>
    );
  }

  // --- Main Render ---
  // Using <main> for the primary content area of the page
  return (
    <main className="products-container">
      <h1>Artisan Products</h1>

      {/* Using <section> to group the filtering controls */}
      <section className="category-filter filters"> {/* Added 'filters' class from your CSS */}
        <label htmlFor="category-select">Filter by Category:</label>
        <select
          id="category-select"
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </section>

      {/* Using <ul> for the list of products, semantically correct */}
      <ul className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            // Using <li> for each item in the product list
            // Keeping product-card class on the <li> for styling continuity
            <li key={product.prodId} className="product-card">
              {/* Using <article> to represent each self-contained product */}
              <article>
                {/* Using <figure> for the product image */}
                <figure className="product-image-container">
                  <img
                    src={product.imageUrl || '/placeholder-product.jpg'} // Fallback image URL
                    alt={product.name || 'Product image'} // Fallback alt text
                    className="product-image"
                    // Basic error handling for images
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      // Prevent infinite loop if placeholder also fails
                      if (target.src !== '/placeholder-product.jpg') {
                         target.src = '/placeholder-product.jpg';
                         target.alt = 'Placeholder image'; // Update alt text
                         target.classList.add('placeholder');
                      }
                    }}
                    loading="lazy" // Add lazy loading for images
                  />
                </figure>
                {/* Using <section> for the group of product details */}
                <section className="product-details">
                  {/* Use <h2> for product name within the <article> scope */}
                  <h2 className="product-name">{product.name}</h2>
                  {/* Using <p> for discrete pieces of information */}
                  <p className="product-store">Sold by: {product.storeName || 'Unknown Store'}</p>
                  <p className="product-description">{product.description}</p>
                  <p className="product-category">Category: {product.category}</p>
                  <p className="product-price">R{(Number(product.price) || 0).toFixed(2)}</p> {/* Ensure price is number */}
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="add-to-cart-btn"
                    aria-label={`Add ${product.name} to cart`}
                    type="button" // Explicitly set button type
                  >
                    Add to Cart
                  </button>
                </section>
              </article>
            </li>
          ))
        ) : (
          // Using <p> for the "no products" message
          <li className="no-products"> {/* Wrap in <li> to be valid child of <ul> */}
            <p>
              {selectedCategory
                ? `No products found in the "${selectedCategory}" category.` // Added quotes
                : 'No products available at the moment.'}
            </p>
          </li>
        )}
      </ul>
    </main>
  );
};

export default ProductsPage;