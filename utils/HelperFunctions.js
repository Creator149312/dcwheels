export function replaceDashWithUnderscore(str) {
  if (str.length === 0) return str;
  return str.replace(/-/g, "_");
}

export function replaceUnderscoreWithDash(str) {
  if (str.length === 0) return str;
  return str.replace(/_/g, "-");
}

export function slugify(str) {
  return str
    .normalize("NFKD") // Normalize accented characters (e.g. é → e)
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase()
    .replace(/&/g, "and") // Replace common symbols
    .replace(/@/g, "at")
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumerics with hyphen
    .replace(/^-+|-+$/g, "") // Trim leading/trailing hyphens
    .replace(/--+/g, "-"); // Collapse multiple hyphens
}


export function replaceUnderscoreWithSpace(str) {
  if (str.length === 0) return str;
  return str.replace(/_/g, " ");
}

export const prepareData = (
  segData,
  colData,
  maxlengthOfSegmentText,
  advOptions
) => {
  const result = [];
  const colDataLength = colData.length;
  for (let i = 0; i < segData.length; i++) {
    const seg = segData[i].text;
    const colIndex = i % colDataLength;
    const col = colData[colIndex];

    if (advOptions) {
      if (seg.includes("<img")) {
        const regex = /src="([^"]+)"/;
        const imgUrl = regex.exec(seg)[1];
        if (segData[i].visible) {
          result.push({
            option: seg,
            style: { backgroundColor: segData[i].color },
            image: {
              uri: imgUrl,
              sizeMultiplier: getImageSizeMultiplierValue(segData.length),
            },
            optionSize: Number(segData[i].weight),
          });
        }
      } else {
        if (segData[i].visible) {
          result.push({
            option:
              seg.length > maxlengthOfSegmentText
                ? seg.substring(0, maxlengthOfSegmentText - 2) + ".."
                : seg.substring(0, maxlengthOfSegmentText),
            style: { backgroundColor: segData[i].color },
            optionSize: Number(segData[i].weight),
          });
        }
      }
    } else {
      if (seg.includes("<img")) {
        const regex = /src="([^"]+)"/;
        const imgUrl = regex.exec(seg)[1];
        result.push({
          option: seg,
          style: { backgroundColor: col },
          image: {
            uri: imgUrl,
            sizeMultiplier: getImageSizeMultiplierValue(segData.length),
          },
          optionSize: 1,
        });
      } else {
        result.push({
          option:
            seg.length > maxlengthOfSegmentText
              ? seg.substring(0, maxlengthOfSegmentText - 2) + ".."
              : seg.substring(0, maxlengthOfSegmentText),
          style: { backgroundColor: col },
          optionSize: 1,
        });
      }
    }
  }

  return result.length > 0
    ? result
    : [
        {
          option: "Options",
          style: { backgroundColor: "#EE4040" },
        },
      ];
};

export const getImageSizeMultiplierValue = (x) => {
  const startValue = 1; // initial value
  const endValue = 0; // value it approaches but never reaches
  const decayRate = 0.05; // adjust this rate as needed
  return endValue + (startValue - endValue) * Math.exp(-decayRate * (x - 1));
};

export function isImageElement(str) {
  // Define the regex pattern to match an <img /> element and capture the src value
  const imgTagPattern =
    /^<img\s+([^>]*\s+)?src\s*=\s*(['"])(.*?)\2\s*([^>]*)>$/i;

  // Test the string against the regex pattern
  const match = str.match(imgTagPattern);

  if (match) {
    return { isValid: true, src: match[3] };
  }

  return { isValid: false, src: null };
}

export const ensureArrayOfObjects = (arr) => {
  if (!Array.isArray(arr)) {
    return []; // Or handle the error as you see fit
  }

  return arr
    .map((item) => {
      if (typeof item === "string") {
        return { text: item };
      } else if (
        typeof item === "object" &&
        item !== null &&
        typeof item.text === "string"
      ) {
        return item; // It's already in the correct format
      } else {
        return null; // Or handle the error as you see fit for invalid items
      }
    })
    .filter((item) => item !== null); // Remove any invalid items
};

//get the wheel data storage in browser localstorage
export const getWheelData = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    // console.log("Fetching Wheel Object....");
    const data = window.localStorage.getItem("SpinpapaWheel");
    return data ? JSON.parse(data) : null;
  } else {
    // console.log("Local Storage or Window Object Now available");
    return null;
  }
};

export const calculateMaxLengthOfText = (segData) => {
  return Math.min(
    segData.reduce((acc, segment) => {
      return segment.text.length > acc.length ? segment.text : acc;
    }, "").length,
    14
  );
};

export const segmentsToHTMLTxt = (segmentsData) => {
  return segmentsData
    .map((perSegData) => `<div>${perSegData.text}</div>`)
    .join("");
};

export const calculateFontSizeOfText = (maxlengthOfSegmentText, segData) => {
  let factor = 0.1;
  // let calculatedFontSize = Math.min(
  //   (16 * Math.PI * Math.PI) / Math.max(segData.length, maxlengthOfSegmentText),
  //   36
  // );

  // let calculatedFontSize = Math.min(
  //   (26 * Math.PI * Math.PI) / Math.max(segData.length, maxlengthOfSegmentText),
  //   38
  // );
  // return calculatedFontSize;

  // return (36 * (101 - segData.length) * (17 - maxlengthOfSegmentText)) / (100 * 15);
  // return 60 * Math.PI / Math.max(maxlengthOfSegmentText, segData.length);
  // let txtSize = Math.min(
  //   (40 * Math.PI * Math.PI) / (1.8 * maxlengthOfSegmentText + segData.length),
  //   40
  // );

  let txtSize = Math.min(
    (40 * Math.PI * Math.PI) /
      (Math.pow(maxlengthOfSegmentText, 1.3) + Math.pow(segData.length, 0.7)),
    40
  );
  return txtSize;
};

/**
 * ALL Functions related to Segments
 * @param {*} entries
 * @param {*} newSegment
 * @returns
 */
export function addSegment(entries, newSegment) {
  return [...entries, newSegment];
}

export function updateSegment(entries, index, updatedSegment) {
  return [
    ...entries.slice(0, index),
    updatedSegment,
    ...entries.slice(index + 1),
  ];
}

export function deleteSegment(entries, index) {
  return [...entries.slice(0, index), ...entries.slice(index + 1)];
}

export function duplicateSegment(entries, index) {
  const newSegment = { ...entries[index] };
  return [...entries, newSegment];
}

export function sortSegments(entries, key, order = "asc") {
  return [...entries].sort((a, b) => {
    if (order === "asc") {
      return a[key] > b[key] ? 1 : -1;
    } else {
      return a[key] < b[key] ? 1 : -1;
    }
  });
}

export function shuffleSegments(entries) {
  return [...entries].sort(() => Math.random() - 0.5);
}

/**
 * All Quiz related Helper Functions
 */

export const generateRandomizedTrueOrFalseQuestions = (wordObjects) => {
  const questionData = [];
  const usedPairs = new Set(); // To keep track of the pairs already used
  const maxQuestions = wordObjects.length;

  // We will generate a maximum of 'maxQuestions' questions
  while (questionData.length < maxQuestions) {
    // Randomly shuffle the wordObjects array to randomize the pairing
    const shuffledWordObjects = [...wordObjects].sort(
      () => Math.random() - 0.5
    );

    // Pick the first word and data from the shuffled array
    const word = shuffledWordObjects[0].word;
    const correctWordData = shuffledWordObjects[0].wordData;

    // Randomly pick a wrong wordData from other items
    let wrongWordData;
    for (let i = 1; i < shuffledWordObjects.length; i++) {
      if (shuffledWordObjects[i].wordData !== correctWordData) {
        wrongWordData = shuffledWordObjects[i].wordData;
        break;
      }
    }

    // Ensure we have a valid wrong option
    if (!wrongWordData) {
      continue;
    }

    // Randomly determine if the question will be True or False
    const isCorrect = Math.random() > 0.5; // 50% chance of being True or False
    const selectedWordData = isCorrect ? correctWordData : wrongWordData;

    // Ensure the question is unique
    const questionKey = `${word}-${selectedWordData}`;
    if (usedPairs.has(questionKey)) {
      continue; // If we've already used this pair, skip to the next one
    }

    // Add the question data to the result
    questionData.push({
      question: `Is '${word}' associated with '${selectedWordData}'?`,
      options: ["True", "False"],
      correctAnswer: isCorrect ? "True" : "False",
    });

    // Mark this pair as used
    usedPairs.add(questionKey);
  }

  return questionData;
};

export const generateRandomizedTrueOrFalseQuestionsBasic = (wordObjects) => {
  const questionData = [];

  // We will generate exactly 'wordObjects.length' questions
  for (let i = 0; i < wordObjects.length; i++) {
    // Pick the current wordObject
    const wordObject = wordObjects[i];
    const word = wordObject.word;

    // Randomly pick another wordObject from the list
    const randomIndex = Math.floor(Math.random() * wordObjects.length);
    const randomWordObject = wordObjects[randomIndex];
    const randomWordData = randomWordObject.wordData;

    // Check if wordData is an image (starts with "data:image/")
    const isImage = randomWordData.startsWith("data:image/");

    // Determine if the answer is True or False
    const correctAnswer = wordObject.wordData === randomWordData;

    // Prepare the question data
    const question = {
      title: `Is '${word}' associated with '${
        isImage
          ? "<img src='" + randomWordData + "' alt='image' max-width='150px'/>"
          : randomWordData
      }'?`,
      type: "TF", // True/False question type
      options: ["True", "False"],
      answer: correctAnswer ? "True" : "False",
      coins: 5, // Default coin reward
      isImage: isImage, // Add flag for image handling
    };

    questionData.push(question);
  }

  return questionData;
};

export const generateRandomizedMCQsBasic = (items) => {
  return items.map((item) => {
    // Extract the word and its associated wordData
    const { word, wordData } = item;

    // Check if wordData is an image (starts with "data:image/")
    const isImage = wordData.startsWith("data:image/");

    // Use wordData as a possible option for the correct answer, we will generate a few random options
    const allOptions = generateRandomOptions(
      items,
      `${
        isImage
          ? "<img src='" + wordData + "' alt='image' width='50px'/>"
          : wordData
      }`
    );
    // Randomize the options to ensure the correct answer is at a random position
    const options = shuffle(allOptions);

    return {
      title: `What is the meaning of ${word}?`, // Generate the question dynamically using the word
      type: "MCQ", // Question type
      options: options, // Randomized options
      answer: wordData, // Correct answer
      coins: 5, // Default coin reward
      isImage, // Default for image handling (you can modify it as needed)
    };
  });
};

// Helper function to generate random options (to create incorrect answers)
export const generateRandomOptionsArray = (items, correctWordData) => {
  const randomOptions = [];
  // Create a pool of random words to generate incorrect answers
  while (randomOptions.length < 3) {
    const randomItem = items[Math.floor(Math.random() * items.length)];
    const randomWordData = randomItem.wordData
      ? randomItem.wordData
      : randomOptions.length;

    // Avoid duplicating the correct answer
    if (
      randomWordData !== correctWordData &&
      !randomOptions.includes(randomWordData)
    ) {
      // Check if wordData is an image (starts with "data:image/")
      const isImage = randomWordData.startsWith("data:image/");
      randomOptions.push(
        `${
          isImage
            ? "<img src='" + randomWordData + "' alt='image' width='50px'/>"
            : randomWordData
        }`
      );
    }
  }
  return randomOptions;
};

export const generateRandomOptions = (items, correctWordData) => {
  const randomOptions = new Set();
  randomOptions.add(correctWordData);

  // Create a pool of random words to generate incorrect answers
  while (randomOptions.size < 4) {
    const randomItem = items[Math.floor(Math.random() * items.length)];
    const randomWordData = randomItem.wordData
      ? randomItem.wordData
      : randomOptions.size;

    // Avoid duplicating the correct answer
    if (
      randomWordData !== correctWordData &&
      !Array.from(randomOptions).includes(randomWordData)
    ) {
      // Check if wordData is an image (starts with "data:image/")
      const isImage = randomWordData.startsWith("data:image/");
      randomOptions.add(
        `${
          isImage
            ? "<img src='" + randomWordData + "' alt='image' width='50px'/>"
            : randomWordData
        }`
      );
    }
  }

  return Array.from(randomOptions);
};

// Utility function to shuffle an array
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

export function formatWheelData(inputData) {
  const formattedData = {};

  // Loop through the keys of the input JSON object (such as 'writing_prompts_wheel')
  Object.keys(inputData).forEach((key) => {
    const wheelData = inputData[key];

    // Format the wheel data into the desired structure
    formattedData[key] = {
      title: wheelData.title,
      description: wheelData.description,
      heading: wheelData.heading,
      category: wheelData.category,
      content: wheelData.content.map((contentItem) => ({
        type: contentItem.type,
        text: contentItem.text,
      })),
      segments: wheelData.segments,
    };
  });

  return formattedData;
}

//All functions related to Coins Management
// utils.js

export const handleAction = ({
  actionType,
  amount,
  coins,
  setCoins,
  event,
}) => {
  // Check if the amount to add or use is valid
  const numCoins = parseInt(amount, 10);
  if (
    isNaN(numCoins) ||
    numCoins < 1 ||
    (actionType === "use" && numCoins > coins)
  ) {
    alert(
      `Please enter a valid number of coins to ${
        actionType === "add" ? "add" : "use"
      }.`
    );
    return false; // Indicate failure
  }

  // Define the core logic for adding and using coins
  if (actionType === "add") {
    // Add coins logic
    const newCoinCount = coins + numCoins;
    setCoins(newCoinCount);
    const coinElements = createCoinElements(numCoins, event); // Assuming createCoinElements is available in scope
    animateCoins(
      coinElements,
      { x: window.innerWidth - 50, y: 50 },
      { x: event.clientX, y: event.clientY }
    );
    return true; // Indicate success
  }

  if (actionType === "use") {
    // Use coins logic
    if (coins >= numCoins) {
      const newCoinCount = coins - numCoins;
      setCoins(newCoinCount);
      const coinElements = createCoinElements(numCoins, event); // Assuming createCoinElements is available in scope
      animateCoins(
        coinElements,
        { x: event.clientX, y: event.clientY },
        { x: window.innerWidth - 50, y: 50 }
      );
      return true; // Indicate success
    } else {
      alert("Not enough coins to use.");
      return false; // Indicate failure
    }
  }

  // After updating the local state and animating, sync to localStorage or Redis
  if (newCoinCount !== undefined) {
    // Store coins in LocalStorage (for client-side)
    storeCoinsInStorage(newCoinCount);

    // If using Redis (for server-side), you would update Redis here
    // await storeCoinsInRedis(userId, newCoinCount); // Uncomment for Redis

    // Sync coins to the database (e.g., using an API)
    // const success = await updateCoinsInDatabase(userId, newCoinCount);
    // if (!success) {
    //   alert("Failed to update coins in the database.");
    //   return false; // Indicate failure
    // }
  }

  return true; // Default return if something goes wrong
};

// Utility for creating coin elements (ensure to include this function in your utils file or elsewhere in your project)
export const createCoinElements = (count, event) => {
  const coins = [];
  for (let i = 0; i < count; i++) {
    const coin = document.createElement("div");
    coin.classList.add("coin");
    coin.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24"><path fill="gold" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" /></svg>`;
    // Add coin to container
    document.body.appendChild(coin); // Add to a container of your choice
    coins.push(coin);
  }
  return coins;
};

export const animateCoins = (coins, from, to) => {
  coins.forEach((coin, index) => {
    coin.style.position = "absolute";
    coin.style.left = `${from.x}px`;
    coin.style.top = `${from.y}px`;
    coin.style.transition = "all 0.5s ease-in-out";

    setTimeout(() => {
      coin.style.left = `${to.x}px`;
      coin.style.top = `${to.y}px`;
    }, 10 * index);

    setTimeout(() => {
      coin.remove();
    }, 300);
  });
};

// Fetch coins from LocalStorage (or database)
export const fetchCoinsFromStorage = () => {
  const storedCoins = localStorage?.getItem("coins");
  if (storedCoins) {
    return parseInt(storedCoins, 10); // Parse the coin value from localStorage
  }
  return 0; // Default to 0 if no coins are stored
};

// Store coins in LocalStorage after fetching from the database or updating
export const storeCoinsInStorage = (coins) => {
  localStorage.setItem("coins", coins); // Store the updated coin count
};
