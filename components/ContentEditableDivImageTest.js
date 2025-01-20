"use client";
import React, { useState, useRef, useContext } from "react";
import ContentEditable from "react-contenteditable";
import { Button } from "./ui/button";
import { SegmentsContext } from "@app/SegmentsContext";
import { FaFileImage, FaRandom, FaSortAlphaDown } from "react-icons/fa";
import imageCompression from "browser-image-compression";

const ContentEditableDivImageTest = ({ segData, setSegData }) => {
  const { html } = useContext(SegmentsContext);
  const [imageSrc, setImageSrc] = useState(null);
  const editableDivRef = useRef(null);
  let error = "";

  //this is used to set initial Value of segData to html.current
  html.current =
    html.current === `<div>TestData</div>`
      ? segData.map((perSegData) => `<div>${perSegData}</div>`).join("")
      : html.current;

  // useEffect(() => {
  //   html.current = segData
  //     .map((perSegData) => `<div>${perSegData}</div>`)
  //     .join("");
  // }, [segData]);

  const handleInputChange = (event) => {
    html.current = event.target.value;

    // console.log("HTML TextData", html.current);
    setSegData(refactorDataFromHTML(html));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (event) => {
        setImageSrc(event.target.result);
        // const newHtml = `\n<div><img src="${event.target.result}" width='50' height='50'></div>`;
        // html.current = html.current + newHtml;
        const div = document.createElement("div");
        const img = document.createElement("img");
        img.src = event.target.result;
        img.width = "50";
        img.height = "50";
        div.appendChild(img);
        // console.log("Div = ", div);
        let masterDiv = document.getElementById("canvasDiv");
        masterDiv.appendChild(div);
        html.current = masterDiv.innerHTML;
        // console.log("HTML TextData", html.current);
        setSegData(refactorDataFromHTML(html));
      };

      reader.readAsDataURL(file);
    }
  };

  const handleImageUploadAsSegment = async (event) => {
    const maxWidth = 100;
    const imageFile = event.target.files[0];
    // console.log("originalFile instanceof Blob", imageFile instanceof Blob); // true
    // console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: maxWidth,
      useWebWorker: true,
    };
    try {
      const compressedFile = await imageCompression(imageFile, options);
      // console.log(
      //   "compressedFile instanceof Blob",
      //   compressedFile instanceof Blob
      // ); // true
      // console.log(
      //   `compressedFile size ${compressedFile.size / 1024 / 1024} MB`
      // ); // smaller than maxSizeMB

      //   await uploadToServer(compressedFile); // write your own logic
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Image = e.target.result;
        // console.log(base64Image);
        // This will be your image/jpeg;base64 string

        setImageSrc(base64Image);
        // const newHtml = `\n<div><img src="${event.target.result}" width='50' height='50'></div>`;
        // html.current = html.current + newHtml;
        const div = document.createElement("div");
        const img = document.createElement("img");
        img.src = e.target.result;
        img.width = "25";
        img.height = "37";
        div.appendChild(img);
        // console.log("Div = ", div);
        let masterDiv = document.getElementById("canvasDiv");
        masterDiv.appendChild(div);
        html.current = masterDiv.innerHTML;
        // console.log("HTML TextData", html.current);
        setSegData(refactorDataFromHTML(html));
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.log(error);
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();

    const pastedHtml = (event.originalEvent || event).clipboardData.getData(
      "text/html"
    );
    const pastedText = (event.originalEvent || event).clipboardData.getData(
      "text/plain"
    );

    const targetDiv = event.target;
    let extractedNodes = getAllTextNodesAndImagesFromHTML(pastedHtml);
    let masterDiv = document.getElementById("canvasDiv");

    if (extractedNodes.length > 0) {
      // Append child nodes to the target div
      processNodes(extractedNodes, masterDiv);
      // console.log("Extracted Nodes and Dom Creation Done");
    } else if (pastedText) {
      // Create a text node and append it
      const pastedTextinArray = pastedText.split("\n");
      for (const txtNodeContent of pastedTextinArray) {
        const wrapperDiv = document.createElement("div");
        wrapperDiv.appendChild(document.createTextNode(txtNodeContent));
        masterDiv.appendChild(wrapperDiv);
      }
    }

    html.current = masterDiv.innerHTML;
    setSegData(refactorDataFromHTML(masterDiv.innerHTML));
  };

  const shuffleSegments = () => {
    let masterDiv = document.getElementById("canvasDiv");
    const divs = Array.from(masterDiv.children);
    divs.sort(() => Math.random() - 0.5);
    divs.forEach((div) => masterDiv.appendChild(div));
    html.current = masterDiv.innerHTML;

    setSegData(refactorDataFromHTML(masterDiv.innerHTML));
  };

  const sortSegments = () => {
    let masterDiv = document.getElementById("canvasDiv");
    const divs = Array.from(masterDiv.children);

    divs.sort((a, b) => {
      const aHasImage = a.querySelector("img") !== null;
      const bHasImage = b.querySelector("img") !== null;

      if (aHasImage && !bHasImage) {
        return -1; // a has image, b doesn't: a goes first
      } else if (!aHasImage && bHasImage) {
        return 1; // a doesn't have image, b does: b goes first
      } else {
        return a.innerText.localeCompare(b.innerText);
      }
    });

    divs.forEach((div) => masterDiv.appendChild(div));
    html.current = masterDiv.innerHTML;

    setSegData(refactorDataFromHTML(masterDiv.innerHTML));
  };

  return (
    <>
      <div className="flex flex-wrap">
        <div className="flex gap-4">
          <label
            htmlFor="image-upload"
            className="my-1 py-0 h-7 px-2 text-xs cursor-pointer mx-1 bg-primary text-primary-foreground hover:bg-primary/90 dark:text-black p-3 rounded-md focus:outline-none flex items-center"
          >
            {error ? (
              <span className="text-red-500">{error}</span>
            ) : (
              <>
                Add Image
                <FaFileImage size={20} className="ml-1" />
              </>
            )}
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/jpeg, image/png, image/jpg, image/gif, image/webp"
            onChange={handleImageUploadAsSegment}
            className="hidden"
          />
        </div>

        <Button
          onClick={shuffleSegments}
          className="mx-1 my-1 py-0 h-7 text-xs px-2"
        >
          Shuffle <FaRandom size={20} className="ml-1" />
        </Button>
        <Button
          onClick={sortSegments}
          className="mx-1 py-0 px-2 my-1 h-7 text-xs"
        >
          Sort <FaSortAlphaDown size={20} className="ml-1" />
        </Button>
      </div>
      <ContentEditable
        html={html.current}
        onChange={handleInputChange}
        onPaste={handlePaste}
        disabled={false}
        ref={editableDivRef}
        className="segmentsDiv w-full overflow-y-scroll md:h-72 h-64 rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        id="canvasDiv"
      />
    </>
  );
};
export { refactorDataFromHTML };
export default ContentEditableDivImageTest;

function refactorDataFromHTML(html) {
  if (html.current === "") {
    return ["Add your text here"];
  } else {
    const masterDiv = document.querySelector(".segmentsDiv");
    const contentDivs = masterDiv.querySelectorAll("div");
    const textArray = [];

    contentDivs.forEach((div) => {
      let text = "";
      if (div.innerHTML.includes("<img")) {
        text = div.innerHTML; // Remove all HTML tags
      } else {
        text = div.innerText;
      }

      // Add trimmed text to the array
      if (div.innerHTML !== "<br>" && text.length !== 0) textArray.push(text);
    });

    return textArray;
  }
}

// function getAllTextNodes(element) {
//   const textNodes = [];
//   const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);

//   let node;
//   while (node = walker.nextNode()) {
//     textNodes.push(node);
//   }

//   return textNodes;
// }

function getAllTextNodesAndImagesFromHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return getAllTextNodesAndImages(doc.body);
}

function getAllTextNodesAndImages(element) {
  const nodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    null,
    false
  );

  let node;
  while ((node = walker.nextNode())) {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      node.tagName.toLowerCase() === "img"
    ) {
      nodes.push(node);
    } else if (
      node.nodeType === Node.TEXT_NODE &&
      node.textContent.trim() !== "" &&
      !node.textContent.includes("\n")
    ) {
      nodes.push(node);
    }
  }

  return nodes;
}

function processNodes(nodes, editorDiv) {
  const processedNodes = [];

  // for (const node of nodes) {
  //   if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'img') {
  //     processedNodes.push(`<div><img src="${node.src}" width="50" height="50"></div>`);
  //   } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '' && !node.textContent.includes('\n')) {
  //     processedNodes.push(`<div>${node.textContent}</div>`);
  //   }
  // }

  for (const childNode of nodes) {
    const wrapperDiv = document.createElement("div");
    if (
      childNode.nodeType === Node.ELEMENT_NODE &&
      childNode.tagName.toLowerCase() === "img"
    ) {
      wrapperDiv.appendChild(childNode.cloneNode(true));
    } else if (
      childNode.nodeType === Node.TEXT_NODE &&
      childNode.textContent.trim() !== ""
    ) {
      wrapperDiv.appendChild(document.createTextNode(childNode.textContent));
    }
    editorDiv.appendChild(wrapperDiv);
  }

  // return processedNodes;
}

// function extractTextAndImageNodes(element, wrapperTag) {
//   const wrapper = document.createElement(wrapperTag);

//   function traverse(node) {
//     if (node.nodeType === Node.TEXT_NODE) {
//       const newWrapper = document.createElement(wrapperTag);
//       newWrapper.textContent = node.textContent;
//       node.parentNode.replaceChild(newWrapper, node);
//     } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'img') {
//       wrapper.appendChild(node.cloneNode(true));
//       node.parentNode.replaceChild(wrapper, node);
//     } else if (node.nodeType === Node.ELEMENT_NODE) {
//       node.childNodes.forEach(traverse);
//     }
//   }

//   traverse(element);
//   return wrapper.outerHTML;
// }

// function wrapTextNodes(element) {
//   let htmlString = "";

//   function traverse(node) {
//     if (node.nodeType === Node.TEXT_NODE) {
//       console.log("Node Value =", node.nodeValue);
//       htmlString += `<div>${node.nodeValue}</div>`;
//     } else if (node.nodeType === Node.ELEMENT_NODE) {
//       node.childNodes.forEach(traverse);
//     }
//   }

//   traverse(element);
//   return htmlString;
// }

// function wrapLines(html) {
//   const textContent = document.getElementById('canvasDiv').textContent;
//   console.log("TExt Content", textContent);
//   const lines = textContent.split('\n');

//   html.current = lines.map(line => `<div>${line}</div>`).join('');
//   return html;
// }
