// components/Footer.js
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full md:pl-16 border-t mt-4 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-4 px-6 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
      <div>2025 © SpinPapa.</div>
      <div className="space-x-4">
        <Link href="/faq" className="hover:underline">F.A.Q</Link>
        <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>
        <Link href="/terms" className="hover:underline">Terms & Conditions</Link>
        <Link href="/about" className="hover:underline">About Us</Link>
      </div>
    </footer>
  );
}
