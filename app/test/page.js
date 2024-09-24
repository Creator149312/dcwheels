'use client'
import React, { useRef } from 'react';
import ContentEditable from 'react-contenteditable';

const MyInputComponent = () => {
  // const [html, setHtml] = useState('This text can be edited directly in the browser.');
  const editableDivRef = useRef(null);

  const html = useRef('');

  const handleInputChange = (event) => {
    if (event.clipboardData && event.clipboardData.files.length > 0) {
      // Handle image paste
      const file = event.clipboardData.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        const imageUrl = reader.result;
        const newHtml = html + `\n<div><img src="${imageUrl}" className="w-20"></div>`;
        html.current = newHtml;
      };

      reader.readAsDataURL(file);
    } else {
      // Handle regular text input
      html.current = event.target.value;
    }

    const masterDiv = document.querySelector('.segmentsDiv');
    const contentDivs = masterDiv.querySelectorAll('div');
    const textArray = [];

    contentDivs.forEach(div => {
      // Extract text content (excluding leading/trailing whitespace)
      const text = div.innerHTML;
      // Add trimmed text to the array
      if(text !== '<br>')
      textArray.push(text);
    });

    console.log(textArray);

  };


  return (
    <ContentEditable
      html={html.current}
      onChange={handleInputChange}
      onPaste={handleInputChange}
      ref={editableDivRef}
      className='segmentsDiv'
    />
  );
};

export default MyInputComponent;