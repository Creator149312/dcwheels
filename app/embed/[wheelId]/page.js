import apiConfig from "@utils/ApiUrlConfig";
import { validateObjectID } from "@utils/Validator";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import EmbedWheelViewer from "@components/EmbedWheelViewer";

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
  if (listdata) {
    return {
      title: `${listdata.title} – Spin Wheel`,
      description: `Spin the ${listdata.title} wheel on SpinPapa.`,
      robots: "noindex",
    };
  }
  return { title: "Spin Wheel", robots: "noindex" };
}

export default async function EmbedPage({ params }) {
  const wheelData = await fetchWheelData(params.wheelId);

  if (!wheelData) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 text-sm">
        Wheel not found or has been deleted.
      </div>
    );
  }

  return (
    <EmbedWheelViewer
      newSegments={ensureArrayOfObjects(wheelData.data)}
      wheelPresetSettings={wheelData?.wheelData ?? null}
      wheelTitle={wheelData.title}
      wheelId={params.wheelId}
    />
  );
}
