import React, { useState } from 'react';

function HideSegmentCheckbox() {
  const [isChecked, setIsChecked] = useState(false); 

  const handleCheckboxChange = (event) => {
    setIsChecked(event.target.checked); 
  };

  return (
    <div>
      <input 
        type="checkbox" 
        checked={isChecked} 
        onChange={handleCheckboxChange} 
      />
    </div>
  );
}

export default HideSegmentCheckbox;