import { useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ExploreShops from './components/ExploreShops';
import SearchBar from './components/SearchBar';
import FeaturedProducts from './components/FeaturedProducts';
import WhyChooseUs from './components/WhyChooseUs';
import Footer from './components/Footer';

function App() {
 // const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    //setSearchQuery(query);
    // Implement search functionality here
    console.log('Searching for:', query);
  };

  return (
    <div className="app">
      <Navbar />
      <main>
        <Hero />
        <ExploreShops />
        <SearchBar onSearch={handleSearch} />
        <FeaturedProducts />
        <WhyChooseUs />
      </main>
      <Footer />
    </div>
  );
}

export default App;