import supabase from '../supabaseClient';
import { useEffect, useState } from 'react';

const ImageGallery = () => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      const { data } = await supabase.storage.from('images').list('uploads');

      if (data) {
        const urls = data.map(
          (item) =>
            `https://euudlgzarnvbsvzlizcu.supabase.co/storage/v1/object/public/images/uploads/${item.name}`
        );
        setImageUrls(urls);
      }
    };

    fetchImages();
  }, []);

  return (
    <div>
      {imageUrls.map((url) => (
        <img key={url} src={url} alt="From bucket" style={{ width: 150 }} />
      ))}
    </div>
  );
};

export default ImageGallery;
