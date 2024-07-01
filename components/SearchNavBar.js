"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button"
import { getWheelsByTitle } from "./actions/actions";

//usage of SessionStore is causing website to load slowly
const SearchBarNav = () => {
  const [selectedOption, setSelectedOption] = useState("/define/");
  const [word, setWord] = useState("");
  const pathname = usePathname();
  const [inputError, setInputError] = useState(false);
  const [placeholder, setPlaceHolder] = useState(
    "Find New Wheels to Explore"
  );

//   //add placeholder key also in this
//   const urlOptions = [
//     {
//       value: commonLinks.definition,
//       label: "Word Dictionary",
//       placeholder: "Enter Word to Find Definitions",
//     },
//     {
//       value: commonLinks.wordfinder,
//       label: "Word Finder",
//       placeholder: "Enter Letters to Unscramble",
//     },
//     {
//       value: commonLinks.thesaurus,
//       label: "Thesaurus",
//       placeholder: "Enter Word to Find Synonyms",
//     },
//     {
//       value: commonLinks.rhyming,
//       label: "Rhyming Dictionary",
//       placeholder: "Enter Word to Find Rhyming Words",
//     },
//     {
//       value: commonLinks.syllables,
//       label: "Syllable Counter",
//       placeholder: "Enter Word to Count Syllables",
//     },
//     {
//       value: commonLinks.adjectives,
//       label: "Adjectives Finder",
//       placeholder: "Enter Word to Find Adjectives",
//     },
//   ];

  function checkOptionInSearch(obj, stringA) {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (obj[key] === stringA) {
          return true; // Found a match
        }
      }
    }
    return false; // No match found
  }

//   function findPlaceholder(selectedValue) {
//     for (let i = 0; i < urlOptions.length; i++) {
//       if (urlOptions[i].value === selectedValue) {
//         setPlaceHolder(urlOptions[i].placeholder);
//       }
//     }
//   }

  //this is used to facilitate Enter key press
  const handleKeyPress = (event) => {
    if (!inputError) {
      if (event.key === "Enter") {
        handleLoadUrl();
      }
    }
  };

  const handleOptionChange = (e) => {
    const value = e.target.value;
    setSelectedOption(value);
    findPlaceholder(value);
  };

  const handleLoadUrl = () => {
    if (word) {
      // let encodedWord = decodeURIComponent(word.toLowerCase()).split(' ').join('-');
      let encodedWord = "";

      try {
        encodedWord = decodeURIComponent(
          word.toLowerCase().replace(/\?/g, "_")
        );
      } catch (error) {
        // Handle the error
        // You might choose to assign a default value in case of an error
        encodedWord = "";
      }

      window.location.href = "/search/" + encodedWord;
    }
  };

  function sanitizeInput(input) {
    // Regular expression to match letters (a-z, A-Z), apostrophes, hyphens, spaces, and question marks
    //let regex = /^[a-zA-Z' -?]+$/;
    // let regex = /^[a-zA-Z' \-?]+$/;
    let regex = /^[a-zA-Z' \-?0-9]+$/;

    if (input.length > 0) {
      // Check if the input matches the regular expression
      if (regex.test(input)) {
        if (input.includes("?")) {
          const questionMarks = (input.match(/\?/g) || []).length;
          if (questionMarks <= 3) {
            return input;
          } else {
            // return "Only 3 Wildcards are allowed";
            return null;
          }
        }
        return input; // Return the input if it's valid
      } else {
        //  return "Enter a Valid Word"; // Return null if the input is invalid
        return null;
      }
    }
  }

  return (
      <div className="grid md:grid-cols-6 w-[100%] md:w-[60%] m-auto p-2">
        <div className="md:col-span-6 grid border-2 md:rounded-r-lg grid-cols-6">
        <input
          className={
            inputError
              ? "px-2 py-2 text-lg col-span-5"
              : "text-lg px-2 py-2 col-span-5"
          }
          type="text"
          placeholder={placeholder}
          onChange={(e) => {
            let isInputGood = sanitizeInput(e.target.value);
            if (isInputGood !== null) {
              setWord(e.target.value);
              setInputError(false);
            } else setInputError(true);
          }}
          onKeyPress={handleKeyPress}
        />
        <Button
          variant="default"
          size="lg"
          onClick={handleLoadUrl}
          className="cursor-pointer text-lg p-2 md:rounded-l-none rounded-none col-span-1 w-[100%] h-[100%]"
          disabled={inputError ? true : false}
        >
          Search
        </Button>
        </div>
      </div>
  );
};

export default SearchBarNav;
