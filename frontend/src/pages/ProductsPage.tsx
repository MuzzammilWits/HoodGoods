// src/pages/ProductsPage.tsx
import { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { useCart } from '../context/ContextCart'; // Adjust path
import { useSearchParams } from 'react-router-dom'; // Adjust path
import axios from 'axios';
import './ProductsPage.css'; // Ensure path is correct

// Define the Product interface
interface Product {
  prodId: number;
  name: string;
  description: string;
  category: string;
  price: number;
  userId: string;
  imageUrl: string;
  storeName: string;
  isActive: boolean;
}

// Backend URL configuration
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const ProductsPage = () => {
  // State for all products fetched from backend
  const [products, setProducts] = useState<Product[]>([]);
  // State for products filtered by category
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  // Loading state for API calls
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Error state for displaying messages
  const [error, setError] = useState<string | null>(null);
  // Hook to manage URL search parameters for filtering
  const [searchParams, setSearchParams] = useSearchParams();
  // Hook to access cart context functions
  const { addToCart } = useCart();

  // Get the currently selected category from URL search parameters
  const selectedCategory = searchParams.get('category') || '';

  // --- Fetching Products ---
  const fetchProducts = useCallback(async () => {
    // Set loading true at the start of fetch attempt
    setIsLoading(true);
    setError(null); // Clear previous errors
    try {
      const response = await axios.get(`${backendUrl}/products`);

      // Validate the response data format
      if (!Array.isArray(response.data)) {
        console.error("Received non-array data:", response.data);
        throw new Error('Invalid data format received from server');
      }

      // Update state with fetched products
      setProducts(response.data);
    } catch (err) {
      // Handle potential errors during fetch
      console.error("Fetch products error:", err);
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message // Use backend message if available
        : err instanceof Error
        ? err.message
        : 'Failed to load products'; // Fallback message

      setError(errorMessage);
      setProducts([]); // Clear products on error
    } finally {
      // Ensure loading state is set to false after fetch attempt completes
      setIsLoading(false);
    }
  }, []); // Empty dependency array means this runs once on mount

  // Effect to trigger fetching products on initial component mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]); // Depend on the fetchProducts function itself

  // --- Filtering Products ---
  // Effect to update the filtered list whenever the selected category or the main product list changes
  useEffect(() => {
    if (selectedCategory) {
      // Filter products based on the selected category
      setFilteredProducts(
        products.filter(product => product.category === selectedCategory)
      );
    } else {
      // If no category is selected, show all products
      setFilteredProducts(products);
    }
  }, [selectedCategory, products]); // Dependencies: run when category or products change

  // --- Event Handlers ---

  // Handles changes in the category filter dropdown
  const handleCategoryChange = (category: string) => {
    const newParams = new URLSearchParams(searchParams); // Create mutable copy
    if (category) {
      // Set the 'category' parameter in the URL
      newParams.set('category', category);
    } else {
      // Remove the 'category' parameter if "All Categories" is selected
      newParams.delete('category');
    }
    // Update the URL search parameters, triggering a re-render and the filter useEffect
    setSearchParams(newParams);
  };

  // Handles adding a product to the cart
  const handleAddToCart = useCallback(async (product: Product) => {
    try {
      // Basic validation
      if (!product || !product.prodId) {
        throw new Error('Product data is invalid or missing ID');
      }

      // Prepare item data for the cart context
      const cartItem = {
        productId: product.prodId.toString(), // Context might expect string ID
        name: product.name,
        price: product.price,
        image: product.imageUrl // Pass image URL
      };

      // Call the addToCart function from the context
      await addToCart(cartItem);
      // Provide user feedback (consider a less intrusive notification)
      alert(`${product.name} added to cart!`);
    } catch (error) {
      // Log and display errors related to adding to cart
      console.error('Error adding to cart:', error);
      setError(error instanceof Error ? error.message : 'Failed to add item to cart');
      // Optionally clear the error after a delay
      // setTimeout(() => setError(null), 3000);
    }
  }, [addToCart]); // Dependency: addToCart function from context

  // --- Derived State ---
  // Get unique categories from the fetched products for the filter dropdown
  const categories = [...new Set(products.map(product => product.category))];

  // --- Render Logic ---

  // Display loading indicator while fetching
  if (isLoading) {
    return (
      <section className="loading-spinner" aria-live="polite">
        <p>Loading products...</p>
      </section>
    );
  }

  // Display error message and retry button if fetching failed
  if (error) {
    return (
      <section className="error-message" role="alert">
        <p>{error}</p>
        {/* Retry button calls fetchProducts directly */}
        <button
          onClick={fetchProducts}
          className="retry-button"
        >
          Retry
        </button>
      </section>
    );
  }

  // Main component render
  return (
    // Use semantic <main> for the primary content area
    <main className="products-container">
      {/* Use semantic <header> for the page title area */}
      <header>
        <h1>Artisan Products</h1>
      </header>

      {/* Use semantic <aside> for the filtering controls */}
      <aside className="category-filter">
        <label htmlFor="category-select">Filter by Category:</label>
        <select
          id="category-select"
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          aria-label="Filter products by category" // Accessibility improvement
        >
          <option value="">All Categories</option>
          {/* Populate dropdown options from derived categories */}
          {categories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </aside>

      {/* Use semantic <section> for the grid of products */}
      <section className="products-grid" aria-label="List of products">
        {/* Conditional rendering based on whether filtered products exist */}
        {filteredProducts.length > 0 ? (
          // Map over filtered products to render product cards
          filteredProducts.map((product) => (
            // Use semantic <article> for each self-contained product card
            <article key={product.prodId} className="product-card">
              {/* Use semantic <figure> for the product image */}
              <figure className="product-image-container">
                <img
                  src={product.imageUrl}
                  alt={product.name} // Use product name for alt text
                  className="product-image"
                  // Fallback image logic
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-product.jpg'; // Path to your placeholder
                    target.classList.add('placeholder');
                  }}
                  loading="lazy" // Improve performance by lazy loading images
                />
              </figure>

              {/* Use semantic <section> for the textual details */}
              <section className="product-details">
                 {/* Use semantic <header> for name/store */}
                 <header>
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-store">Sold by: {product.storeName}</p>
                 </header>

                <p className="product-description">{product.description}</p>
                <p className="product-category">Category: {product.category}</p>
                <p className="product-price">R{product.price.toFixed(2)}</p>

                {/* Use semantic <footer> for the action button */}
                <footer>
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="add-to-cart-btn"
                    aria-label={`Add ${product.name} to cart`} // More descriptive label
                  >
                    Add to Cart
                  </button>
                </footer>
              </section>
            </article>
          ))
        ) : (
          // Display message if no products match the filter or if none exist
          <section className="no-products">
            <p>
              {selectedCategory
                ? `No products found in ${selectedCategory} category.` // More specific message
                : 'No products available at the moment.'}
            </p>
          </section>
        )}
      </section>
    </main>
  );
};

export default ProductsPage;
