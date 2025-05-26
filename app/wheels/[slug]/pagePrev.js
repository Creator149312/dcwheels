import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import WheelData from "@data/WheelData";
import { replaceDashWithUnderscore } from "@utils/HelperFunctions";
import { redirect } from "next/navigation";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const pageData = WheelData[replaceDashWithUnderscore(slug)];

  if (pageData === undefined) redirect("/"); //this is done to ensure only valid urls are loaded and all others are redirected to homepage.

  return {
    title: pageData.title,
    description: pageData.description,
  };
}

export default async function Home({ params }) {
  const slug = await params.slug;
  const startDB = performance.now();
  const pageData = WheelData[replaceDashWithUnderscore(slug)];
  const endDB = performance.now();

  console.log(`⏱️ Database fetch time: ${(endDB - startDB).toFixed(2)} ms`);
  if (pageData === undefined) redirect("/");

  const startRender = performance.now();

  return (
    <div className="p-3">
      {/* <WheelWithInput newSegments={segmentsData} /> */}
      <WheelWithInputContentEditable
        newSegments={ensureArrayOfObjects(pageData.segments)}
      />
      <h1 className="text-3xl mb-2">{pageData.heading}</h1>

      {/* Map through the content and render accordingly */}
      <div className="text-lg">
        {pageData.content.map((item, index) => {
          switch (item.type) {
            case "paragraph":
              return (
                <p key={index} className="mb-3">
                  {item.text}
                </p>
              );
            case "image":
              return <img key={index} src={item.src} alt={item.alt} />;
            case "link":
              return (
                <a
                  key={index}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.text}
                </a>
              );
            case "heading":
              const HeadingTag = `h${item.level}`; // Dynamically render the heading tag (e.g., h2, h3)
              return <HeadingTag key={index}>{item.text}</HeadingTag>;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
