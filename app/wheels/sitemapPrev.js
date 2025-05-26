import WheelData from "@data/WheelData";
import { replaceUnderscoreWithDash } from "@utils/HelperFunctions";
const BASE_URL = "https://www.spinpapa.com";

export const revalidate = 0;

export default async function sitemap({ id }) {
  const AllUrls = Object.keys(WheelData);

  return AllUrls.map((word) => ({
    url: `${BASE_URL}/wheels/${replaceUnderscoreWithDash(word)}`.trim(),
    lastModified: new Date(),
  }));
}
