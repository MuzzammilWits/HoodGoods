import { Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/ContextCart';
import './App.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ExploreShops from './components/ExploreShops';
import SearchBar from './components/SearchBar';
import FeaturedProducts from './components/FeaturedProducts';
import WhyChooseUs from './components/WhyChooseUs';
import Footer from './components/Footer';
import CartPage from './pages/CartPage';

function App() {
  const handleSearch = (query: string) => {
    console.log('Searching for:', query);
  };

  return (
    <CartProvider>
      <div className="app">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={
              <>
                <Hero />
                <ExploreShops />
                <SearchBar onSearch={handleSearch} />
                <FeaturedProducts />
                <WhyChooseUs />
              </>
            } />
            <Route path="/cart" element={<CartPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}

export default App;