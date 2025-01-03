"use client";
import React, { useEffect, useState, useRef, useContext } from "react";
import ContentEditable from "react-contenteditable";
import { Button } from "./ui/button";
import { SegmentsContext } from "@app/SegmentsContext";
import {
  FaFileImage,
  FaFileUpload,
  FaPencilRuler,
  FaRandom,
  FaSortAlphaDown,
  FaUpload,
} from "react-icons/fa";
import Settings from "./Settings";

const ContentEditableDiv = ({
  segData,
  setSegData,
}) => {
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
    // if (event.clipboardData) {
    //   console.log("Clipboard Data = ", event.clipboardData.getData('text/plain'));
    //   if (event.clipboardData.files.length > 0) {
    //     // Handle image paste
    //     const file = event.clipboardData.files[0];
    //     const reader = new FileReader();

    //     reader.onload = () => {
    //       const imageUrl = reader.result;
    //       const newHtml = html + `\n<div><img src="${imageUrl}"></div>`;
    //       html.current = newHtml;
    //     };

    //     reader.readAsDataURL(file);
    //   }
    // }
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
            className="my-1 py-0 h-7 text-xs cursor-pointer mx-1 bg-primary text-primary-foreground hover:bg-primary/90 dark:text-black p-3 rounded-md focus:outline-none flex items-center"
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
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <Button
          onClick={shuffleSegments}
          className="mx-1 my-1 py-0 h-7 text-xs"
        >
          Shuffle <FaRandom size={20} className="ml-1" />
        </Button>
        <Button onClick={sortSegments} className="mx-1 py-0 my-1 h-7 text-xs">
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
export default ContentEditableDiv;

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
