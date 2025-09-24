import { getAllWheelPages } from "@components/actions/actions";
import { replaceUnderscoreWithDash } from "@utils/HelperFunctions";
const BASE_URL = "https://www.spinpapa.com";

export const revalidate = 0;

export default async function sitemap({ id }) {
  // const AllUrls = Object.keys(WheelData);
  const AllUrls = await getAllWheelPages();

  const adultWords = [
    "sex",
    "porn",
    "nude",
    "erotic",
    "xxx",
    "fetish",
    "bdsm",
    "naked",
    "boobs",
    "butt",
    "vagina",
    "penis",
    "dildo",
    "orgasm",
    "hentai",
    "anal",
    "cum",
    "intercourse",
    "masturbation",
    "position",
    "sex-position",
  ];

  const isAdult = (word) => {
    const normalizedWord = word.toLowerCase();
    return adultWords.some((adultTerm) => normalizedWord.includes(adultTerm));
  };

  return AllUrls.filter((word) => !isAdult(word)).map((word) => ({
    url: `${BASE_URL}/wheels/${replaceUnderscoreWithDash(word)}`.trim(),
    lastModified: new Date(),
  }));
}
