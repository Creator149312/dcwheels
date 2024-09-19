import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Drinking Spin Wheel - Pick Drink Challenges";
let descriptionStr =
  "Explore Drinking wheel and spin to pick a random drink challenge with your friends.";

let segmentsData = [
  "Never Have I Ever: Players take turns saying something they've never done. If anyone else has, they must take a drink.",
  "Truth or Dare: Players choose between answering a question truthfully or performing a dare. If they refuse, they must take a drink.",
  "Around the World: Players take turns drinking from a glass of beer, moving the glass around the table in a clockwise direction. The last person to drink must finish the glass.",
  "King's Cup: Players take turns drawing cards from a deck. Each card corresponds to a specific drinking rule.",
  "Sing a song: Choose a song and sing a verse or chorus.",
  "Tell a joke: Tell a joke, and if it's bad, you must take a drink.",
  "Do an impression: Impersonate a famous person or character.",
  "Act like a baby: Crawl around on the floor and babble.",
  "Imitate an animal: Make animal sounds and movements.",
  "Guys Drink",
  "Tell a story: Make up a story on the spot.",
  "Give a Drink",
  "Do a dance: Choose a dance style and perform a short routine.",
  "Drink a shot of tequila: Take a shot of tequila without wincing.",
  "Finish a beer in a minute: Chug a beer as fast as you can.",
  "Down a shot of whiskey: Take a shot of whiskey without making a face.",
  "Drink a glass of wine without taking a breath: Drink a glass of wine in one continuous gulp.",
  "Take a cold shower: Step outside and take a quick cold shower.",
  "Call a random number: Call a random phone number and say something funny.",
  "Do a dare from someone else: Let another player give you a dare.",
  "Create a new drink: Mix together different alcoholic and non-alcoholic beverages.",
  "Girls Drink",
  "Tell a ghost story: Tell a scary story.",
  "You Drink",
  "Play a game: Choose a game and play it with the other players.",
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
            A drinking wheel is a fun and chaotic game that adds a twist to your
            drinking parties. It is a circular board with various challenges
            written on it, ranging from harmless dares to outrageous stunts.
          </p>
          <p className="mb-3">
            Spin the wheel and whatever it lands on, you must do it! From
            chugging a beer to performing a silly dance, the drinking wheel
            guarantees endless laughter, friendly brawls, and plenty of
            alcohol-fueled fun.
          </p>
        </div>
      </div>
    </>
  );
}
