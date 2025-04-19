// src/components/ImageGalleryDisplay.tsx
import React from 'react';

interface ImageGalleryDisplayProps {
    galleryImages: string[];
}

const ImageGalleryDisplay: React.FC<ImageGalleryDisplayProps> = ({ galleryImages }) => {
    if (galleryImages.length === 0) return null;

    return (
        <div className="image-gallery">
            <h2>Recently Uploaded Images (via Supabase)</h2>
            <div className="gallery-grid">
                {galleryImages.map((url, index) => (
                    <img key={index} src={url} alt={`Uploaded ${index}`} className="gallery-image" />
                ))}
            </div>
        </div>
    );
};

export default ImageGalleryDisplay;