// This path goes up two levels (from utils -> components -> src) then into assets
import logo from '../../assets/logo.svg'; 
import jewelleryImg from '../../assets/jewellery.jpg';
import flowerImg from '../../assets/flowers.jpg';    
import honeyImg from '../../assets/honey.jpg';       
import ceramicsImg from '../../assets/ceramics.jpg'; 
import marketplaceImg from '../../assets/marketplace.jpg'; 


/**
 * Renders an actual HTML image element using the imported image source.
 *
 * @param src - The imported image variable (which resolves to a path or data URI).
 * @param alt - The alternative text for the image.
 * @param width - Optional desired width for the image element.
 * @param height - Optional desired height for the image element.
 * @returns A React image element (JSX.Element).
 */
const getImage = (src: string, alt: string, width?: number, height?: number): JSX.Element => {
  // Directly render an <img> tag using the imported image source.
  return <img src={src} alt={alt} width={width} height={height} />;
};

// Export the logo, the imported image variables, and the getImage function
export {
  logo,
  jewelleryImg,
  flowerImg,
  honeyImg,
  ceramicsImg,
  marketplaceImg,
  getImage
};