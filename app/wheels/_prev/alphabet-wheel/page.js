import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";

let titleStr = "Alphabet Wheel - Pick a Random Letter";
let descriptionStr =
  "Explore alphabet wheel and spin to pick from 26 letters of English Alphabet";

let segmentsData = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

export const metadata = {
  title: titleStr,
  description: descriptionStr,
};

export default async function Page({ params }) {
  return (
    <>
      {/* <WheelWithInput newSegments={segmentsData} /> */}
      <WheelWithInputContentEditable newSegments={segmentsData} />
      <div className="p-3">
        <h1 className="text-4xl mb-2">{titleStr}</h1>
        <div className="text-lg">
          <p className="mb-3">
            An alphabet wheel is a circular device with the letters of the
            alphabet arranged around its circumference. It often has a pointer
            or marker that can be rotated to select a specific letter. This
            simple tool is commonly used in various educational and recreational
            activities such as games puzzles and learning exercises.
          </p>
        </div>
      </div>
    </>
  );
}
