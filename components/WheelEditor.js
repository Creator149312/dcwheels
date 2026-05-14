"use client";
import dynamic from "next/dynamic";

// On `/wheels/[slug]` and `/uwheels/[wheelId]` (where ~99% of search/share
// traffic lands), this component renders only a `hidden lg:block`
// RelatedWheels sidebar - the heavy editor below is never reached. Loading
// the full editor module on those routes wasted ~30-60KB of JS in the
// initial bundle for users who could not even see it.
//
// Solution: keep the lightweight RelatedWheels path inline, code-split the
// full editor into its own webpack chunk via next/dynamic. On `/` the chunk
// downloads in parallel with hydration; on other routes it never downloads
// at all. `ssr: false` is safe - the editor is purely interactive UI with
// no SEO value, and skipping SSR also avoids paying server render cost for
// a large component tree.
const WheelEditorFull = dynamic(() => import("./WheelEditorFull"), {
  ssr: false,
});

export default function WheelEditor({
  mustSpin,
  currentPath,
  relatedWheelsSlot,
  isFullScreen,
}) {
  if (isFullScreen) return null;

  // Non-home routes: render only the lightweight related-wheels sidebar.
  // Hidden below `lg` (RelatedWheels is desktop-only), so on mobile this is
  // effectively `display:none` - zero painted pixels and zero CLS.
  if (currentPath !== "/") {
    return (
      <aside className="hidden lg:block relative bg-card text-card-foreground border shadow-sm lg:col-span-5 xl:col-span-3 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto p-3">
          {relatedWheelsSlot}
        </div>
      </aside>
    );
  }

  // Home page: lazy-load the full tabbed editor.
  return <WheelEditorFull mustSpin={mustSpin} currentPath={currentPath} />;
}
