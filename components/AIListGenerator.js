'use client';

import React, { useState, useRef, useEffect } from 'react';
import apiConfig from '@utils/ApiUrlConfig';
import { Button } from './ui/button';

const AIListGenerator = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [wordCount, setWordCount] = useState(20);
  const [generatedWords, setGeneratedWords] = useState([]);
  const [textareaValue, setTextareaValue] = useState('');
  const modalRef = useRef(null);

  const handlePromptChange = (event) => {
    setPrompt(event.target.value);
  };

  const handleWordCountChange = (event) => {
    setWordCount(Number(event.target.value));
  };

  const generateWords = async () => {
    try {
      const response = await fetch(`${apiConfig.apiUrl}/ai/generate-words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, wordCount }),
      });

      const data = await response.json();
      setTextareaValue(data.words.join('\n'));
    } catch (error) {
      console.error('Error generating words:', error);
      // Handle error, e.g., display an error message to the user
    }
  };

  const handleUseWords = () => {
    setGeneratedWords(textareaValue.split('\n'));
    setIsModalOpen(false);
    setPrompt('');
    setWordCount(20);
    setTextareaValue('');
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setPrompt('');
    setWordCount(20);
    setTextareaValue('');
  };

  const handleUseAI = () => {
    setIsModalOpen(true);
  };

  const handleOutsideClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      setIsModalOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <div>
      <Button onClick={handleUseAI}>Use AI</Button>
      {isModalOpen && (
        <div 
          className="z-50 fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center" 
         
        >
          <div 
            ref={modalRef} 
            className="w-96 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md" 
          >
            <h2 className="text-lg font-semibold mb-4">OpenAI Word Generator</h2>
            <input
              type="text"
              placeholder="Enter your prompt"
              value={prompt}
              onChange={handlePromptChange}
              className="w-full border border-gray-300 rounded-md p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Number of words"
              value={wordCount}
              onChange={handleWordCountChange}
              className="w-full border border-gray-300 rounded-md p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={textareaValue}
              readOnly
              className="w-full border border-gray-300 rounded-md p-2 mb-4 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={generateWords} className="ml-2">
                Generate Words
              </Button>
              <Button variant="primary" onClick={handleUseWords} className="ml-2">
                Use Words
              </Button>
            </div>
          </div>
        </div>
      )}
      {generatedWords.length > 0 && (
        <ul>
          {generatedWords.map((word, index) => (
            <li key={index}>{word}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AIListGenerator;