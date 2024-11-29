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

export default function SaveWheelBtn({segmentsData}) {
  const [title, setTitle] = useState("My first Wheel");
  const [description, setDescription] = useState("What to write I am really busy");
  const createdBy = useSession().data?.user?.email;
  const { segments, setSegments } = useContext(SegmentsContext);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDataDialog, setShowDataDialog] = useState(true);

  const router = useRouter();

  const WheelDataDialog = () => {
    // console.log(
    //   "Inside Wheel Data, Where Show Data Dialog is ",
    //   showDataDialog
    // );
  };

  const handleSubmit = async (e) => {
    // console.log("title ", title);
    // console.log("Description", description)

    setError("");
    e.preventDefault();
    setIsLoading(true);

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
      setIsLoading(false);
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
    <Dialog>
      <DialogTrigger asChild>
        <Button size={"lg"} variant={"default"} className="p-3 mt-2 w-full">Save Wheel</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Add your wheel description
          </DialogDescription>
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
          </div>

          <DialogFooter>
            <Button type="submit" size={"lg"} variant={"default"}>Save Wheel</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
