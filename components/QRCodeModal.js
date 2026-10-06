"use client";

import { useEffect, useRef, useState } from "react";
import { X, QrCode, Download, Copy, Check } from "lucide-react";
import { renderQRToCanvas, downloadQRCode } from "@utils/qrCode";
import toast from "react-hot-toast";

export default function QRCodeModal({ url, title = "Scan to Open Wheel", onClose }) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && url) {
      renderQRToCanvas(canvasRef.current, url, {
        size: 240,
        margin: 2,
        darkColor: "#0f172a",
        lightColor: "#ffffff",
      });
    }
  }, [url]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadQRCode(url, "wheel-qr-code.png", 600);
    toast.success("QR Code downloaded!");
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm relative flex flex-col items-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-muted-foreground hover:text-foreground p-1 transition-colors"
          title="Close"
        >
          <X size={16} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="text-primary" size={20} />
          <h3 className="font-bold text-base text-foreground">Scan QR Code</h3>
        </div>

        <p className="text-xs text-muted-foreground text-center mb-4 max-w-xs">
          {title}
        </p>

        {/* Crisp QR Canvas Container */}
        <div className="p-3 bg-white rounded-2xl border border-border shadow-inner flex items-center justify-center mb-4">
          <canvas ref={canvasRef} className="block rounded-lg" />
        </div>

        <p className="text-[11px] text-muted-foreground text-center mb-4">
          Point any phone or tablet camera at the screen to open and spin instantly.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Download size={14} />
            <span>Download PNG</span>
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? "Copied" : "Copy Link"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
