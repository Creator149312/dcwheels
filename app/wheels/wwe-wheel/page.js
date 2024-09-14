import WheelWithInput from "@components/WheelWithInput";

let titleStr = "WWE Spin Wheel: Pick Random Wrestler";
let descriptionStr =
  "Explore WWE wheel and spin to pick a random wrestler from wwe universe.";

let segmentsData = [
  "Roman Reigns",
  "John Cena",
  "The Rock",
  "Brock Lesnar",
  "Randy Orton",
  "Triple H",
  "Undertaker",
  "Shawn Michaels",
  "Edge",
  "The Great Khali",
  "AJ Styles",
  "Seth Rollins",
  "Finn Bálor",
  "Daniel Bryan",
  "The Miz",
  "Bobby Lashley",
  "Drew McIntyre",
  "Bray Wyatt",
  "Kevin Owens",
  "Sami Zayn",
  "Shinsuke Nakamura",
  "Rey Mysterio",
  "Jeff Hardy",
  "The New Day",
  "Jinder Mahal",
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
            A WWE spin wheel is a fun game where you randomly select a WWE
            wrestler or event. Perfect for WWE 2K22 matches or just a casual
            game night, it adds an element of surprise and excitement to your
            WWE experience. Spin the wheel and see who you'll face or what match
            you'll create.
          </p>
        </div>
      </div>
    </>
  );
}
