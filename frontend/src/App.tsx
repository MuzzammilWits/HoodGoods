import { Auth0Provider } from '@auth0/auth0-react';
import './App.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ExploreShops from './components/ExploreShops';
import SearchBar from './components/SearchBar';
import FeaturedProducts from './components/FeaturedProducts';
import WhyChooseUs from './components/WhyChooseUs';
import Footer from './components/Footer';

function App() {
  const handleSearch = (query: string) => {
    console.log('Searching for:', query);
  };

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        redirect_uri: import.meta.env.VITE_AUTH0_CALLBACK_URL,
      }}
    >
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
    </Auth0Provider>
  );
}

export default App;

