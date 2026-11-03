
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Sample questions matching questions.json
const questions = [
    {
        question: "Choose the correct synonym of Abundant.",
        options: {
            A: "Scarce",
            B: "Plentiful",
            C: "Weak",
            D: "Empty"
        },
        answer: "B",
        explanation: "Abundant means existing in large quantities. Plentiful is its synonym."
    },
    {
        question: "Choose the antonym of Ancient.",
        options: {
            A: "Old",
            B: "Historic",
            C: "Modern",
            D: "Traditional"
        },
        answer: "C",
        explanation: "Ancient means very old. Modern is its opposite."
    },
    {
        question: "Identify the noun in the sentence: Honesty is the best policy.",
        options: {
            A: "Best",
            B: "Honesty",
            C: "Policy",
            D: "Is"
        },
        answer: "B",
        explanation: "Honesty is an abstract noun because it names a quality."
    },
    {
        question: "What is the plural form of Child?",
        options: {
            A: "Childs",
            B: "Childes",
            C: "Children",
            D: "Childrens"
        },
        answer: "C",
        explanation: "Children is the irregular plural form of Child."
    },
    {
        question: "Choose the correct article: He is ___ honest man.",
        options: {
            A: "A",
            B: "An",
            C: "The",
            D: "No article"
        },
        answer: "B",
        explanation: "An is used before the vowel sound in honest."
    },
    {
        question: "What is the past tense of Write?",
        options: {
            A: "Written",
            B: "Writing",
            C: "Wrote",
            D: "Writes"
        },
        answer: "C",
        explanation: "Write is an irregular verb. Its past tense is Wrote."
    },
    {
        question: "Identify the adjective: She wore a beautiful dress.",
        options: {
            A: "She",
            B: "Wore",
            C: "Beautiful",
            D: "Dress"
        },
        answer: "C",
        explanation: "Beautiful describes the noun dress, so it is an adjective."
    },
    {
        question: "Choose the correct preposition: The book is ___ the table.",
        options: {
            A: "On",
            B: "At",
            C: "Into",
            D: "By"
        },
        answer: "A",
        explanation: "On indicates the position of the book on the surface of the table."
    },
    {
        question: "Choose the correct passive voice: She writes a letter.",
        options: {
            A: "A letter wrote by her.",
            B: "A letter is written by her.",
            C: "A letter was written by her.",
            D: "A letter has written by her."
        },
        answer: "B",
        explanation: "Simple present active voice changes to is/am/are + past participle in passive voice."
    },
    {
        question: "What is the meaning of the idiom Once in a blue moon?",
        options: {
            A: "Every day",
            B: "Very quickly",
            C: "Very rarely",
            D: "At night"
        },
        answer: "C",
        explanation: "Once in a blue moon means something that happens very rarely."
    }
];

let currentQuestion = 0;
let answers = {};
let submitted = false;

const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const questionCount = document.getElementById("question-count");
const questionNumber = document.getElementById("question-number");
const progressFill = document.getElementById("progress-fill");
const progressPercent = document.getElementById("progress-percent");
const questionGrid = document.getElementById("question-grid");
const feedbackContainer = document.getElementById("feedback-container");
const answeredCount = document.getElementById("answered-count");

const previousBtn = document.getElementById("previous-btn");
const nextBtn = document.getElementById("next-btn");
const finishBtn = document.getElementById("finish-btn");

function renderQuestion() {
    const q = questions[currentQuestion];
    const selected = answers[currentQuestion];
    const total = questions.length;

    questionText.textContent = q.question;
    questionCount.textContent = `${currentQuestion + 1} / ${total}`;
    questionNumber.textContent = `QUESTION ${String(currentQuestion + 1).padStart(2, "0")}`;

    const progress = ((currentQuestion + 1) / total) * 100;

    progressFill.style.width = `${progress}%`;
    progressPercent.textContent = `${Math.round(progress)}%`;

    answeredCount.textContent = `${Object.keys(answers).length} answered`;

    optionsContainer.innerHTML = "";
    feedbackContainer.innerHTML = "";

    Object.entries(q.options).forEach(([key, value]) => {
        const button = document.createElement("button");
        button.className = "option-btn";

        const letter = document.createElement("span");
        letter.className = "option-letter";
        letter.textContent = key;

        const label = document.createElement("span");
        label.textContent = value;

        button.append(letter, label);

        if (selected) {
            button.disabled = true;

            if (key === q.answer) {
                button.classList.add("correct");
            }

            if (key === selected && selected !== q.answer) {
                button.classList.add("wrong");
            }
        } else {
            button.addEventListener("click", () => selectAnswer(key));
        }

        optionsContainer.appendChild(button);
    });

    if (selected) {
        showFeedback(q, selected);
    }

    previousBtn.disabled = currentQuestion === 0;
    nextBtn.disabled = currentQuestion === total - 1;

    renderQuestionGrid();
}

function selectAnswer(key) {
    if (answers[currentQuestion] || submitted) return;

    answers[currentQuestion] = key;
    renderQuestion();
}

function showFeedback(q, selected) {
    const isCorrect = selected === q.answer;

    const box = document.createElement("div");
    box.className = `feedback-box ${
        isCorrect ? "correct-feedback" : "wrong-feedback"
    }`;

    const title = document.createElement("div");
    title.className = "feedback-title";
    title.textContent = isCorrect ? "✓ Correct Answer!" : "✗ Incorrect Answer!";

    const answer = document.createElement("div");
    answer.textContent = `Correct answer: ${q.answer}. ${q.options[q.answer]}`;

    const explanation = document.createElement("div");
    explanation.className = "explanation";
    explanation.textContent = `Explanation: ${q.explanation}`;

    box.append(title, answer, explanation);
    feedbackContainer.appendChild(box);
}

function renderQuestionGrid() {
    questionGrid.innerHTML = "";

    questions.forEach((q, index) => {
        const button = document.createElement("button");

        button.className = "question-number-btn";
        button.textContent = index + 1;

        if (answers[index]) {
            button.classList.add("answered");
        }

        if (index === currentQuestion) {
            button.classList.add("current");
        }

        button.addEventListener("click", () => {
            currentQuestion = index;
            renderQuestion();
        });

        questionGrid.appendChild(button);
    });
}

previousBtn.addEventListener("click", () => {
    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
    }
});

nextBtn.addEventListener("click", () => {
    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        renderQuestion();
    }
});

finishBtn.addEventListener("click", () => {
    const confirmed = confirm("Are you sure you want to submit the test?");

    if (confirmed) {
        showResults();
    }
});

function showResults() {
    submitted = true;

    const total = questions.length;
    const answered = Object.keys(answers).length;

    const correct = questions.filter(
        (q, index) => answers[index] === q.answer
    ).length;

    const wrong = answered - correct;
    const unanswered = total - answered;
    const accuracy = (correct / total) * 100;

    document.getElementById("quiz-screen").classList.add("hidden");

    const resultScreen = document.getElementById("result-screen");
    resultScreen.classList.remove("hidden");

    document.getElementById("result-score").textContent =
        `${correct} / ${total}`;

    document.getElementById("correct-count").textContent = correct;
    document.getElementById("wrong-count").textContent = wrong;
    document.getElementById("unanswered-count").textContent = unanswered;

    document.getElementById("accuracy-text").textContent =
        `Accuracy: ${accuracy.toFixed(1)}%`;
}

document.getElementById("review-btn").addEventListener("click", () => {
    submitted = false;
    document.getElementById("result-screen").classList.add("hidden");
    document.getElementById("quiz-screen").classList.remove("hidden");

    currentQuestion = 0;
    renderQuestion();
});

// Initial display
renderQuestion();
