import Link from "next/link";

export const metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <p className="text-6xl font-black text-blue-500 mb-4">404</p>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Page not found
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Go home
        </Link>
        <Link
          href="/wheels"
          className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Browse wheels
        </Link>
      </div>
    </div>
  );
}
