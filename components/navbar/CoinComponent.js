import { useState, useEffect } from 'react';
import { FaCoins } from 'react-icons/fa';

const CoinComponent = ({ coins }) => {
  // State for managing the border color (red for use, green for add)
  const [borderColor, setBorderColor] = useState('transparent');

  // Effect to reset border color after 2 seconds
  useEffect(() => {
    if (borderColor !== 'transparent') {
      const timer = setTimeout(() => {
        setBorderColor('transparent');
      }, 2000); // Reset border color after 2 seconds
      return () => clearTimeout(timer); // Cleanup the timer on component unmount
    }
  }, [borderColor]);

  return (
    <div
      className="coin-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '5px 10px',
        borderRadius: '10px',
        transition: 'border-color 0.8s ease', // Smooth transition for border color
      }}
    >
      <FaCoins style={{ marginRight: '8px', fontSize: '24px' }} />
      <span>{coins}</span>
    </div>
  );
};

export default CoinComponent;
