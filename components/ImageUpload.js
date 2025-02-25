"use client";

import { SegmentsContext } from "@app/SegmentsContext";
import { useContext, useState } from "react";
import { FaImage } from "react-icons/fa";
import imageCompression from "browser-image-compression";

const regex = /src="([^"]+)"/;

const ImageUpload = ({ selectedIndex, segData }) => {
  const { updateSegment } = useContext(SegmentsContext);
  const imgValue = segData[selectedIndex]?.text;

  const [imageUrl, setImageUrl] = useState(
    imgValue.includes("<img") ? regex.exec(imgValue)[1] : null
  );

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 200,
        useWebWorker: true,
      };
      try {
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Image = e.target.result;

          setImageUrl(base64Image);
          updateSegment(
            selectedIndex,
            "text",
            `<img src="${base64Image}" width="25" height="37" />`
          );
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.log(error);
      }
    } else {
      alert("Please select a valid image file.");
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
      />
      <label
        htmlFor={`image-upload-${selectedIndex}`}
        className="h-5 min-w-7 px-1 rounded-md cursor-pointer"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Selected"
            width={25}
            height={25}
            style={{ objectFit: "cover" }} // Ensures the image doesn't stretch or distort
          />
        ) : (
          <FaImage size={25} />
        )}
      </label>
  </>
  );
};

export default ImageUpload;
