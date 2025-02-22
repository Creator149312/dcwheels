export function replaceDashWithUnderscore(str) {
  if (str.length === 0) return str;
  return str.replace(/-/g, "_");
}

export function replaceUnderscoreWithDash(str) {
  if (str.length === 0) return str;
  return str.replace(/_/g, "-");
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
  console.log("SEG data inside Prepare Data = ", segData);
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
