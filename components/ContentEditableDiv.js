'use client'
import React, { useEffect, useState, useRef } from 'react';
import ContentEditable from 'react-contenteditable';

const ContentEditableDiv = ({ segData, setSegData }) => {

  const [imageSrc, setImageSrc] = useState(null);
  const editableDivRef = useRef(null);
  const html = useRef(`<div> This is a paragraph.</div>`);

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

    console.log("HTML TextData", html.current);
    setSegData(refactorDataFromHTML(html));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (event) => {
        setImageSrc(event.target.result);
        const newHtml = `<div><img src="${event.target.result}" width='50' height='50'></div>`;
        html.current = html.current + newHtml;
        // const div = document.createElement('div');
        // const img = document.createElement('img');
        // img.src = event.target.result;
        // img.width = '50';
        // img.height = '50';
        // div.appendChild(img);
        // console.log('Div = ', div);
        // document.getElementById('canvasDiv').appendChild(div);
      };

      reader.readAsDataURL(file);
    }
  };

  // const handleOnPaste = (event) =>{
  //   console.log("Clipboard Data = ", event.clipboardData.getData('text/plain'));
  //   let copiedTextArray = event.clipboardData.getData('text/plain').split('\n');
  //   html.current = html.current + copiedTextArray.map(element => `<div>${element}</div>`).join('');
  //   getLinesFromTextEditor()
  //   setSegData(refactorDataFromHTML(html));
  // }

  // const handlePaste = (event) =>{
  //   event.preventDefault();
  //   const pastedHtml = (event.originalEvent || event).clipboardData.getData('text/html');

  //   const parser = new DOMParser();
  //   const doc = parser.parseFromString(pastedHtml, 'text/html');

  //   // Extract images and plain text
  //   const images = Array.from(doc.querySelectorAll('img'));
  //   const texts = doc.body.innerText.split('\n');

  //   console.log("Copied Text", texts);

  //   // Append images and text nodes
  //   const div = event.target;
  //   for (const image of images) {
  //     div.appendChild(image.cloneNode(true)); // Clone for safety
  //   }
  //   for (const txt of texts) {
  //     div.appendChild(document.createTextNode(txt)); //safety
  //   }
  // }

  const handlePaste = (event) => {
    event.preventDefault();

    const pastedHtml = (event.originalEvent || event).clipboardData.getData('text/html');
    const pastedText = (event.originalEvent || event).clipboardData.getData('text/plain');

    const targetDiv = event.target;
    let extractedNodes = getAllTextNodesAndImagesFromHTML(pastedHtml);
    let masterDiv = document.getElementById('canvasDiv');

    if (extractedNodes.length > 0) {
      // Append child nodes to the target div
      processNodes(extractedNodes, masterDiv);
      console.log("Extracted Nodes and Dom Creation Done");
    } else if (pastedText) {
      // Create a text node and append it
      const pastedTextinArray = pastedText.split('\n');
      for (const txtNodeContent of pastedTextinArray) {
        const wrapperDiv = document.createElement('div');
        wrapperDiv.appendChild(document.createTextNode(txtNodeContent));
        masterDiv.appendChild(wrapperDiv);
      }
    }
  }

  // const handleKeyUp = (event) => {
  //   if (event.key === 'Enter') {
  //     html.current = html.current + "\n";
  //   } else {
  //     html.current = processNodes(getAllTextNodesAndImagesFromHTML(html.current)).join('');
  //   }
  //   setSegData(refactorDataFromHTML(html));
  // }

  useEffect(() => {
    setSegData(refactorDataFromHTML(html));
  }, [imageSrc]);

  return (<>
    <div>
      <input type="file" onChange={handleImageUpload} />
    </div>
    <ContentEditable
      html={html.current}
      onChange={handleInputChange}
      // onKeyUp={handleKeyUp}
      onPaste={handlePaste}
      disabled={false}
      ref={editableDivRef}
      className='segmentsDiv w-full h-5/6 shadow'
      id='canvasDiv'
    />
  </>
  );
};

export default ContentEditableDiv;


function refactorDataFromHTML(html) {
  if (html.current === '') {
    return ['Add your text here'];
  } else {
    const masterDiv = document.querySelector('.segmentsDiv');
    const contentDivs = masterDiv.querySelectorAll('div');
    const textArray = [];

    contentDivs.forEach(div => {
      let text = '';
      if (div.innerHTML.includes('<img')) {
        text = div.innerHTML; // Remove all HTML tags
      } else {
        text = div.innerText;
      }

      // Add trimmed text to the array
      if (div.innerHTML !== '<br>' && text.length !== 0)
        textArray.push(text);
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
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false);

  let node;
  while (node = walker.nextNode()) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'img') {
      nodes.push(node);
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '' && !node.textContent.includes('\n')) {
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
    const wrapperDiv = document.createElement('div');
    if (childNode.nodeType === Node.ELEMENT_NODE && childNode.tagName.toLowerCase() === 'img') {
      wrapperDiv.appendChild(childNode.cloneNode(true));
    } else if (childNode.nodeType === Node.TEXT_NODE && childNode.textContent.trim() !== '') {
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


