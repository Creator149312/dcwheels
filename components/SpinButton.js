export default function SpinButton() {
    return (
      <div className="relative w-full h-full">
        <div
          className="spin absolute top-[43%] left-[43%] w-[75px] h-[75px] rounded-full border-2 border-white bg-black text-white font-bold text-[22px] cursor-pointer shadow-[0_5px_20px_#000]">
          CLICK TO SPIN
        </div>
        
        <style jsx>{`
          @keyframes pulse {
            0% {
              transform: scale3d(1, 1, 1);
            }
            50% {
              transform: scale3d(1.09, 1.09, 1.09);
            }
            100% {
              transform: scale3d(1, 1, 1);
            }
          }
  
          .spin {
            animation: pulse 2s infinite;
          }
        `}</style>
      </div>
    );
  }
  