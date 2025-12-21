// app/anime/[id]/page.js
// It is working we are able to display characters for each anime 
// we can use this data to create a list of characters for each anime, or character picker wheels for each character.

import { AniList } from "@spkrbox/anilist";

const client = new AniList();

async function fetchAnime(id) {
  return client.media.getById(id);
}

async function fetchCharacters(id) {
  return client.media.getCharacters(id);
}

export default async function AnimePage({ params }) {
  const { id } = params;

  // Fetch anime info
  const anime = await fetchAnime(id);

  // Fetch characters
  const charactersData = await fetchCharacters(id);
  const characters = charactersData.edges;

  return (
    // <div style={{ padding: "2rem" }}>
    //   <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>
    //     {anime.title.romaji} — Characters
    //   </h1>

    //   <div
    //     style={{
    //       display: "grid",
    //       gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    //       gap: "1.5rem",
    //       marginTop: "2rem"
    //     }}
    //   >
    //     {characters.map((char) => (
    //       <div
    //         key={char.id}
    //         style={{
    //           textAlign: "center",
    //           background: "#f5f5f5",
    //           padding: "1rem",
    //           borderRadius: "8px"
    //         }}
    //       >
    //         <img
    //           src={char.node.image.large}
    //           alt={char.node.name.full}
    //           style={{
    //             width: "100%",
    //             borderRadius: "6px",
    //             objectFit: "cover"
    //           }}
    //         />
    //         <p style={{ marginTop: "0.5rem", fontWeight: "600" }}>
    //           {char.node.name.full}
    //         </p>
    //         <p style={{ fontSize: "0.8rem", color: "#666" }}>
    //           {char.role}
    //         </p>
    //       </div>
    //     ))}
    //   </div>
    // </div>
    <></>
  );
}
