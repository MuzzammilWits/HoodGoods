import { Routes, Route, Link } from 'react-router-dom';
import { CartProvider } from './context/ContextCart';
import HomePage from './pages/HomePage';
import CartPage from './pages/CartPage';
import './App.css';

function App() {
  return (
    <CartProvider>
      <div className="app">
          <div className="nav-logo">
            <Link to="/">Artisan Marketplace</Link>
          </div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/cart">Cart</Link>
          </div>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/cart" element={<CartPage />} />
          </Routes>
        </main>
      </div>
    </CartProvider>
  );
}

export default App;