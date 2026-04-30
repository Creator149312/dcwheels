"use client";
import dynamic from "next/dynamic";

// `react-hot-toast` ships ~12KB of JS that is irrelevant to LCP — toasts
// only ever appear in response to user actions (login, save, etc.). Loading
// it eagerly in app/layout.js put it in the initial route bundle on every
// page. Wrapping in `dynamic({ ssr: false })` defers the import until the
// browser is past hydration, removing it from the critical path.
//
// The named-export shape: react-hot-toast exports { Toaster }, so we map
// the module to its `Toaster` member inside the dynamic factory.
const Toaster = dynamic(
  () => import("react-hot-toast").then((mod) => mod.Toaster),
  { ssr: false }
);

export default function LazyToaster() {
  return <Toaster />;
}
