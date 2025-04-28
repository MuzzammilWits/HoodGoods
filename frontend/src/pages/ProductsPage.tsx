import { useEffect, useState } from 'react';
import { useCart } from '../context/ContextCart'; // Ensure path is correct
import { useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react'; // Import useAuth0
import axios from 'axios';

import './ProductsPage.css';

// NEW: Search normalizer function
const normalizeSearchTerm = (term: string) => {
  return term
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s]/g, '')  // Remove punctuation
    .replace(/\b(s|es|ies|ing|ed|er)\b/g, '')  // Better suffix stripping
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim();
};


interface Product {
  prodId: number;
  name: string;
  description: string;
  category: string;
  price: number;

  productquantity: number; // Added productquantity



  userId: string;
  imageUrl: string;
  storeId: number;


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
  const { user, isAuthenticated } = useAuth0(); // Get user info and auth status

  // NEW: Added store and search URL params
  const selectedCategory = searchParams.get('category') || '';
  const selectedStore = searchParams.get('store') || '';
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {

        // Fetch includes userId and productquantity now
        const response = await axios.get<{ products: Product[] } | Product[]>(`${backendUrl}/products`); // Added type hint for response

        let fetchedProducts: Product[] = [];

        // Handle potential variations in backend response structure
        if (Array.isArray(response.data)) {
            fetchedProducts = response.data;
        } else if (typeof response.data === 'object' && response.data !== null && Array.isArray(response.data.products)) {
             // Example: if backend wraps products in an object { products: [...] }
             fetchedProducts = response.data.products;
        } else {
             console.error("Unexpected data format:", response.data);
             throw new Error('Invalid data format received from server');
        }

        // Validate fetched product data (basic check)
        if (fetchedProducts.some(p => typeof p.prodId === 'undefined' || typeof p.name === 'undefined')) {
             console.warn("Some fetched products might be missing required fields.");
             // Optionally filter out invalid products or handle differently
        }
        console.log("Fetched Products (check for userId):", fetchedProducts); // Check if userId is present

        setProducts(fetchedProducts);


        setError(null);
      } catch (err) {
        const errorMessage = axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load products';

        console.error("Fetch products error:", errorMessage, err);
        setError(errorMessage);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();

  }, []); // Empty dependency array means fetch runs once on mount


  // NEW: Updated filtering logic for category + store + search
  useEffect(() => {
    let result = [...products];
    
    // Category filter (unchanged)
    if (selectedCategory) {
      result = result.filter(product => product.category === selectedCategory);
    }
    
    // Store filter (unchanged)
    if (selectedStore) {
      result = result.filter(product => product.storeName === selectedStore);
    }
    
    // NEW improved search
    if (searchQuery) {
      const normalizedQuery = normalizeSearchTerm(searchQuery);
      result = result.filter(product => {
        const searchFields = [
          product.name,
          product.description,
          product.storeName,
          product.category
        ].map(field => normalizeSearchTerm(field));
  
        return searchFields.some(field => 
          field.includes(normalizedQuery) || 
          normalizedQuery.includes(field)
        );
      });
    }

  
    setFilteredProducts(result);
  }, [selectedCategory, selectedStore, searchQuery, products]);


  const handleCategoryChange = (category: string) => {
    // ... (implementation unchanged)
    const newParams = new URLSearchParams(searchParams);
    if (category) {
      newParams.set('category', category);
    } else {
      newParams.delete('category');
    }

    setSearchParams(newParams, { replace: true });
  };

  const handleAddToCart = async (product: Product) => {
    // ... (implementation unchanged, including stock check)
     try {
       if (!product || typeof product.prodId === 'undefined') {
         console.error('Attempted to add invalid product to cart:', product);
         throw new Error('Product data is invalid or missing ID');
       }

       const price = Number(product.price);
       if (isNaN(price)) {
          console.error('Product price is not a valid number:', product.price);
          throw new Error('Product price is invalid');
       }

       if (product.productquantity <= 0) {
           alert(`${product.name} is currently out of stock.`);
           return;
       }

       // Check if user owns the product before adding (redundant if button disabled, but good practice)
       if (isAuthenticated && user?.sub === product.userId) {
           alert("You cannot add your own product to the cart.");
           return;
       }


       const cartItem = {
         productId: String(product.prodId),
         name: product.name,
         price: price,
         image: product.imageUrl || '/placeholder-product.jpg'
       };

       await addToCart(cartItem);
       alert(`${product.name} added to cart!`); // Consider using a less intrusive notification
     } catch (error) {
       console.error('Error adding to cart:', error);
       setError(error instanceof Error ? error.message : 'Failed to add item to cart');
       // Auto-clear error after a delay
      setTimeout(() => {
           if (error instanceof Error && error.message === (error as Error).message) {
                setError(null);
           } else if (typeof error === 'string' && error === 'Failed to add item to cart') {
                setError(null);
           }
       }, 5000);
     }
  };


  // Memoize category calculation if products list is large, otherwise fine as is
  const categories = [...new Set(products.map(product => product.category))];

    // newParams.delete('store'); // NEW: Reset store when changing category
    setSearchParams(newParams, { replace: true });
  };

  // NEW: Store filter handler
  const handleStoreChange = (store: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (store) {
      newParams.set('store', store);
    } else {
      newParams.delete('store');
    }
    setSearchParams(newParams, { replace: true });
  };

  // NEW: Search handler
  const handleSearchChange = (query: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (query) {
      newParams.set('search', query);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  };



// Inside ProductsPage component...

interface AddToCartItem {
  productId: number;
  productName: string;
  productPrice: number;
  imageUrl?: string;
  storeId: number;   // Add storeId
  storeName: string;  // Add storeName
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
      storeId: product.storeId,
      storeName: product.storeName,
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

  const categories = [...new Set(products.map(product => product.category))];
  const stores = [...new Set(products.map(product => product.storeName))]; // NEW: Store list

  if (isLoading) {
    return <p className="loading-spinner">Loading products...</p>;
  }


  if (error && !isLoading) { // Ensure error is only shown when not loading
     // ... (error display unchanged)
     return (
       <section className="error-message" role="alert" aria-live="assertive"> {/* Using section and aria-live */}
         <h2>Error Loading Products</h2> {/* More specific heading */}
         <p>{error}</p>
         <button
           onClick={() => window.location.reload()} // Simple reload for retry
           className="retry-button"
         >
           Retry
         </button>
       </section>
     );
  }


  // --- Main Render ---

  return (
    <main className="products-container">
      <h1>Artisan Products</h1>


      {/* NEW: Search bar section */}
      <section className="search-bar filters">
        <label htmlFor="product-search">Search Products:</label>
        <input
          id="product-search"
          type="text"
          placeholder="Search by name, description, or store..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </section>

      <section className="category-filter filters">
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


      {/* Products Grid */}
      <ul className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            // *** Check if the current user is the owner ***
            const isOwner = isAuthenticated && product.userId === user?.sub;
            // *** Determine button state and text ***
            const isOutOfStock = product.productquantity <= 0;
            const isDisabled = isOutOfStock || isOwner;
            const buttonText = isOwner ? 'Your Product' : (isOutOfStock ? 'Out of Stock' : 'Add to Cart');

            return (
              <li key={product.prodId} className="product-card">
                <article>
                  <figure className="product-image-container">
                    <img
                      src={product.imageUrl || '/placeholder-product.jpg'}
                      alt={product.name || 'Product image'}
                      className="product-image"
                      onError={(e) => { /* Error handling unchanged */
                         const target = e.target as HTMLImageElement;
                         if (target.src !== '/placeholder-product.jpg') {
                            target.src = '/placeholder-product.jpg';
                            target.alt = 'Placeholder image';
                            target.classList.add('placeholder');
                         }
                      }}
                      loading="lazy"
                    />
                  </figure>
                  <section className="product-details">
                    <h2 className="product-name">{product.name}</h2>
                    <p className="product-store">Sold by: {product.storeName || 'Unknown Store'}</p>
                    <p className="product-description">{product.description}</p>
                    <p className="product-category">Category: {product.category}</p>
                    <p className="product-price">R{(Number(product.price) || 0).toFixed(2)}</p>
                    {/* Quantity Display */}
                    <p className="product-quantity">
                      {isOutOfStock ? 'Out of Stock' : `Available: ${product.productquantity}`}
                    </p>
                    {/* --- UPDATE Add to Cart Button --- */}
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="add-to-cart-btn"
                      // Update aria-label based on owner status
                      aria-label={isOwner ? `Cannot add own product ${product.name}` : `Add ${product.name} to cart`}
                      type="button"
                      // Disable if out of stock OR if user owns it
                      disabled={isDisabled}
                    >
                      {buttonText} {/* Display dynamic text */}
                    </button>
                    {/* --- End Update --- */}
                  </section>
                </article>
              </li>
            );
          })
        ) : (
          // No products message (unchanged)
          <li className="no-products">
            <p>
              {selectedCategory
                ? `No products found in the "${selectedCategory}" category.`

                : 'No products available at the moment.'}
            </p>
          </li>
        )}
      </ul>
    </main>
  );
};

export default ProductsPage; 