"use client";

import { useState } from "react";
import { FaImage } from "react-icons/fa";

const ImageUpload = ({ divId, setDivs }) => {
  const [imageUrl, setImageUrl] = useState(null);

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);

      // Update the div with the new image URL based on the unique id
      setDivs((prevDivs) =>
        prevDivs.map(
          (div) => (div.id === divId ? { ...div, image: url } : div) // Update the div with matching id
        )
      );
    }else {
      alert('Please select a valid image file.');
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
        id={`image-upload-${divId}`}
      />
     <label
        htmlFor={`image-upload-${divId}`}
        className="h-5 px-1 rounded-md cursor-pointer"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Selected"
            width={20}
            height={20}
            style={{ objectFit: 'cover' }} // Ensures the image doesn't stretch or distort
          />
        ) : (
          <FaImage size={20} />
        )}
      </label>

      {/* following code is used to display the uplaoded image */}
      {/* {imageUrl && <img src={imageUrl} alt="Div Image" className="mt-2 w-32 h-32 object-cover" />} */}
    </>
  );
};

export default ImageUpload;
