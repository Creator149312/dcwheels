'use client'
import React, { useState } from 'react';

const ListCreator = () => {
  const [selectedType, setSelectedType] = useState('');
  const [listData, setListData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userChoice, setUserChoice] = useState('');

  // Function to handle select change
  const handleSelectChange = (event) => {
    const selectedValue = event.target.value;
    setSelectedType(selectedValue);
    setIsModalOpen(true); // Open the modal when a selection is made
  };

  // Function to handle user's choice in the modal
  const handleUserChoice = () => {
    setSelectedType(userChoice);
    loadDataForType(userChoice);
    setIsModalOpen(false); // Close the modal
  };

  // Function to load data based on the selected type
  const loadDataForType = (type) => {
    switch (type) {
      case 'Fruits':
        setListData(['Apple', 'Banana', 'Orange']);
        break;
      case 'Vehicles':
        setListData(['Car', 'Bike', 'Bus']);
        break;
      case 'Countries':
        setListData(['USA', 'Canada', 'Australia']);
        break;
      default:
        setListData([]);
        break;
    }
  };

  // Function to handle the closing of the modal without making a selection
  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (<></>
    // <div className="container mx-auto p-4">
    //   <h1 className="text-2xl font-semibold mb-4">List Creator</h1>

    //   <div className="mb-4">
    //     <label htmlFor="list-type" className="block text-gray-700">
    //       Select a list type:
    //     </label>
    //     <select
    //       id="list-type"
    //       className="w-full p-2 border border-gray-300 rounded-md"
    //       onChange={handleSelectChange}
    //       value={selectedType}
    //     >
    //       <option value="">-- Select a List Type --</option>
    //       <option value="Fruits">Fruits</option>
    //       <option value="Vehicles">Vehicles</option>
    //       <option value="Countries">Countries</option>
    //     </select>
    //   </div>

    //   {/* Modal to choose the list type */}
    //   {isModalOpen && (
    //     <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
    //       <div className="bg-white p-6 rounded-md shadow-lg max-w-sm w-full">
    //         <h2 className="text-xl font-semibold mb-4">Choose List Type</h2>
    //         <select
    //           value={userChoice}
    //           onChange={(e) => setUserChoice(e.target.value)}
    //           className="w-full p-2 mb-4 border border-gray-300 rounded-md"
    //         >
    //           <option value="">-- Select a Type --</option>
    //           <option value="Fruits">Fruits</option>
    //           <option value="Vehicles">Vehicles</option>
    //           <option value="Countries">Countries</option>
    //         </select>
    //         <div className="flex justify-between">
    //           <button
    //             onClick={handleUserChoice}
    //             className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
    //           >
    //             Confirm
    //           </button>
    //           <button
    //             onClick={closeModal}
    //             className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
    //           >
    //             Cancel
    //           </button>
    //         </div>
    //       </div>
    //     </div>
    //   )}

    //   {/* Display List Data */}
    //   {selectedType && (
    //     <div>
    //       <h2 className="text-xl font-semibold mt-4">Selected {selectedType} List</h2>
    //       <ul className="mt-2">
    //         {listData.map((item, index) => (
    //           <li key={index} className="list-disc pl-6">{item}</li>
    //         ))}
    //       </ul>
    //     </div>
    //   )}
    // </div>
  );
};

export default ListCreator;
