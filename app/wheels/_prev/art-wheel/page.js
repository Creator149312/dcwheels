import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Art Spinner Wheel - Pick Drawing Challenges";
let descriptionStr =
  "Explore Art wheel and spin to pick a random drawing challenge daily.";

let segmentsData = [
  "Draw a person (stick figure, basic outline): Beginner",
  "Draw an animal (dog, cat, bird): Beginner",
  "Draw a landscape (mountains, trees, river): Beginner",
  "Draw a cityscape (buildings, streets): Beginner",
  "Draw a portrait (face, eyes, nose, mouth, basic outline): Beginner",
  "Draw a still life (objects on a table): Beginner",
  "Draw a character from a cartoon: Beginner",
  "Draw a fantasy creature (dragon, unicorn, mermaid, simple outline): Beginner",
  "Draw a scene from a favorite book or movie: Beginner",
  "Draw a self-portrait (basic outline): Beginner",
  "Draw a simple landscape with a few elements: Beginner",
  "Draw a portrait with a basic expression: Beginner",
  "Draw a character from your imagination (simple outline): Beginner",
  "Draw a still life with simple lighting: Beginner",
  "Draw a cityscape with basic buildings: Beginner",
  "Draw a fantasy creature with simple details: Beginner",
  "Draw a scene from a dream (simple outline): Beginner",
  "Draw a portrait using basic shading: Beginner",
  "Draw a simple landscape with a few layers: Beginner",
  "Draw a character from a video game (simple outline): Beginner",
  "Draw a simple surreal scene: Beginner",
  "Draw a portrait using crayons or markers: Beginner",
  "Draw a simple illustration of a familiar object: Beginner",
  "Draw a character design for a simple story: Beginner",
  "Draw a portrait using a simple style: Beginner",
  "Draw a simple scene with a few characters: Beginner",
  "Draw a detailed landscape with multiple elements: Intermediate",
  "Draw a portrait with expression and emotion: Intermediate",
  "Draw a character from a video game with intricate details: Intermediate",
  "Draw a surreal scene with complex elements: Intermediate",
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
            An art drawing challenge wheel is a tool to inspire and guide
            artists in creating new drawings. All you have to do is spin to
            reveal a random drawing prompt or theme. This can be anything from a
            specific object or animal to a more abstract concept.
          </p>
          <p className="mb-3">
            The wheel can help artists overcome creative blocks, explore new
            styles, and challenge themselves to try new techniques.
          </p>
        </div>
      </div>
    </>
  );
}
