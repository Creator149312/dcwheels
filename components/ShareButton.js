import React, { useState } from "react";
import FirstPopup from "./popup/FirstPopup";
import SecondPopup from "./popup/SecondPopup";
import { Button } from "./ui/button";
import { FaShareAlt } from "react-icons/fa";

const ShareButton = () => {
  const [isFirstPopupOpen, setIsFirstPopupOpen] = useState(false);
  const [isSecondPopupOpen, setIsSecondPopupOpen] = useState(false);
  const [wheelDetails, setWheelDetails] = useState({
    name: "",
    description: "",
  });

  const handleOpenFirstPopup = () => setIsFirstPopupOpen(true);
  const handleCloseFirstPopup = () => setIsFirstPopupOpen(false);

  const handleNext = (details) => {
    setWheelDetails(details);
    setIsFirstPopupOpen(false);
    setIsSecondPopupOpen(true);
  };

  const handleCreateLink = () => {
    // Logic to create link based on wheelDetails and privacy settings
    setIsSecondPopupOpen(false);
  };

  return (
    <>
      <Button onClick={handleOpenFirstPopup} className="px-4 py-2 rounded">
        Share <FaShareAlt className="ml-2" size={15} />
      </Button>

      {isFirstPopupOpen && (
        <FirstPopup onClose={handleCloseFirstPopup} onNext={handleNext} />
      )}

      {isSecondPopupOpen && (
        <SecondPopup
          onClose={() => setIsSecondPopupOpen(false)}
          onCreateLink={handleCreateLink}
        />
      )}
    </>
  );
};

export default ShareButton;
