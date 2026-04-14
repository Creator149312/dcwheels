"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaRegCopy, FaShareAlt, FaTwitter, FaWhatsapp } from "react-icons/fa";

function stripHtml(value) {
  if (!value) return "";

  if (typeof window !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = value;
    return div.textContent?.trim() || "";
  }

  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function ShareableResultCard({ winner, wheelTitle }) {
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href);
    }
  }, []);

  const winnerText = useMemo(() => {
    if (!winner) return "";

    const rawValue = typeof winner === "string" ? winner : winner?.text || "";
    const clean = stripHtml(rawValue);

    return clean || "A surprise pick";
  }, [winner]);

  const message = useMemo(() => {
    const wheelLine = wheelTitle ? ` from \"${wheelTitle}\"` : "";
    return `My Spinpapa pick${wheelLine}: ${winnerText}. What would your wheel choose?`;
  }, [wheelTitle, winnerText]);

  const encodedMessage = encodeURIComponent(message);
  const encodedMessageWithUrl = encodeURIComponent(`${message}\n${pageUrl}`);
  const encodedUrl = encodeURIComponent(pageUrl);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessageWithUrl}`;

  const copyShareText = async () => {
    try {
      const content = `${message}\n${pageUrl}`.trim();
      await navigator.clipboard.writeText(content);
      toast.success("Result copied. Share it anywhere.");
    } catch (error) {
      toast.error("Could not copy result text.");
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      copyShareText();
      return;
    }

    try {
      await navigator.share({
        title: "My Spinpapa Result",
        text: message,
        url: pageUrl,
      });
    } catch (error) {
      // User cancelled sharing, no toast needed.
    }
  };

  if (!winnerText) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-200/70 dark:border-amber-400/20 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 text-left shadow-inner">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        Shareable Result Card
      </p>

      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{message}</p>

      <div className="mt-3 rounded-lg bg-white/80 dark:bg-black/20 p-3 border border-amber-100 dark:border-slate-700">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Spinpapa Result
        </p>
        <p className="mt-1 text-lg font-extrabold text-gray-900 dark:text-gray-100 break-words">
          {winnerText}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyShareText}
          className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          <FaRegCopy /> Copy
        </button>

        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-600"
        >
          <FaTwitter /> Twitter
        </a>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
        >
          <FaWhatsapp /> WhatsApp
        </a>

        <button
          type="button"
          onClick={nativeShare}
          className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
        >
          <FaShareAlt /> Share
        </button>
      </div>
    </div>
  );
}
