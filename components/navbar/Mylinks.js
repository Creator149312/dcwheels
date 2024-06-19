export const links = [
    {
      name: "Dictionaries",
      submenu: true,
      sublinks: [
        {
          Head: "All Dictionaries",
          sublink: [
            { name: "Word Dictionary", link: "/define" },
            { name: "Rhyming Dictionary", link: "/rhyming-words" },
            { name: "Adjective Dictionary", link: "/browse/adjectives" },
            { name: "Verb Dictionary", link: "/browse/verbs" },
            { name: "Noun Dictionary", link: "/browse/nouns" },
          ],
        },
        // {
        //   Head: "Tools",
        //   sublink: [
        //     { name: "Syllable Counter", link: "/syllables" },
        //     { name: "Casual shirts", link: "/" },
        //   ],
        // },
      ],
    },
    {
      name: "Tools",
      submenu: true,
      sublinks: [
        {
          Head: "Word Tools",
          sublink: [
            { name: "Word Unscrambler", link: "/word-finder" },
            { name: "Adjectives Finder", link: "/adjectives" },
            { name: "Syllable Counter", link: "/syllables" },
          ],
        },
      ],
    },
  ];