'use client'
import React, { useState, useEffect, useRef } from 'react';

const ContentEditableDiv = () => {
  const [text, setText] = useState('This text can be edited directly in the browser.');
  const editableDivRef = useRef(null);

  useEffect(() => {
    const editableDiv = editableDivRef.current;

    editableDiv.addEventListener('paste', (event) => {
      if (event.clipboardData.files.length > 0) {
        // Handle image paste
        const file = event.clipboardData.files[0];
        const reader = new FileReader();

        reader.onload = () => {
          const imageUrl = reader.result;
          const newText = text + `\n<img src="${imageUrl}" width="50" height="50">`;
          setText(newText);
        };

        reader.readAsDataURL(file);
      }
    });

    editableDiv.addEventListener('input', (event) => {
      const newText = editableDiv.textContent;
      setText(newText);

      
      // Manually put cursor at the end of the text
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editableDiv);   

      range.collapse(false);   

      selection.removeAllRanges();
      selection.addRange(range);
    });

    editableDiv.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        // Handle Enter key press
        event.preventDefault(); // Prevent default behavior
        const newText = text + '\n';
        setText(newText);

           // Manually put cursor at the end of the text
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editableDiv);   

      range.collapse(false);   

      selection.removeAllRanges();
      selection.addRange(range);
      }
    });
  }, []);

  return (
    <div ref={editableDivRef} contentEditable="true">{text}</div>
  );
};

export default ContentEditableDiv;