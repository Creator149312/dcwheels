"use client";
import { useState, useEffect, useRef } from "react";
import { Share2, Mail, X, Link, QrCode, Download, Copy, Check } from "lucide-react";
import { FacebookIcon, TwitterIcon, LinkedInIcon, WhatsAppIcon, TelegramIcon } from "@components/BrandIcons";
import { renderQRToCanvas, downloadQRCode } from "@utils/qrCode";
import toast from "react-hot-toast";

export default function SharePopup({
  platforms = ["facebook", "twitter", "linkedin", "whatsapp", "telegram", "email"],
  variant = "simple",
  url: urlProp,
}) {
  const [showPopup, setShowPopup] = useState(false);
  const [activeTab, setActiveTab] = useState("links"); // "links" | "qr"
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef(null);

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

  // Render QR code to canvas whenever the QR tab is active and URL is available
  useEffect(() => {
    if (showPopup && activeTab === "qr" && qrCanvasRef.current && url) {
      renderQRToCanvas(qrCanvasRef.current, url, {
        size: 200,
        margin: 2,
        darkColor: "#0f172a",
        lightColor: "#ffffff",
      });
    }
  }, [showPopup, activeTab, url]);

  const togglePopup = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // On mobile devices, try native OS Web Share API first
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.share) {
      const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      if (isMobile) {
        try {
          await navigator.share({
            title: "Check this out on SpinWheel",
            url: url || window.location.href,
          });
          return;
        } catch (err) {
          // User aborted share sheet or unsupported payload; fallback to popup modal
          if (err.name === "AbortError") return;
        }
      }
    }

    setShowPopup((prev) => !prev);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    downloadQRCode(url, "spinwheel-qr.png", 500);
    toast.success("QR Code downloaded!");
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
      ? "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-accent text-foreground text-sm font-medium transition leading-none shadow-sm min-h-[36px] sm:min-h-[36px] md:h-9 active:scale-95 touch-manipulation cursor-pointer"
      : "flex items-center gap-2 w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer";

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button onClick={togglePopup} className={buttonClass}>
        <Share2 size={15} />
        <span className="hidden sm:inline">Share</span>
      </button>

      {/* Popup */}
      {showPopup && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-50 p-4"
          onClick={togglePopup}
        >
          <div
            className="bg-card text-card-foreground border border-border p-5 rounded-2xl shadow-xl w-full max-w-sm relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={togglePopup}
              className="absolute top-3.5 right-3.5 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X size={16} />
            </button>

            {/* Header Tabs: Links vs QR Code */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl mb-4 mr-6">
              <button
                type="button"
                onClick={() => setActiveTab("links")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "links"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Share2 size={13} />
                <span>Share Link</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("qr")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "qr"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <QrCode size={13} />
                <span>QR Code</span>
              </button>
            </div>

            {/* TAB 1: Links & Social Icons */}
            {activeTab === "links" ? (
              <div className="space-y-4">
                {/* URL + Copy */}
                <div className="flex items-center border border-border rounded-xl overflow-hidden bg-background">
                  <input
                    type="text"
                    value={url}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs bg-transparent outline-none text-foreground font-mono truncate"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-2 bg-muted hover:bg-muted-foreground/10 text-foreground transition-colors shrink-0"
                    title="Copy Link"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Social Icons */}
                <div className="flex justify-around items-center pt-1">
                  {platforms.map((p) => (
                    <a
                      key={p}
                      href={platformLinks[p]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:scale-110 active:scale-95 transition-transform p-1.5 rounded-full hover:bg-muted"
                      title={`Share on ${p}`}
                    >
                      {platformIcons[p]}
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              /* TAB 2: Zero-Dependency QR Code */
              <div className="flex flex-col items-center gap-3 py-1">
                <div className="p-3 rounded-2xl bg-white border border-border/60 shadow-inner flex items-center justify-center">
                  <canvas ref={qrCanvasRef} className="block rounded-lg" />
                </div>

                <p className="text-[11px] text-muted-foreground text-center font-medium">
                  Scan with any phone camera to open and spin instantly
                </p>

                <div className="flex items-center gap-2 w-full pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-2xs active:scale-95"
                  >
                    <Download size={14} />
                    <span>Download QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-bold transition-all active:scale-95"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{copied ? "Copied" : "Copy Link"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

