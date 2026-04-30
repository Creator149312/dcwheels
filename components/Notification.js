import { useEffect, useState } from 'react';

// Previously used Notification.module.css for ~250 bytes of styles. CSS
// modules ship in the route's render-blocking stylesheet bundle, so killing
// even small modules has a (tiny) cumulative LCP benefit. Migrated to
// Tailwind utilities — same look, zero extra CSS file, no bundle entry.
const Notification = ({ message, state}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      //onClose(); 
    }, 5000); // Disappear after 5 seconds

    return () => clearTimeout(timer); // Clear timer on component unmount
  }, []);

  const handleClose = () => {
    setVisible(false);
    // onClose(); // Call onClose when notification is manually closed
  };

  // `relative` so the close `x` (positioned absolute) anchors to this box.
  const baseClasses =
    "relative m-2.5 px-5 py-2.5 text-white rounded";
  const stateClasses =
    state === "success" ? "bg-green-600" : "bg-red-600";

  return (
    <div
      className={`${baseClasses} ${stateClasses}`}
      style={{ display: visible ? "block" : "none" }}
    >
      <span
        className="absolute top-1 right-1.5 cursor-pointer"
        onClick={handleClose}
      >
        x
      </span>
      {message}
    </div>
  );
};

export default Notification;
