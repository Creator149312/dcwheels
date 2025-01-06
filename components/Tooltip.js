'use client'

const Tooltip = ({ text, children }) => {
  return (
    <div className="relative group">
      {/* The actual element (button or icon) */}
      {children}

      {/* Tooltip text */}
      <div className="z-10 absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-max hidden group-hover:block bg-black text-white text-sm py-1 px-2 rounded-md shadow-lg">
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
