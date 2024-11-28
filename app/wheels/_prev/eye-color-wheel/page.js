import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Eye Color Wheel: Random Picker";
let descriptionStr =
  "Spin the eye color wheel to quickly and easily find the perfect eyeshadow or eyeliner color to complement your eye color.";
let segmentsData = [
  "Brown",
  "Green",
  "Blue",
  "Hazel",
  "Amber",
  "Gray",
  "Violet",
  "Black",
  "Honey",
  "Gold",
  "Copper",
  "Bronze",
  "Jade",
  "Emerald",
  "Sapphire",
  "Amethyst",
  "Slate",
  "Charcoal",
  "Ivory",
  "Pearl",
  "Champagne",
  "Rose Gold",
  "Plum",
  "Mauve",
  "Lavender",
  "Lilac",
  "Teal",
  "Turquoise",
  "Cobalt",
  "Navy",
];

export const metadata = {
  title: titleStr,
  description: descriptionStr,
};

export default async function Page({ params }) {
  return (
    <>
      <WheelWithInput newSegments={segmentsData} />
      <div className="p-3">
        <h1 className="text-4xl mb-2">{titleStr}</h1>
        <div className="text-lg">
          <p className="mb-3">
            An eye color wheel is a visual tool used in makeup artistry,
            especially for eyeshadow application. It&#39;s based on color theory,
            which explains how different colors interact and complement each
            other. 
          </p>
          <p className="mb-3">
          By spinning the color wheel, makeup artists can choose
          eyeshadow shades that flatter their clients&#39; eye color.
          </p>
          <p className="mb-3">
            For example, people with brown eyes are often considered versatile
            and can wear a wide range of colors. However, shades of green,
            purple, and blue can be particularly flattering.
          </p>
        </div>
      </div>
    </>
  );
}
