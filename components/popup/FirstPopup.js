import React, { useState } from "react";

const FirstPopup = ({ onClose, onNext }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const saveWheel = async () => {
    setError("");
    e.preventDefault();
    setisSaving(true);

    if (!title || !description || !segments) {
      setError("Title, description and Data are required.");
      return;
    }

    let vlt = validateListTitle(title);
    let vld = validateListDescription(description);

    if (vlt.length !== 0) {
      setError(vlt);
      return;
    }
    if (vld.length !== 0) {
      setError(vld);
      return;
    }

    // console.log(apiConfig);

    try {
      const data = [...segmentsData];
      const res = await fetch(`${apiConfig.apiUrl}/wheel`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify({ title, description, data, createdBy }),
      });

      let resObj = await res.json();
      // console.log(resObj);

      if (resObj?.error) {
        //if there is error
        // console.log("error in frontend", res);
        toast.error("Failed to Create Wheel");
        setError("Failed to create a wheel");
      } else {
        // console.log("Redirecting to Dashboard...");
        router.push("/dashboard");
      }
    } catch (error) {
      setError(error);
    } finally {
      setisSaving(false);
    }
  };

  const handleNextClick = async() => {
    await saveWheel();
    onNext({ name, description });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">
          Share Your Wheel
        </h2>
        <form onSubmit={handleNextClick}>
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300">
            Wheel Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded mt-1"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300">
            Wheel Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded mt-1"
            maxLength="150"
          ></textarea>
        </div>
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            By sharing, you agree to our terms and conditions.
          </p>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Next &rarr;
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};

export default FirstPopup;
