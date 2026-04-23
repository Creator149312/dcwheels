"use client";

import { SegmentsContext } from "@app/SegmentsContext";
import { useContext, useState } from "react";
import { FaImage } from "react-icons/fa";
import { compressImage } from "@utils/imageCompression";
import toast from "react-hot-toast";

// Convert a File/Blob to a data: URL string.
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

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

      // Compress client-side only. Store as data: URL in segment state and
      // defer the Blob upload to save-time (SaveWheelBtn / useSaveWheel).
      // This avoids burning storage on wheels that are never saved.
      const compressed = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      });

      const dataUrl = await fileToDataUrl(compressed);
      // Detect orientation so the wheel can render the image correctly
      const imageLandscape = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth > img.naturalHeight);
        img.onerror = () => resolve(false);
        img.src = dataUrl;
      });
      setImageUrl(dataUrl);
      updateSegment(selectedIndex, "image", dataUrl);
      updateSegment(selectedIndex, "imageLandscape", imageLandscape);
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

