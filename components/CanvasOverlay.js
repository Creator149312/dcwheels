import { useState } from 'react';

const CanvasOverlay = ({message}) => {
    const [showOverlay, setShowOverlay] = useState(true);

    const handleCanvasClick = () => {
        setShowOverlay(false);
    };

    return (
        <div className="relative w-96 h-96">
            {showOverlay && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full text-white text-center text-lg">
                   {message}
                </div>
            )}
            <canvas className="w-full h-full border" onClick={handleCanvasClick}></canvas>
        </div>
    );
};

export default CanvasOverlay;
