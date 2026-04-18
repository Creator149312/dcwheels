"use client";

import { SegmentsContext } from "@app/SegmentsContext";
import { useContext, useState } from "react";
import { FaImage } from "react-icons/fa";
import imageCompression from "browser-image-compression";
import toast from "react-hot-toast";

const ImageUpload = ({ selectedIndex, segData }) => {
  const { updateSegment } = useContext(SegmentsContext);
  const imgValue = segData[selectedIndex]?.image || segData[selectedIndex]?.text || "";

  const [imageUrl, setImageUrl] = useState(
    imgValue.startsWith("http") || imgValue.startsWith("data:image") ? imgValue : null
  );
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("Please select a valid image file.");
      return;
    }

    try {
      setUploading(true);

      // Compress before upload
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append("file", compressed, compressed.name || "segment-image.webp");

      const res = await fetch("/api/upload-segment-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Upload failed");
      }

      const { url } = await res.json();
      setImageUrl(url);
      updateSegment(selectedIndex, "image", url);
    } catch (error) {
      toast.error(error.message || "Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
        id={`image-upload-${selectedIndex}`}
        disabled={uploading}
      />
      <label
        htmlFor={`image-upload-${selectedIndex}`}
        className={`h-5 min-w-7 px-1 rounded-md cursor-pointer ${uploading ? "opacity-50 cursor-wait" : ""}`}
      >
        {uploading ? (
          <span className="text-xs">...</span>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="Selected"
            width={25}
            height={25}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <FaImage size={25} />
        )}
      </label>
    </>
  );
};

export default ImageUpload;

