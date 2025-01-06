import React, { useState } from 'react';

const SecondPopup = ({ onClose, onCreateLink }) => {
  const [privacy, setPrivacy] = useState('private');

  const handlePrivacyChange = (event) => {
    setPrivacy(event.target.value);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">Privacy Settings</h2>
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300">Privacy</label>
          <div className="mt-1">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="private"
                checked={privacy === 'private'}
                onChange={handlePrivacyChange}
                className="form-radio"
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300">Private (people with link can view wheel)</span>
            </label>
          </div>
          <div className="mt-1">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="public"
                checked={privacy === 'public'}
                onChange={handlePrivacyChange}
                className="form-radio"
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300">Public (people with link can view, copy wheel)</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end space-x-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded">Cancel</button>
          <button onClick={onCreateLink} className="px-4 py-2 bg-blue-500 text-white rounded">Create Link</button>
        </div>
      </div>
    </div>
  );
};

export default SecondPopup;
