import toast from "react-hot-toast";

const SharableLinkPopup = ({ link, onClose }) => {
  // Use the current origin so this works in dev and production without hardcoding
  const fullLink = `${window.location.origin}/uwheels/${link}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullLink);
    // Use toast instead of alert() so the UI stays non-blocking
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10">
      <div className="bg-card border border-border rounded-lg p-6 shadow-md w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Shareable Link
        </h2>
        <div className="mb-4">
          <p className="text-foreground break-words">{fullLink}</p>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Copy Link
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted text-foreground rounded hover:bg-accent"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharableLinkPopup;
