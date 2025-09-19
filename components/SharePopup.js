"use client";
import { useState, useEffect } from "react";
import {
  FaShareAlt,
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaWhatsapp,
  FaTelegram,
  FaEnvelope,
  FaTimes,
  FaLink,
} from "react-icons/fa";

export default function SharePopup({
  platforms = ["facebook", "twitter", "linkedin", "whatsapp", "telegram", "email"],
}) {
  const [showPopup, setShowPopup] = useState(false);
  const [url, setUrl] = useState("");

  // Auto‑detect current page URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      setUrl(window.location.href);
    }
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    alert("Link copied!");
  };

  const togglePopup = () => setShowPopup((prev) => !prev);

  const platformLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/share?url=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(url)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}`,
    email: `mailto:?subject=Check this out&body=${encodeURIComponent(url)}`,
  };

  const platformIcons = {
    facebook: <FaFacebook className="text-blue-600 text-2xl" />,
    twitter: <FaTwitter className="text-blue-400 text-2xl" />,
    linkedin: <FaLinkedin className="text-blue-700 text-2xl" />,
    whatsapp: <FaWhatsapp className="text-green-500 text-2xl" />,
    telegram: <FaTelegram className="text-sky-500 text-2xl" />,
    email: <FaEnvelope className="text-gray-500 text-2xl" />,
  };

  return (
    <div className="relative">
      {/* YouTube/Facebook style share button */}
      <button
        onClick={togglePopup}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium dark:bg-[#272727] dark:hover:bg-[#3a3a3a] dark:border-gray-700 dark:text-gray-100 transition"
      >
        <FaShareAlt className="text-gray-600 dark:text-gray-300" />
        Share
      </button>

      {showPopup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={togglePopup}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg w-80 relative dark:bg-gray-800 dark:text-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={togglePopup}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
            >
              <FaTimes />
            </button>

            {/* URL + Copy */}
            <div className="flex items-center border rounded overflow-hidden mb-4 dark:border-gray-600">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 p-2 text-sm bg-transparent outline-none dark:text-gray-100"
              />
              <button
                onClick={copyToClipboard}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                <FaLink />
              </button>
            </div>

            {/* Social icons */}
            <div className="flex justify-around">
              {platforms.map((p) => (
                <a
                  key={p}
                  href={platformLinks[p]}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {platformIcons[p]}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
