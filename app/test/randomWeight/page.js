'use client'
import React, { useState } from 'react';

const RandomPicker = () => {
  // Initialize the array with elements and default weight 1
  const [elements, setElements] = useState([
    { name: 'Element 1', weight: 1 },
    { name: 'Element 2', weight: 1 },
    { name: 'Element 3', weight: 1 },
    { name: 'Element 4', weight: 1 },
    { name: 'Element 5', weight: 1 },
  ]);

  // Function to handle weight changes
  const handleWeightChange = (index, newWeight) => {
    const newElements = [...elements];
    newElements[index].weight = newWeight;
    setElements(newElements);
  };

  // Function to pick a random element based on weights
  const pickRandomElement = () => {
    const totalWeight = elements.reduce((sum, element) => sum + element.weight, 0);

    // Generate a random number between 0 and totalWeight
    const randomValue = Math.random() * totalWeight;

    let cumulativeWeight = 0;
    for (let i = 0; i < elements.length; i++) {
      cumulativeWeight += elements[i].weight;
      if (randomValue < cumulativeWeight) {
        alert(`Picked: ${elements[i].name} (Weight: ${elements[i].weight})`);
        return;
      }
    }
  };

  return (
    <div>
      <h2>Random Picker</h2>

      {/* Displaying elements and their weights */}
      <div className="elements-list">
        {elements.map((element, index) => (
          <div key={index} className="element-item">
            <span>{element.name}</span>
            <input
              type="number"
              value={element.weight}
              min="1"
              onChange={(e) => handleWeightChange(index, parseInt(e.target.value, 10))}
              className="weight-input"
            />
          </div>
        ))}
      </div>

      {/* Button to trigger random pick */}
      <button onClick={pickRandomElement} className="pick-button">
        Pick Random Element
      </button>
    </div>
  );
};

export default RandomPicker;
