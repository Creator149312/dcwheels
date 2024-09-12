import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Truth and Dare Picker Wheel";
let descriptionStr = "Explore " + titleStr + " and spin to pick a random task.";

let segmentsData = [
  "What's your biggest fear?",
  "What's your most embarrassing moment?",
  "What's your biggest regret?",
  "What's your biggest accomplishment?",
  "What's your biggest secret?",
  "Who was your first crush?",
  "What's your biggest pet peeve?",
  "What's your biggest insecurity?",
  "What's your biggest dream?",
  "What's your biggest regret?",
  "Sing a song.",
  "Do your best impression of a celebrity.",
  "Tell a joke.",
  "Eat a spoonful of something gross.",
  "Call your crush and say something funny.",
  "Dance like nobody's watching.",
  "Do 10 push-ups.",
  "Hold an ice cube in your hand until it melts.",
  "Call your mom and tell her you love her.",
  "Let someone else choose your outfit for the day.",
  "Do a cartwheel.",
  "Try to lick your elbow.",
  "Make a funny face and take a picture.",
  "Do a silly walk.",
  "Give a compliment to someone you don't know.",
  "Try to balance a spoon on your nose.",
  "Do a magic trick.",
  "Try to solve a Rubik's Cube.",
  "Recite a poem from memory.",
  "Do a handstand.",
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
            The Truth and Dare Wheel is a game that involves spinning a wheel to
            determine a truth or dare that players must perform. The wheel is
            divided into sections, each representing a different truth or dare.
          </p>
          <p className="mb-3">
            The dares can range from silly and lighthearted tasks, such as
            singing a song or doing a silly dance, to more challenging and
            daring actions, like eating something unusual or performing a stunt.
            Truths can involve answering personal questions or revealing
            secrets.
          </p>
          <p className="mb-3">
            This game is often played by groups of friends or family members and
            is a fun way to add excitement and unpredictability to social
            gatherings. It can also be a great icebreaker for people who do not
            know each other well, as performing dares and sharing truths
            together can help build camaraderie and create a more relaxed and
            enjoyable atmosphere.
          </p>
          <p className="mb-3">
            You can also turn the wheel into a mystery wheel of dares, where the
            dares are hidden behind a layer of mystery. Players must spin the
            wheel and then perform the dare without knowing what it is
            beforehand. This adds an element of excitement and unpredictability
            to the game, as players have no idea what they will be asked to do.
          </p>
        </div>
      </div>
    </>
  );
}
