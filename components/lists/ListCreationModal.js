import { useState } from "react";
import { useSession } from "next-auth/react";
import { validateListDescription, validateListTitle } from "@utils/Validator";

const ListCreationModal = ({ isOpen, closeModal, addNewList }) => {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    words: "",
  });
  const [errors, setErrors] = useState({}); // For storing error messages

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const errors = {};

    let vlt = validateListTitle(formData.title);
    let vld = validateListDescription(formData.description);

    if (vlt.length !== 0) errors.title = vlt;
    if (vld.length !== 0) errors.description = vld;

    if (!formData.words.trim()) {
      errors.words = "Words cannot be empty";
    }

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      const words = formData.words.split("\n").map((word) => ({
        word: word.trim(),
        wordData: ``,
      }));

      const listData = {
        title: formData.title,
        description: formData.description,
        words,
        createdBy: session?.user?.email, // Using user ID from session
      };

      addNewList(listData); // Call the parent function to add the new list
      closeModal(); // Close the modal after submission
    }
  };

  return (
    isOpen && (
      <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
            Create New List
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                className="block text-gray-600 dark:text-gray-200"
                htmlFor="title"
              >
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full p-2 mt-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white"
              />
              {errors.title && (
                <p className="text-red-500 text-sm">{errors.title}</p>
              )}
            </div>

            <div className="mb-4">
              <label
                className="block text-gray-600 dark:text-gray-200"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full p-2 mt-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white"
                rows="2"
              />
              {errors.description && (
                <p className="text-red-500 text-sm">{errors.description}</p>
              )}
            </div>

            <div className="mb-4">
              <label
                className="block text-gray-600 dark:text-gray-200"
                htmlFor="words"
              >
                Words (one per line)
              </label>
              <textarea
                id="words"
                name="words"
                value={formData.words}
                onChange={handleChange}
                className="w-full p-2 mt-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white"
                rows="6"
              />
              {errors.words && (
                <p className="text-red-500 text-sm">{errors.words}</p>
              )}
            </div>

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
    )
  );
};

export default ListCreationModal;
