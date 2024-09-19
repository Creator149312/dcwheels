import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Pokemon Picker Wheel";
let descriptionStr =
  "Explore " + titleStr + " and spin to pick a random pokemon.";

let segmentsData = [
  "Pikachu",
  "Charmander",
  "Squirtle",
  "Bulbasaur",
  "Eevee",
  "Mewtwo",
  "Gengar",
  "Arcanine",
  "Dragonite",
  "Lapras",
  "Lucario",
  "Mew",
  "Gyarados",
  "Espeon",
  "Umbreon",
  "Jolteon",
  "Flareon",
  "Vaporeon",
  "Togepi",
  "Togetic",
  "Togekiss",
  "Magikarp",
  "Gyarados",
  "Snorlax",
  "Machamp",
  "Alakazam",
  "Venusaur",
  "Charizard",
  "Blastoise",
  "Jigglypuff",
  "Wigglytuff",
  "Clefairy",
  "Clefable",
  "Pichu",
  "Raichu",
  "Psyduck",
  "Golduck",
  "Machop",
  "Machoke",
  "Gengar",
  "Haunter",
  "Gastly",
  "Onix",
  "Rhyhorn",
  "Rhydon",
  "Drowzee",
  "Hypno",
  "Krabby",
  "Kingler",
  "Cubone",
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
            A Pokemon Wheel is a circular tool with the names of popular Pokemon
            evenly spaced around its circumference. It is a fun and interactive
            way to randomly select a Pokemon. Simply spin the wheel and let a
            pointer land on a Pokemon. The selected Pokemon is chosen completely
            at random ensuring fairness. Pokemon Wheels can be used for various
            purposes like choosing a Pokemon for a battle a quiz or just for
            fun.
          </p>
        </div>
      </div>
    </>
  );
}
