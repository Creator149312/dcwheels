import { useState } from "react";
import { validateListDescription, validateListTitle } from "@utils/Validator";

const UnifiedListCreationModal = ({ isOpen, closeModal, addNewList }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const errors = {};

    const nameErr = validateListTitle(formData.name);
    const descErr = validateListDescription(formData.description);

    if (nameErr.length > 0) errors.name = nameErr;
    if (descErr.length > 0) errors.description = descErr;

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // ✅ Backend expects ONLY name + description
    const listData = {
      name: formData.name,
      description: formData.description,
    };

    addNewList(listData);
    closeModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
          Create New List
        </h2>

        <form onSubmit={handleSubmit}>
          {/* List Name */}
          <div className="mb-4">
            <label className="block text-gray-600 dark:text-gray-200">
              List Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 mt-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white"
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-gray-600 dark:text-gray-200">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-2 mt-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white"
              rows="3"
            />
            {errors.description && (
              <p className="text-red-500 text-sm">{errors.description}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 bg-gray-300 rounded-md dark:bg-gray-600 text-gray-800 dark:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Create List
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnifiedListCreationModal;
