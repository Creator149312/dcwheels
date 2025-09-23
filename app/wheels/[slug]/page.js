import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { redirect } from "next/navigation";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { getPageDataBySlug } from "@components/actions/actions";
import WheelInfoSection from "@components/WheelMeta";
import { getServerSession } from "@node_modules/next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import User from "@models/user";

export const revalidate = false;

export async function generateMetadata({ params }) {
  const { slug } = await params;

  const pageData = await getPageDataBySlug(slug);

  if (pageData === undefined) redirect("/"); //this is done to ensure only valid urls are loaded and all others are redirected to homepage.

  return {
    title: pageData.title,
    description: pageData.description,
  };
}

export default async function Home({ params }) {
  const slug = params.slug;

  const session = await getServerSession(authOptions);
  // const startDB = performance.now();
  const pageData = await getPageDataBySlug(slug);
  // const endDB = performance.now();

  // console.log("PAGEDATA = ", pageData);
  // Identify user who created the wheel
  let username = null;
  // console.log(`⏱️ Database fetch time: ${(endDB - startDB).toFixed(2)} ms`);

  if (pageData === undefined) redirect("/");

  // const stats = await getContentStats({
  //   entityType: "wheel",
  //   entityId: pageData.wheel._id,
  // });

  // console.log(stats);

  // remove username fetching so that I can reduce DB queries
  // const user = await User.findOne({ email: pageData.wheel.createdBy }).lean();
  // if (user) username = user.name;

  // const startRender = performance.now();

  return (
    <div className="p-3">
      <WheelWithInputContentEditable
        newSegments={ensureArrayOfObjects(pageData.wheel.data)}
        wheelPresetSettings={pageData.wheel.wheelData}
      />
      {/* <WheelInfoSection
        wordsList={pageData.wheel}
        stats={stats}
        session={session}
        wheelId={pageData.wheel._id}
        username={username}
        pageData={pageData}
      /> */}

      <WheelInfoSection
        wordsList={pageData.wheel}
        session={session}
        wheelId={pageData.wheel._id}
        // username={username}
        pageData={pageData}
      />
    </div>
  );
}
