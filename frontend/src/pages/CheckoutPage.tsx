import React, { useState, useEffect } from 'react'; // Added React import
import { Link } from 'react-router-dom';
import './CheckoutPage.css'; // Make sure this CSS file exists and is linked
import { useCart } from '../context/ContextCart';

// Interface for items displayed within this component
type CartItemDisplay = {
  id: string; // Product ID as string
  name: string;
  price: number;
  quantity: number;
  storeName: string;
};

// Define the structure for delivery options
type DeliveryOption = {
  id: string;
  name: string;
  price: number;
  days: string;
};

export default function CheckoutPage() {
  const { cartItems } = useCart();

  // State for delivery address fields
  const [streetAddress, setStreetAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');

  // Hardcoded delivery areas and options
  const deliveryAreas = ['Area 1', 'Area 2', 'Area 3'];
  const deliveryOptions: DeliveryOption[] = [
    { id: 'standard', name: 'Standard Delivery', price: 50, days: '3-5 business days' },
    { id: 'express', name: 'Express Delivery', price: 100, days: '1-2 business days' }
  ];

  // --- Data Processing ---

  // Get unique store names from cart items using useMemo
  const storeNames = React.useMemo(() =>
    [...new Set(cartItems.map(item => item.storeName || 'Unknown Store'))]
  , [cartItems]);

  // Group items by store name using useMemo
  const groupedItems = React.useMemo(() =>
    cartItems.reduce((groups, item) => {
      const key = item.storeName || 'Unknown Store';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push({
        id: item.productId.toString(),
        name: item.productName,
        price: item.productPrice,
        quantity: item.quantity,
        storeName: key
      });
      return groups;
    }, {} as Record<string, CartItemDisplay[]>)
  , [cartItems]);

  // Initialize delivery option state for each store
  const [deliveryOptionState, setDeliveryOptionState] = useState<Record<string, string>>(() =>
    storeNames.reduce((acc, storeName) => {
      acc[storeName] = 'standard';
      return acc;
    }, {} as Record<string, string>)
  );

  // Update state if storeNames change
  useEffect(() => {
    setDeliveryOptionState(prev => {
      const newState = { ...prev };
      let changed = false;
      storeNames.forEach(name => {
        if (!(name in newState)) {
          newState[name] = 'standard';
          changed = true;
        }
      });
      // Optional: Remove entries for stores no longer in cart
      // Object.keys(newState).forEach(name => {
      //   if (!storeNames.includes(name)) {
      //     delete newState[name];
      //     changed = true;
      //   }
      // });
      return changed ? newState : prev;
    });
  }, [storeNames]);


  // --- Calculation Functions ---

  const calculateStoreSubtotal = (items: CartItemDisplay[]): number => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateTotalDelivery = (): number => {
    return storeNames.reduce((sum, storeName) => {
      const selectedOptionId = deliveryOptionState[storeName];
      const option = deliveryOptions.find(opt => opt.id === selectedOptionId);
      return sum + (option?.price || 0);
    }, 0);
  };

  const calculateGrandTotal = (): number => {
    const itemsSubtotal = Object.values(groupedItems)
                           .flat()
                           .reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryTotal = calculateTotalDelivery();
    return itemsSubtotal + deliveryTotal;
  };

  // --- Event Handlers ---

  const handleDeliveryOptionChange = (storeName: string, optionId: string) => {
    setDeliveryOptionState(prev => ({
      ...prev,
      [storeName]: optionId
    }));
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Implement order submission logic
    console.log('Submitting order...');
    console.log('Delivery Address:', { streetAddress, deliveryArea });
    console.log('Selected Delivery Options:', deliveryOptionState);
    console.log('Grouped Items:', groupedItems);
    console.log('Grand Total:', calculateGrandTotal());
    // alert('Order submitted (check console for details)!'); // Use a better notification method
  };

  // --- Render Logic ---

  if (!cartItems || cartItems.length === 0) {
    return (
      <main className="checkout-container">
        <h1>Checkout</h1>
        <p>Loading cart or cart is empty...</p>
        <Link to="/products" className="back-link">Continue Shopping</Link>
      </main>
    );
  }

  return (
    // Use <main> for the primary content area
    <main className="checkout-container">
      <header>
        <h1>Checkout</h1>
        <p className="instructions">Please enter your delivery details and review your order.</p>
      </header>

      <form className="checkout-form" onSubmit={handleFormSubmit}>

        {/* Use <section> for distinct parts of the form */}
        <section className="form-section delivery-address-section" aria-labelledby="delivery-address-heading">
          <h2 id="delivery-address-heading">Delivery Address</h2>
          {/* Use paragraphs or fieldsets for grouping related fields */}
          <p className="form-field">
            <label htmlFor="street-address">Street Address</label>
            <input
              id="street-address"
              type="text"
              className="form-input"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              required
              autoComplete="street-address" // Add autocomplete attribute
            />
          </p>
          <p className="form-field">
            <label htmlFor="delivery-area">Delivery Area</label>
            <select
              id="delivery-area"
              className="form-input"
              value={deliveryArea}
              onChange={(e) => setDeliveryArea(e.target.value)}
              required
            >
              <option value="" disabled>Select an area...</option>
              {deliveryAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </p>
        </section>

        <section className="form-section order-summary-section" aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading">Order Summary</h2>

          {/* Map over store names */}
          {storeNames.map(storeName => {
            const items = groupedItems[storeName];
            if (!items || items.length === 0) {
              return null;
            }

            const selectedOptionId = deliveryOptionState[storeName] || 'standard';
            const selectedOption = deliveryOptions.find(opt => opt.id === selectedOptionId);

            // Use <article> for each self-contained store summary
            return (
              <article key={storeName} className="store-group" aria-labelledby={`store-heading-${storeName}`}>
                <h3 id={`store-heading-${storeName}`} className="store-name">{storeName}</h3>

                {/* Delivery Options */}
                <p className="delivery-option form-field">
                   <label htmlFor={`delivery-${storeName}`}>Delivery Option</label>
                   <select
                      id={`delivery-${storeName}`}
                      className="form-input"
                      value={selectedOptionId}
                      onChange={(e) => handleDeliveryOptionChange(storeName, e.target.value)}
                    >
                      {deliveryOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name} - R{option.price.toFixed(2)} ({option.days})
                        </option>
                      ))}
                    </select>
                </p>

                {/* Items List */}
                <ul className="order-items" aria-label={`Items from ${storeName}`}>
                  {items.map(item => (
                    <li key={`${item.id}-${item.storeName}`} className="order-item">
                      {/* Using text directly, spans removed */}
                      {item.name} - R{item.price.toFixed(2)} × {item.quantity}
                    </li>
                  ))}
                </ul>

                {/* Store Summary Footer */}
                <footer className="store-summary">
                  <p>Subtotal: R{calculateStoreSubtotal(items).toFixed(2)}</p>
                  <p>Delivery: R{(selectedOption?.price || 0).toFixed(2)}</p>
                </footer>
              </article>
            );
          })}

          {/* Grand Total Section */}
          <footer className="order-totals">
            <p className="grand-total">
                {/* Using text directly, spans removed */}
                Grand Total: R{calculateGrandTotal().toFixed(2)}
            </p>
          </footer>
        </section>

        {/* Actions Menu */}
        <menu className="actions">
          <li> {/* Keep li for menu items */}
            <button type="submit" className="confirm-btn">
              Confirm Order
            </button>
          </li>
          <li>
            <Link to="/cart" className="back-link">
              Back to Cart
            </Link>
          </li>
        </menu>
      </form>
    </main>
  );
}
