"use client";

import { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import apiConfig from "@utils/ApiUrlConfig";
import { validateListDescription, validateListTitle } from "@utils/Validator";
import toast from "react-hot-toast";
import { SegmentsContext } from "@app/SegmentsContext";

export default function SaveWheelBtn() {
    const [title, setTitle] = useState("My first Wheel");
    const [description, setDescription] = useState("What to write I am not busy");
    const createdBy = useSession().data?.user?.email;
    const { segments, setSegments } = useContext(SegmentsContext);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const router = useRouter()

    const handleSubmit = async (e) => {
        setError("");
        e.preventDefault();
        setIsLoading(true);

        if (!title || !description || !segments) {
            setError("Title, description and Data are required.");
            return;
        }

        let vlt = validateListTitle(title)
        let vld = validateListDescription(description);

        if (vlt.length !== 0) { setError(vlt); return; }
        if (vld.length !== 0) { setError(vld); return; }

        try {
            const data = [...segments];
            const res = await fetch(`https://ominous-engine-q766v6jx45r34qx9-3000.app.github.dev/api/wheel`, {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                },
                body: JSON.stringify({ title, description, data, createdBy }),
            });

            let resObj = await res.json()
            console.log(resObj);

            if (resObj?.error) { //if there is error
                console.log("error in frontend", res);
                toast.error("Failed to Create List");
                setError("Failed to create a List");
            } else {
                console.log("Redirecting to Dashboard...")
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
        return text.replace(regex, '');
    }

    //to check if all words are valid
    const verifyWords = (e) => {
        setError("");
        e.preventDefault();
        setWordsToCheck(words);
    };

    return (
        <form onSubmit={handleSubmit} className="card">
            <button type="submit" className="custom-button">
Save Wheel            </button>
        </form>
    );
}
