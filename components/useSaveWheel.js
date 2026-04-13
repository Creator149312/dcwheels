"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import apiConfig from "@utils/ApiUrlConfig";
import {
  sanitizeInputForDB,
  validateListDescription,
  validateListTitle,
} from "@utils/Validator";
import { handleAction } from "@utils/HelperFunctions";

function getQueryParams() {
  if (typeof window === "undefined") return { type: null, id: null };
  const params = new URLSearchParams(window.location.search);
  return {
    type: params.get("type"),
    id: params.get("id"),
  };
}

export function useSaveWheel({ createdBy, segData, wheelData, coins, setCoins }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedWheels, setSavedWheels] = useState([]);

  const fetchSavedWheels = async () => {
    if (createdBy !== undefined) {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${apiConfig.apiUrl}/wheel/user/${createdBy}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch wheels");
        }

        const data = await response.json();
        setSavedWheels(data.lists || []);
      } catch (err) {
        setError(err.message || "Failed to load stored wheels");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const saveWheel = async ({ title, description, selectedWheel, e }) => {
    setError("");
    e.preventDefault();
    setIsSaving(true);

    if (!title || !description || !segData) {
      setError("Title, description and Data are required.");
      setIsSaving(false);
      return false;
    }

    let vlt = validateListTitle(title);
    let vld = validateListDescription(description);

    const { id, type } = getQueryParams();

    let relatedTo;
    if (id && type && ["anime", "movie", "game"].includes(type)) {
      relatedTo = { type, id };
    }

    if (vlt.length !== 0) {
      setError(vlt);
      setIsSaving(false);
      return false;
    }

    if (vld.length !== 0) {
      setError(vld);
      setIsSaving(false);
      return false;
    }

    try {
      const titleToStore = sanitizeInputForDB(title);
      const descriptionToStore = sanitizeInputForDB(description);
      const data = [...segData];

      if (selectedWheel) {
        const body = {
          title: titleToStore,
          description: descriptionToStore,
          data,
          wheelData,
        };

        if (relatedTo) body.relatedTo = relatedTo;

        const res = await fetch(`${apiConfig.apiUrl}/wheel/${selectedWheel._id}`, {
          method: "PUT",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify(body),
        });

        const resObj = await res.json();

        if (resObj?.error) {
          setError("Failed to update the wheel");
          toast.error("Failed to Update Wheel");
          return false;
        } else {
          handleAction({
            actionType: "use",
            amount: parseInt(10),
            coins,
            setCoins,
            event: e,
          });
          router.push("/dashboard");
          return true;
        }
      } else {
        const body = {
          title: titleToStore,
          description: descriptionToStore,
          data,
          createdBy,
          wheelData,
        };

        if (relatedTo) body.relatedTo = relatedTo;

        const res = await fetch(`${apiConfig.apiUrl}/wheel`, {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify(body),
        });

        const resObj = await res.json();

        if (resObj?.error) {
          setError("Failed to create a wheel");
          toast.error("Failed to Create Wheel");
          return false;
        } else {
          router.push("/dashboard");
          return true;
        }
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    savedWheels,
    fetchSavedWheels,
    saveWheel,
    isSaving,
    isLoading,
    error,
    setError,
  };
}