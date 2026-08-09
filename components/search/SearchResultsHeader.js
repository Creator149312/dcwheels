export default function SearchResultsHeader({ searchtitle }) {
  return (
    <header className="mb-3 md:mb-5">
      <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-foreground leading-tight">
        Results for{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
          &quot;{searchtitle}&quot;
        </span>
      </h1>
    </header>
  );
}
