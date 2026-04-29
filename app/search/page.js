import Link from "next/link";
import { Button } from "@components/ui/button";

export const metadata = {
  title: "Find Spin Wheels",
  description: "Find the spin wheels you are looking for",
};

export default function Page() {
  return (
    <>
      <div className="bg-card text-card-foreground w-full">
        <h1 className="text-4xl m-2 flex justify-center items-center">Find Spin Wheels</h1>
        <div className="text-lg pt-2 flex justify-center items-center">
          You can create your own wheels by{" "}
          <Link href="/register">
            <Button variant={"default"} size={"lg"} className="m-3">
              Creating an Account
            </Button>
          </Link>
        </div>
        <h2 className="text-2xl mt-4 mb-2 flex justify-center items-center">
          Popular Wheels
        </h2>
        <div className="grid lg:grid-cols-12 gap-x-2 mt-2 min-h-screen">
          <div className="rounded-xl bg-card mb-2 text-card-foreground grid text-center lg:col-span-6 shadow border">
            <ul className="m-2 text-blue-700">
              <li className="m-2 p-2">
                <Link href="/wheels/nfl-wheel" className="text-lg">
                  NFL Wheel
                </Link>
              </li>
              <li className="m-2 p-2">
                <Link href="/wheels/countries-wheel" className="text-lg ">
                  Countries Wheel
                </Link>
              </li>
              <li className="m-2 p-2">
                <Link href="/wheels/emoji-wheel" className="text-lg ">
                  Emoji Wheel
                </Link>
              </li>
              <li className="m-2 p-2">
                <Link href="/wheels/emotions-wheel" className="text-lg ">
                  Emotions Wheel
                </Link>
              </li>
              <li className="m-2 p-2">
                <Link href="/wheels/gender-wheel" className="text-lg ">
                  Gender Wheel
                </Link>
              </li>
              <li className="m-2 p-2">
                <Link href="/wheels/dice-wheel" className="text-lg ">
                  Dice Wheel
                </Link>
              </li>
              <li className="m-2 p-2">
                <Link href="/wheels/animal-wheel" className="text-lg ">
                  Animal Wheel
                </Link>
              </li>
              <li className="m-2 p-2">
                <Link href="/wheels/months-wheel" className="text-lg ">
                  Months Wheel
                </Link>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow text-center lg:col-span-6">
            <ul className="m-2 text-blue-700">
              <li className="m-2 p-2">
                <Link href="/wheels/alphabet-wheel" className="text-lg ">
                  Alphabet Wheel
                </Link>
              </li>
               <li className="m-2 p-2">
                <Link href="/wheels/truth-dare-wheel" className="text-lg ">
                  Truth and Dare Wheel
                </Link>
              </li> <li className="m-2 p-2">
                <Link href="/wheels/pokemon-wheel" className="text-lg ">
                  Pokemon Wheel
                </Link>
                </li>
             <li className="m-2 p-2">
                <Link href="/wheels/zodiac-wheel" className="text-lg ">
                  Zodiac Wheel
                </Link>
              </li>
             <li className="m-2 p-2">
                <Link href="/wheels/random-number-wheel" className="text-lg ">
                  Random Number Wheel - 1 to 100
                </Link>
              </li>
              <li className="m-2 p-2">
                <Link href="/wheels/fruit-wheel" className="text-lg ">
                Fruit Wheel
                </Link>
              </li>
              <li className="m-2 p-2">
                <Link href="/wheels/height-wheel" className="text-lg ">
                Height Wheel
                </Link>
              </li>
              <li className="m-2 p-2">
                <Link href="/wheels/personality-wheel" className="text-lg ">
                Personality Wheel
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
