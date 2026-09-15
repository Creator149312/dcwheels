"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full mt-auto border-t border-border bg-card/40 dark:bg-card/20 md:pl-[72px] xl:pl-60 transition-[padding] duration-200 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8 pt-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-border/40">
          {/* Quick Links */}
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs sm:text-sm font-semibold text-muted-foreground">
            <Link
              href="/about"
              className="hover:text-primary transition-colors"
            >
              About
            </Link>
            <Link href="/faq" className="hover:text-primary transition-colors">
              FAQ
            </Link>
            <Link
              href="/privacy-policy"
              className="hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/wheels"
              className="hover:text-primary transition-colors"
            >
              Wheels
            </Link>
            <Link
              href="/lists"
              className="hover:text-primary transition-colors"
            >
              Lists
            </Link>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground/70">
          <p>© {new Date().getFullYear()} SpinPapa. All rights reserved.</p>
          <p className="text-[11px] text-muted-foreground/50">
            Made with ❤️ for communities, creators & decision makers.
          </p>
        </div>
      </div>
    </footer>
  );
}
