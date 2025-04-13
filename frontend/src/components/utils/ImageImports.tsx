// This file centralizes all image imports and provides fallbacks
//import React from 'react';
import ImagePlaceholder from './ImagePlaceholder';

// IMPORTANT: Using relative paths from the assets directory
// Replace these with your actual images when available
import logo from '../../assets/logo.svg';

// For all other images, we'll use placeholder components until you add them
// Product images - you should update these paths once you have the actual images
const abstractArtImg = 'placeholder-abstract-art';
const ecoJewelleryImg = 'placeholder-eco-jewellery';
const scarfImg = 'placeholder-scarf';
const leatherBagImg = 'placeholder-leather-bag';

// Shop images
const wristLoversImg = 'placeholder-wrist-lovers';
const amberBloomImg = 'placeholder-amber-bloom';
const clayRootImg = 'placeholder-clay-root';
const wovenWildsImg = 'placeholder-woven-wilds';

// Hero and section images
const jewelleryImg = 'placeholder-jewellery';
const flowerImg = 'placeholder-flowers';
const honeyImg = 'placeholder-honey';
const ceramicsImg = 'placeholder-ceramics';
const interiorImg = 'placeholder-interior';

// Function to use placeholders for images that don't exist yet
const getImage = (src: string, alt: string, width = 300, height = 200) => {
  // Check if this is a real image path or a placeholder identifier
  const isPlaceholder = src.startsWith('placeholder-');
  
  if (!isPlaceholder && src) {
    // If it's a real image path, try to use it
    return <img src={src} alt={alt} />;
  } else {
    // Otherwise use a placeholder with a color based on the image name
    const colorMap: {[key: string]: string} = {
      'abstract-art': '#F0AB00',
      'eco-jewellery': '#9EC862',
      'scarf': '#FF7D62',
      'leather-bag': '#A0522D',
      'wrist-lovers': '#6EB5FF',
      'amber-bloom': '#FFCB62',
      'clay-root': '#9D8189',
      'woven-wilds': '#FF9EAA',
      'jewellery': '#C792EA',
      'flowers': '#FF96CB',
      'honey': '#FFD54F',
      'ceramics': '#80DEEA',
      'interior': '#BDBDBD',
    };
    
    // Extract the image type from the placeholder name
    const imageType = src.replace('placeholder-', '');
    const bgColor = colorMap[imageType] || '#e0e0e0';
    
    return <ImagePlaceholder 
      width={width} 
      height={height} 
      text={`${alt} (${imageType})`}
      backgroundColor={bgColor}
      textColor="#ffffff"
    />;
  }
};

export {
  logo,
  abstractArtImg,
  ecoJewelleryImg,
  scarfImg,
  leatherBagImg,
  wristLoversImg,
  amberBloomImg,
  clayRootImg,
  wovenWildsImg,
  jewelleryImg,
  flowerImg,
  honeyImg,
  ceramicsImg,
  interiorImg,
  getImage
};