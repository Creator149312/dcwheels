import React, { useState, useContext } from "react";
import { useSession } from "next-auth/react";
import FirstPopup from "./popup/FirstPopup";
import SecondPopup from "./popup/SecondPopup";
import SharableLinkPopup from "./SharableLinkPopup";
import { Button } from "./ui/button";
import { FaShareAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import { SegmentsContext } from "@app/SegmentsContext";
import apiConfig from "@utils/ApiUrlConfig";
import {
  sanitizeInputForDB,
  validateListTitle,
  validateListDescription,
} from "@utils/Validator";

const ShareButton = () => {
  const [isFirstPopupOpen, setIsFirstPopupOpen] = useState(false);
  const [isSecondPopupOpen, setIsSecondPopupOpen] = useState(false);
  // Holds the new wheel ID after a successful POST; drives SharableLinkPopup
  const [sharedWheelId, setSharedWheelId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [wheelDetails, setWheelDetails] = useState({
    name: "",
    description: "",
  });

  const { segData, wheelData } = useContext(SegmentsContext);
  const { data: session } = useSession();

  const handleOpenFirstPopup = () => setIsFirstPopupOpen(true);
  const handleCloseFirstPopup = () => setIsFirstPopupOpen(false);

  const handleNext = (details) => {
    setWheelDetails(details);
    setIsFirstPopupOpen(false);
    setIsSecondPopupOpen(true);
  };

  // Called by SecondPopup with the chosen privacy value ("public" | "private").
  // POSTs the wheel to the API and, on success, shows the shareable link popup.
  const handleCreateLink = async (privacy) => {
    setIsSecondPopupOpen(false);

    const { name, description } = wheelDetails;

    const titleError = validateListTitle(name);
    const descError = validateListDescription(description);
    if (titleError.length) return toast.error(titleError);
    if (descError.length) return toast.error(descError);

    if (!segData?.length)
      return toast.error("Add some segments before sharing.");

    if (!session?.user?.email)
      return toast.error("You must be logged in to share a wheel.");

    setIsCreating(true);
    const toastId = toast.loading("Creating shareable link…");

    try {
      const res = await fetch(`${apiConfig.apiUrl}/wheel`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          title: sanitizeInputForDB(name),
          description: sanitizeInputForDB(description),
          data: [...segData],
          wheelData,
          createdBy: session.user.email,
          privacy,
        }),
      });

      const resObj = await res.json();

      if (resObj?.error || !res.ok) {
        toast.error("Failed to create shareable link.", { id: toastId });
      } else {
        toast.success("Shareable link ready!", { id: toastId });
        // API returns { creationID: <ObjectId> }
        setSharedWheelId(resObj.creationID);
      }
    } catch {
      toast.error("Something went wrong. Please try again.", { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenFirstPopup}
        disabled={isCreating}
        className="px-4 py-2 rounded"
      >
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

      {/* Show shareable link after successful wheel creation */}
      {sharedWheelId && (
        <SharableLinkPopup
          link={sharedWheelId}
          onClose={() => setSharedWheelId(null)}
        />
      )}
    </>
  );
};

export default ShareButton;
