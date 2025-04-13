import React from 'react';
import './ExploreShops.css';
// Import using the utility instead of direct imports
import { wristLoversImg, amberBloomImg, clayRootImg, wovenWildsImg, getImage } from './utils/ImageImports';

interface ShopCardProps {
  name: string;
  image: string;
  info: string;
}

const ShopCard: React.FC<ShopCardProps> = ({ name, image, info }) => {
  return (
    <div className="shop-card">
      <div className="shop-card-image">
        {getImage(image, name, 250, 200)}
      </div>
      <div className="shop-card-content">
        <h3 className="shop-name">{name}</h3>
        <a href="#featured-products" className="shop-info">{info}</a>
      </div>
    </div>
  );
};

const ExploreShops: React.FC = () => {
  const shops = [
    {
      id: 1,
      name: 'Wrist Lovers',
      image: wristLoversImg,
      info: 'more information'
    },
    {
      id: 2,
      name: 'Amber Bloom',
      image: amberBloomImg,
      info: 'more information'
    },
    {
      id: 3,
      name: 'Clay Root',
      image: clayRootImg,
      info: 'more information'
    },
    {
      id: 4,
      name: 'Woven Wilds',
      image: wovenWildsImg,
      info: 'more information'
    }
  ];

  return (
    <section className="explore-shops section">
      <div className="container">
        <div className="section-title">
          <h2>Explore Shops</h2>
          <a href="#" className="view-all">view all</a>
        </div>
        <div className="shops-grid">
          {shops.map(shop => (
            <ShopCard 
              key={shop.id}
              name={shop.name}
              image={shop.image}
              info={shop.info}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExploreShops;