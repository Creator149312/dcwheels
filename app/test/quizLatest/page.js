import QuizWheel from "./QuizWheel";

const quizData = {
    "quiz_wheel": {
        "title": "Quiz Spin Wheel",
        "description": "Spin the wheel to answer quiz questions.",
        "tags": ["Games", "Quiz"],
        "segments": [
            {
                "id": 1,
                "title": "Is the sky blue?",
                "type": "true_false",
                "options": ["True", "False"],
                "answer": "True",
                "coins": 10
            },
            {
                "id": 2,
                "title": "Capital of France?",
                "type": "mcq",
                "options": ["Berlin", "Paris", "Madrid", "Rome"],
                "answer": "Paris",
                "coins": 15
            },
            {
                "id": 3,
                "title": "Is water made of H2O?",
                "type": "true_false",
                "options": ["True", "False"],
                "answer": "True",
                "coins": 10
            },
            {
                "id": 4,
                "title": "Largest planet in our solar system?",
                "type": "mcq",
                "options": ["Earth", "Mars", "Jupiter", "Saturn"],
                "answer": "Jupiter",
                "coins": 20
            },
            {
                "id": 5,
                "title": "Who wrote 'Hamlet'?",
                "type": "mcq",
                "options": ["Charles Dickens", "William Shakespeare", "Mark Twain", "Leo Tolstoy"],
                "answer": "William Shakespeare",
                "coins": 25
            }
        ]
    }
};


export default function QuizPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            {/* <QuizWheel segments={quizData.quiz_wheel.segments} /> */}
        </div>
    );
}
