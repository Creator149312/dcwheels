import { useEffect, useState } from 'react';
import styles from "@public/styles/Notification.module.css";

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

  return (
    <div className={`${styles.notification} ${state === 'success' ? styles.success : styles.failure}`} style={{ display: visible ? 'block' : 'none' }}>
      <span className={styles.close} onClick={handleClose}>x</span>
      {message}
    </div>
  );
};

export default Notification;
