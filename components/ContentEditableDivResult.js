"use client";
import React, { useEffect, useState, useRef, useContext } from "react";
import ContentEditable from "react-contenteditable";
import { Button } from "./ui/button";
import { SegmentsContext } from "@app/SegmentsContext";
import { FaSortAlphaDown, FaTrashAlt } from "react-icons/fa";

const ContentEditableDivResult = () => {
  const result = useRef("");
  const editableResultDivRef = useRef(null);
  const { resultList, setResultList } = useContext(SegmentsContext);

  result.current = resultList
    .map((resultElement) => `<div>${resultElement.text}</div>`)
    .join("");

  const sortSegments = () => {
    let masterDiv = document.getElementById("resultDiv");
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
    result.current = masterDiv.innerHTML;
  };

  const clearResultList = () => {
    setResultList([]);
    // result.current = '';
  };

  return (
    <>
      <div className="">
        <Button onClick={sortSegments} className="mx-1 py-0 my-1 h-7 text-xs">
          <FaSortAlphaDown size={20} />
        </Button>
        <Button
          onClick={clearResultList}
          className="mx-1 py-0 my-1 h-7 text-xs"
        >
         <FaTrashAlt size={20} />
        </Button>
      </div>
      <ContentEditable
        html={result.current}
        disabled={false}
        ref={editableResultDivRef}
        className="segmentsDiv w-full overflow-y-scroll md:h-72 h-64 rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        id="resultDiv"
      />
    </>
  );
};
export { refactorDataFromHTML };
export default ContentEditableDivResult;

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
