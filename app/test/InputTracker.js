import React, { useState } from 'react';

const InputTracker = () => {
  const [inputValues, setInputValues] = useState(['']);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleChange = (e) => {
    const newInputValues = [...inputValues];
    newInputValues[currentIndex] = e.target.value;
    setInputValues(newInputValues);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < inputValues.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Only add a new entry if the current value is not empty
      if (inputValues[currentIndex] !== '') {
        const newInputValues = [...inputValues, ''];
        setInputValues(newInputValues);
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  return (
    <div>
      <input
        type="text"
        value={inputValues[currentIndex]}
        onChange={handleChange}
      />
      <button onClick={handlePrev} disabled={currentIndex === 0}>
        Prev
      </button>
      <button onClick={handleNext}>
        Next
      </button>
    </div>
  );
};

export default InputTracker;
