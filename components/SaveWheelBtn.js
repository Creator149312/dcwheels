"use client";

import { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import apiConfig from "@utils/ApiUrlConfig";
import {
  sanitizeInputForDB,
  validateListDescription,
  validateListTitle,
} from "@utils/Validator";
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

export default function SaveWheelBtn({ segmentsData }) {
  const [title, setTitle] = useState("New Wheel");
  const [description, setDescription] = useState("This is my new wheel");
  const createdBy = useSession().data?.user?.email;
  const { segData, wheelData } = useContext(SegmentsContext);

  const [isSaving, setisSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDataDialog, setShowDataDialog] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const router = useRouter();

  const fetchUsers = async () => {
    if (createdBy !== undefined) {
      try {
        const response = await fetch(
          `${apiConfig.apiUrl}/wheel/user/${createdBy}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch lists");
        }

        const data = await response.json();
        setUsers(data.lists);
      } catch (error) {
        setError(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    setError("");
    e.preventDefault();
    setisSaving(true);

    if (!title || !description || !segData) {
      setError("Title, description and Data are required.");
      setisSaving(false);
      return;
    }

    let vlt = validateListTitle(title);
    let vld = validateListDescription(description);

    if (vlt.length !== 0) {
      setError(vlt);
      setisSaving(false);
      return;
    }
    if (vld.length !== 0) {
      setError(vld);
      setisSaving(false);
      return;
    }

    try {
      const titleToStore = sanitizeInputForDB(title);
      const descriptionToStore = sanitizeInputForDB(description);

      if (selectedUser) {
        const data = [...segData];
        const res = await fetch(
          `${apiConfig.apiUrl}/wheel/${selectedUser._id}`,
          {
            method: "PUT",
            headers: {
              "Content-type": "application/json",
            },
            body: JSON.stringify({
              title: titleToStore,
              description: descriptionToStore,
              data,
              wheelData,
            }),
          }
        );

        let resObj = await res.json();

        if (resObj?.error) {
          setError("Failed to Update a wheel");
          toast.error("Failed to Update Wheel");
        } else {
          router.push("/dashboard");
        }
      } else {
        const data = [...segData];
        const res = await fetch(`${apiConfig.apiUrl}/wheel`, {
          method: "POST",
          headers: {
            "Content-type": "application/json",
          },
          body: JSON.stringify({
            title: titleToStore,
            description: descriptionToStore,
            data,
            createdBy,
            wheelData,
          }),
        });

        let resObj = await res.json();
        // console.log("Res Obj = ", resObj);

        if (resObj?.error) {
          setError("Failed to create a wheel");
          toast.error("Failed to Create Wheel");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (error) {
      setError(error);
    } finally {
      setisSaving(false);
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

  const handleUserChange = (e) => {
    const user = users.find((user) => user._id === e.target.value);
    setSelectedUser(user);
    setTitle(user.title);
    setDescription(user.description);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex flex-col items-center justify-center py-2">
          <Tooltip text="Save Wheel on Cloud">
            <Button
              size={"lg"}
              variant={"default"}
              disabled={isSaving}
              onClick={fetchUsers}
              className="mx-1 p-2 text-sm rounded-md focus:outline-none"
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  Save
                  <FaCloudUploadAlt size={20} className="ml-1" />
                </>
              )}
            </Button>
          </Tooltip>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Wheel Data</DialogTitle>
          <DialogDescription>Add wheel title and description</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Update Existing Wheel
              </Label>
              <select
                value={selectedUser?._id || ""}
                onChange={handleUserChange}
                className="col-span-3"
              >
                <option value="" disabled>
                  Select a Wheel to update
                </option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name Your Wheel
              </Label>
              <Input
                id="name"
                value={title}
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
                value={description}
                placeholder="Enter Wheel Description in about 75 to 100 words"
                className="col-span-3"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex flex-col align-middle">
              <Button type="submit" size={"lg"} variant={"default"}>
                {isSaving ? "Saving..." : "Save Wheel"}
              </Button>
              <p className="text-rose-600 my-2">{error ? error : ""}</p>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
