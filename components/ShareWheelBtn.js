"use client";

import { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import apiConfig from "@utils/ApiUrlConfig";
import { validateListDescription, validateListTitle } from "@utils/Validator";
import toast from "react-hot-toast";
import { SegmentsContext } from "@app/SegmentsContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "./ui/textarea";
import { FaCloudUploadAlt } from "react-icons/fa";
import Tooltip from "./Tooltip";
import SecondPopup from "./popup/SecondPopup";
import SharableLinkPopup from "./SharableLinkPopup";
import { FaShareAlt } from "react-icons/fa";

export default function ShareWheelBtn({ segmentsData }) {
  const router = useRouter();
  const [title, setTitle] = useState("My first Wheel");
  const [description, setDescription] = useState(
    "What to write I am really busy"
  );
  const createdBy = useSession().data?.user?.email;
  const { segments, setSegments } = useContext(SegmentsContext);
  const [privacy, setPrivacy] = useState("private");

  const [isSharing, setisSharing] = useState(false);
  const [error, setError] = useState(null);
  const [showDataDialog, setShowDataDialog] = useState(true);

  const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState(true);
  const [isSharableLinkPopup, setIsSharableLinkPopup] = useState(false);

  const handleOpenDetailsPopup = () => setIsDetailsPopupOpen(true);
  const handleCloseDetailsPopup = () => setIsDetailsPopupOpen(false);
  const [sharableLink, setSharableLink] = useState("");

  const handlePrivacyChange = (event) => {
    setPrivacy(event.target.value);
  };

  const handleNext = (createdWheelLink) => {
    setSharableLink(createdWheelLink);
    setIsSharableLinkPopup(true);
    setIsDetailsPopupOpen(false);
  };

  const handleSubmit = async (e) => {
    setError("");
    e.preventDefault();
    setisSharing(true);

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
      console.log("Response Object = ", resObj);

      if (resObj?.error) {
        // toast.error("Failed to Create Wheel");
        setError("Failed to create a wheel");
      } else {
        // console.log("Redirecting to Dashboard...");
        // router.push("/dashboard");
        handleNext(resObj.creationID);
      }
    } catch (error) {
      setError(error);
    } finally {
      setisSharing(false);
    }
  };

  function removeSpecialCharacters(text) {
    // Define the regular expression to match special characters
    const regex = /[^a-zA-Z0-9\s-]/g;
    // Remove special characters except '-', and spaces
    return text.replace(regex, "");
  }

  //to check if all words are valid
  const verifyWords = (e) => {
    setError("");
    e.preventDefault();
    setWordsToCheck(words);
  };

  return (
    <div className="mx-auto">
      {createdBy ? (
        <Dialog>
          <DialogTrigger asChild>
            <div className="flex flex-col items-center justify-center py-2">
              <Tooltip text="Share Wheel with Friends">
                <Button
                  size={"lg"}
                  variant={"default"}
                  disabled={isSharing}
                  className="mx-1 p-2 text-sm rounded-md focus:outline-none"
                  onClick={() => setIsDetailsPopupOpen(true)}
                >
                  {isSharing ? (
                    "Sharing..."
                  ) : (
                    <>
                      Share
                      <FaShareAlt size={20} className="ml-1" />
                    </>
                  )}
                </Button>
              </Tooltip>
            </div>
          </DialogTrigger>
          {isDetailsPopupOpen && (
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Share Wheel</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name Your Wheel
                    </Label>
                    <Input
                      id="name"
                      onChange={(e) => setTitle(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Enter Wheel Description in about 75 to 100 words"
                      className="col-span-3"
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300">
                      Privacy
                    </label>
                    <div className="mt-1">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="private"
                          checked={privacy === "private"}
                          onChange={handlePrivacyChange}
                          className="form-radio"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">
                          Private (people with link can view wheel)
                        </span>
                      </label>
                    </div>
                    <div className="mt-1">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="public"
                          checked={privacy === "public"}
                          onChange={handlePrivacyChange}
                          className="form-radio"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">
                          Public (people with link can view, copy wheel)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" size={"lg"}>
                    {isSharing ? "Creating Link..." : "Get Link"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          )}
        </Dialog>
      ) : (
        <p className="my-2 flex justify-center items-center">
          <a href="/login" className="underline mx-2">
            Login
          </a>
          to share wheels
        </p>
      )}
      {isSharableLinkPopup && (
        <SharableLinkPopup
          onClose={() => {
            setIsSharableLinkPopup(false);
          }}
          link={sharableLink}
        />
      )}
    </div>
  );
}
