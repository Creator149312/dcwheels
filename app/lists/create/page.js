import { Suspense } from "react";
import CreateListClient from "./CreateListClient";

export const metadata = {
  title: "Create List",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>}>
      <CreateListClient />
    </Suspense>
  );
}