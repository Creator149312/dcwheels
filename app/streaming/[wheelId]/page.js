import apiConfig from "@utils/ApiUrlConfig";
import { validateObjectID } from "@utils/Validator";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import StreamingWheelViewer from "@components/StreamingWheelViewer";

/**
 * /streaming/[wheelId]
 *
 * Designed as an OBS Browser Source overlay.
 *
 * Usage in OBS:
 *  1. Add Browser Source → URL: https://spinpapa.com/streaming/<wheelId>
 *  2. Width: 800, Height: 800 (or match your canvas)
 *  3. Check "Shutdown source when not visible"
 *  4. Custom CSS: body { background: transparent !important; }
 *     (usually not needed — this page already outputs transparent bg)
 *
 * URL params:
 *  ?autoremove=1   — winner card auto-dismisses after 4 s
 *  ?ms=6000        — custom auto-dismiss delay in ms
 */

async function fetchWheelData(id) {
  if (!validateObjectID(id)) return null;
  try {
    const response = await fetch(`${apiConfig.apiUrl}/wheel/${id}`, {
      next: { revalidate: 600 },
    });
    if (!response.ok) throw new Error("Failed to fetch wheel");
    const data = await response.json();
    return data.list || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const listdata = await fetchWheelData(params.wheelId);
  return {
    title: listdata ? `${listdata.title} – Streaming` : "Streaming Wheel",
    robots: "noindex,nofollow",
  };
}

export default async function StreamingPage({ params, searchParams }) {
  const wheelData = await fetchWheelData(params.wheelId);

  if (!wheelData) {
    return (
      <div
        className="flex items-center justify-center w-screen h-screen text-white text-sm"
        style={{ background: "transparent" }}
      >
        Wheel not found.
      </div>
    );
  }

  const autoRemove = searchParams?.autoremove === "1";
  const autoRemoveMs = searchParams?.ms ? parseInt(searchParams.ms, 10) : 4000;

  return (
    <StreamingWheelViewer
      newSegments={ensureArrayOfObjects(wheelData.data)}
      wheelPresetSettings={wheelData?.wheelData ?? null}
      wheelTitle={wheelData.title}
      wheelId={params.wheelId}
      autoRemove={autoRemove}
      autoRemoveMs={Number.isFinite(autoRemoveMs) ? autoRemoveMs : 4000}
    />
  );
}
