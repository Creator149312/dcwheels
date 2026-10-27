export const metadata = {
  title: "About Us – Spin, Talk & Decide",
  description:
    "Learn about SpinPapa, the social discussion and decision-making platform for communities, fandoms, and casual everyday choices.",
};

export default function Page() {
  return (
    <div className="py-8 px-4 sm:px-6 max-w-4xl mx-auto text-foreground">
      <div className="mb-8 border-b border-border/60 pb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          About SpinPapa
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          The social decision and discussion hub for pop culture, fandoms, and everyday choices.
        </p>
      </div>

      <div className="space-y-8 text-sm sm:text-base leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">Our Mission: Spin, Talk & Decide</h2>
          <p>
            Whether debating which anime series to binge next, picking a movie for family night, organizing a game tournament, or ranking your favorite characters, choosing should spark conversation rather than analysis paralysis.
          </p>
          <p>
            SpinPapa brings communities together to brainstorm options, share reviews, cast poll votes, and spin interactive decision wheels. It is designed from the ground up as a creative community utility and social space—not a game of chance or gambling service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">What You Can Do on SpinPapa</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Explore Topic Hubs:</strong> Deep-dive into curated databases of anime, movies, TV shows, and games with community ratings, watch options, and discussions.
            </li>
            <li>
              <strong className="text-foreground">Build & Share Decision Wheels:</strong> Create personalized visual wheels with custom options, themes, and sound effects to help resolve harmless everyday dilemmas with friends and followers.
            </li>
            <li>
              <strong className="text-foreground">Participate in Community Dilemmas:</strong> Post questions, dilemmas, and polls to get feedback, perspectives, and advice from fellow fans.
            </li>
            <li>
              <strong className="text-foreground">Track & Curate:</strong> Keep track of titles you’ve watched or played, curate custom lists, and share your favorites with the community.
            </li>
          </ul>
        </section>

        <section className="space-y-3 p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/60">
          <h2 className="text-lg font-bold text-foreground">No Real-Money, Gambling, or Wagering Policy</h2>
          <p className="text-xs sm:text-sm">
            SpinPapa is strictly an entertainment, social discussion, and casual decision-making utility. We do not host, support, or promote gambling, betting, raffles, lotteries, or real-money wagering of any kind. Decision wheels and random pickers on our platform are creative organizational tools for selecting among user-provided text options (such as study topics, movies, dinner recipes, or game challenges).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">Built for Creators & Communities</h2>
          <p>
            We believe the best decisions are made together. Have suggestions, feature ideas, or feedback? We are continuously improving SpinPapa to help communities talk, discover, and decide better every day.
          </p>
        </section>
      </div>
    </div>
  );
}
