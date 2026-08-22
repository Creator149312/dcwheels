import { normalizeSegment, normalizeSegments } from "@utils/segmentUtils";

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
  advOptions,
  mysteryMode = false,
  safeImageDataUris = {}
) => {
  const result = [];
  if (!Array.isArray(segData) || segData.length === 0) {
    return [
      {
        option: "Options",
        style: { backgroundColor: "#EE4040" },
        optionSize: 1,
      },
    ];
  }

  const safeColData = Array.isArray(colData) && colData.length > 0
    ? colData
    : ["#EE4040", "#F0CF50", "#815CD1", "#3DA36E", "#E68C22", "#4185F4"];
  const colDataLength = safeColData.length;
  const maxLen = Math.max(1, Number(maxlengthOfSegmentText) || 14);

  for (let i = 0; i < segData.length; i++) {
    const rawSeg = segData[i];
    if (!rawSeg) continue;

    const rawText = typeof rawSeg.text === "string" ? rawSeg.text : "";
    const displaySegText = rawText || "Option " + (i + 1);
    const seg = mysteryMode ? "❓" : displaySegText;
    const colIndex = i % colDataLength;
    const col = safeColData[colIndex];
    const sliceColor = rawSeg.color || col;
    const weightVal = Number(rawSeg.weight);
    const safeWeight = Number.isFinite(weightVal) && weightVal > 0 ? weightVal : 1;

    if (advOptions) {
      const advImgUri = rawSeg.image
        ? rawSeg.image
        : typeof seg === "string" && seg.includes("<img")
        ? /src="([^"]+)"/.exec(seg)?.[1]
        : null;
      const resolvedImgUri = advImgUri
        ? (advImgUri in safeImageDataUris ? safeImageDataUris[advImgUri] : advImgUri)
        : null;

      if (resolvedImgUri && rawSeg.visible !== false) {
        result.push({
          option: seg,
          style: { backgroundColor: sliceColor },
          image: {
            uri: resolvedImgUri,
            sizeMultiplier: getImageSizeMultiplierValue(segData.length),
            landscape: rawSeg.imageLandscape || false,
          },
          optionSize: safeWeight,
        });
      } else {
        if (rawSeg.visible !== false) {
          result.push({
            option:
              seg.length > maxLen
                ? seg.substring(0, maxLen - 2) + ".."
                : seg.substring(0, maxLen),
            style: { backgroundColor: sliceColor },
            optionSize: safeWeight,
          });
        }
      }
    } else {
      const imgUri = mysteryMode
        ? null
        : rawSeg.image
        ? rawSeg.image
        : typeof seg === "string" && seg.includes("<img")
        ? /src="([^"]+)"/.exec(seg)?.[1]
        : null;
      const resolvedImgUri = imgUri
        ? (imgUri in safeImageDataUris ? safeImageDataUris[imgUri] : imgUri)
        : null;

      if (resolvedImgUri) {
        result.push({
          option: seg,
          style: { backgroundColor: sliceColor },
          image: {
            uri: resolvedImgUri,
            sizeMultiplier: getImageSizeMultiplierValue(segData.length),
            landscape: rawSeg.imageLandscape || false,
          },
          optionSize: 1,
        });
      } else {
        result.push({
          option:
            seg.length > maxLen
              ? seg.substring(0, maxLen - 2) + ".."
              : seg.substring(0, maxLen),
          style: { backgroundColor: sliceColor },
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
    .filter((item) => item !== null)
    .map((item) => normalizeSegment(item)); // Ensure id, type, payload
};

//get the wheel data storage in browser localstorage
export const getWheelData = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    const data = window.localStorage.getItem("SpinpapaWheel");
    if (!data) return null;
    const parsed = JSON.parse(data);
    // Normalize segments on read for backward compatibility
    if (parsed && Array.isArray(parsed.data)) {
      parsed.data = normalizeSegments(parsed.data);
    }
    return parsed;
  } else {
    return null;
  }
};

export const calculateMaxLengthOfText = (segData) => {
  if (!Array.isArray(segData) || segData.length === 0) return 1;
  const maxLen = segData.reduce((max, segment) => {
    const textLen = typeof segment?.text === "string" ? segment.text.length : 0;
    return textLen > max ? textLen : max;
  }, 0);
  return Math.max(1, Math.min(maxLen, 14));
};

export const segmentsToHTMLTxt = (segmentsData) => {
  return segmentsData
    .map((perSegData) => `<div>${perSegData.text}</div>`)
    .join("");
};

export const calculateFontSizeOfText = (maxlengthOfSegmentText, segData) => {
  const safeSegLen = Array.isArray(segData) ? segData.length : 0;
  const safeMaxLen = Math.max(1, Number(maxlengthOfSegmentText) || 1);
  const denominator = Math.pow(safeMaxLen, 1.3) + Math.pow(Math.max(1, safeSegLen), 0.7);

  let txtSize = Math.min((40 * Math.PI * Math.PI) / denominator, 40);
  return Number.isFinite(txtSize) && txtSize > 0 ? txtSize : 14;
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

export const timeAgo = (date) => {
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now - d) / 1000);

  // If older than 7 days, show absolute date (e.g., Jul 18)
  // This avoids "6 months ago" which can make a new site look "empty"
  if (seconds > 604800) {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  const intervals = {
    d: 86400,
    h: 3600,
    m: 60,
  };

  for (const [unit, value] of Object.entries(intervals)) {
    const count = Math.floor(seconds / value);
    if (count >= 1) {
      return `${count}${unit}`; // Minimalist: "2d", "5h", "12m"
    }
  }

  return "now";
};
