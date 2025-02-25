import React, { useState, useEffect } from 'react';

// Function to shuffle an array (used for randomization)
const shuffleArray = (array) => {
  let shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
};

const TrueOrFalseGeneratorAdv = ({ selectedList }) => {
  const [questionIndex, setQuestionIndex] = useState(0); // To track the current question index
  const [question, setQuestion] = useState(""); // To store the current question
  const [correctAnswer, setCorrectAnswer] = useState(false); // To store the correct answer for current question
  const [userAnswers, setUserAnswers] = useState([]); // To store the user's answers (True or False)
  const [correctCount, setCorrectCount] = useState(0); // To store the number of correct answers
  const [incorrectCount, setIncorrectCount] = useState(0); // To store the number of incorrect answers
  const [isFinished, setIsFinished] = useState(false); // To track if all questions are finished
  const [loading, setLoading] = useState(false); // To handle loading state

  // Function to generate a True or False question
  const generateTrueOrFalseQuestion = () => {
    if (!selectedList || selectedList.length === 0) return;

    setLoading(true); // Start loading state

    // Select the current wordDataObject based on the question index
    const currentWordData = selectedList[questionIndex];

    // Generate the question (using the word as the question)
    const questionText = `Is "${currentWordData.word}" associated with "${currentWordData.wordData}"?`;
    setQuestion(questionText);

    // Set the correct answer (we assume the data is always correct)
    setCorrectAnswer(true);

    setLoading(false); // End loading state
  };

  // Handle answer selection (True/False)
  const handleAnswer = (userAnswer) => {
    const isAnswerCorrect = userAnswer === correctAnswer;
    if (isAnswerCorrect) {
      setCorrectCount(correctCount + 1);
    } else {
      setIncorrectCount(incorrectCount + 1);
    }

    setUserAnswers([
      ...userAnswers,
      {
        question: question,
        answer: userAnswer ? "True" : "False",
        isCorrect: isAnswerCorrect,
      },
    ]);
  };

  // Move to next question or finish the quiz
  const nextQuestion = () => {
    if (questionIndex + 1 < selectedList.length) {
      setQuestionIndex(questionIndex + 1);
    } else {
      setIsFinished(true); // Set quiz as finished when all questions are answered
    }
  };

  // Only generate a question when the questionIndex changes
  useEffect(() => {
    if (!isFinished) {
      generateTrueOrFalseQuestion();
    }
  }, [questionIndex, isFinished, generateTrueOrFalseQuestion]);

  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        True or False Generator
      </h3>
      {loading ? (
        <div className="text-center text-gray-600 dark:text-gray-300">Loading...</div>
      ) : (
        <>
          {question && !isFinished && (
            <>
              <p className="mb-4 text-gray-700 dark:text-gray-300">{question}</p>
              <div className="space-y-3">
                <button
                  className="w-full p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 dark:bg-green-700 dark:hover:bg-green-600 dark:focus:ring-green-500"
                  onClick={() => {
                    handleAnswer(true); // True selected
                  }}
                >
                  True
                </button>
                <button
                  className="w-full p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 dark:bg-red-700 dark:hover:bg-red-600 dark:focus:ring-red-500"
                  onClick={() => {
                    handleAnswer(false); // False selected
                  }}
                >
                  False
                </button>
              </div>
              <button
                className="w-full mt-6 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-500"
                onClick={nextQuestion} // Move to the next question
              >
                Next Question
              </button>
            </>
          )}
          {isFinished && (
            <div className="text-center text-gray-600 dark:text-gray-300">
              <h4 className="font-semibold">Quiz Completed!</h4>
              <p>Total Questions: {selectedList.length}</p>
              <p>Correct Answers: {correctCount}</p>
              <p>Incorrect Answers: {incorrectCount}</p>
              <button
                onClick={() => {
                  setQuestionIndex(0);
                  setIsFinished(false);
                  setCorrectCount(0);
                  setIncorrectCount(0);
                  setUserAnswers([]);
                }}
                className="mt-4 w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-blue-500"
              >
                Restart Quiz
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TrueOrFalseGeneratorAdv;
