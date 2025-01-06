const SharableLinkPopup = ({ link, onClose }) => {
  const linkPrefix = "https://www.spinpapa.com/uwheels/";
  link = linkPrefix + link;
  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    alert("Link copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">
          Shareable Link
        </h2>
        <div className="mb-4">
          <p className="text-gray-700 dark:text-gray-300 break-words">{link}</p>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Copy Link
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharableLinkPopup;
