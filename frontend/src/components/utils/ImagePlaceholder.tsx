import React from 'react';

interface ImagePlaceholderProps {
  width?: number;
  height?: number;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * A component that generates placeholder images with customizable dimensions and text
 * Use this component when you don't have the actual images but need to see the layout
 */
const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  width = 300,
  height = 200,
  text = 'Image Placeholder',
  backgroundColor = '#e0e0e0',
  textColor = '#666666'
}) => {
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor,
    color: textColor,
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '4px',
    overflow: 'hidden',
    textAlign: 'center',
    padding: '10px',
    boxSizing: 'border-box'
  };

  return (
    <div style={style}>
      {text}
    </div>
  );
};

export default ImagePlaceholder;