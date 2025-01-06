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


export const prepareData = (segData, colData, maxlengthOfSegmentText) => {
  const result = [];
  const colDataLength = colData.length;
  for (let i = 0; i < segData.length; i++) {
    const seg = segData[i];
    const colIndex = i % colDataLength;
    const col = colData[colIndex];

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
          seg.substring(0, maxlengthOfSegmentText) +
          (seg.length > maxlengthOfSegmentText ? ".." : ""),
        style: { backgroundColor: col },
        optionSize: 1,
      });
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
