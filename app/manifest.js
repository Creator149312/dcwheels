export default function manifest() {
  return {
    name: "Spinpapa – Explore, Discover, Spin Wheel & Decide",
    short_name: "Spinpapa",
    description:
      "Spinpapa is the social way to explore ideas, discover new options, and let the wheel decide. Create your own spins, share with friends, and pick anything—from dinner plans to big life choices—in a fun way.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6366f1",
    orientation: "portrait-primary",
    scope: "/",
    categories: ["entertainment", "games", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Spin a wheel",
        short_name: "Spin",
        description: "Start spinning a random wheel",
        url: "/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Explore wheels",
        short_name: "Explore",
        description: "Discover popular spin wheels",
        url: "/explore",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
