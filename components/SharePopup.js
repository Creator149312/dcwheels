"use client";
import { useState, useEffect } from "react";
import { Share2, Mail, X, Link } from "lucide-react";
import { FacebookIcon, TwitterIcon, LinkedInIcon, WhatsAppIcon, TelegramIcon } from "@components/BrandIcons";
import toast from "react-hot-toast";

export default function SharePopup({
  platforms = ["facebook", "twitter", "linkedin", "whatsapp", "telegram", "email"],
  variant = "simple",
  url: urlProp,
}) {
  const [showPopup, setShowPopup] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (urlProp) {
        // Resolve relative paths like "/post/abc" against the current origin
        setUrl(urlProp.startsWith("http") ? urlProp : `${window.location.origin}${urlProp}`);
      } else {
        setUrl(window.location.href);
      }
    }
  }, [urlProp]);

  const togglePopup = () => setShowPopup((prev) => !prev);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const platformLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/share?url=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(url)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}`,
    email: `mailto:?subject=Check this out&body=${encodeURIComponent(url)}`,
  };

  const platformIcons = {
    facebook: <FacebookIcon className="text-blue-600" size={24} />,
    twitter: <TwitterIcon className="text-blue-400" size={24} />,
    linkedin: <LinkedInIcon className="text-blue-700" size={24} />,
    whatsapp: <WhatsAppIcon className="text-green-500" size={24} />,
    telegram: <TelegramIcon className="text-sky-500" size={24} />,
    email: <Mail className="text-gray-500" size={24} />,
  };

  // ✅ Conditional button styling
  const buttonClass =
    variant === "buttoned"
      ? "flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-accent text-foreground text-sm font-medium transition"
      : "flex items-center gap-2 w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700";

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button onClick={togglePopup} className={buttonClass}>
        <Share2 size={15} />
        Share
      </button>

      {/* Popup */}
      {showPopup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={togglePopup}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg w-80 relative dark:bg-gray-800 dark:text-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={togglePopup}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
            >
              <X size={14} />
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
                <Link size={14} />
              </button>
            </div>

            {/* Social Icons */}
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
