
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Local development API.
// We will change this address when the backend is hosted online.
const API_BASE = "https://prepquizguru-api.onrender.com";

let questions = [];
let currentQuestion = 0;
let answers = {};
let submitted = false;
let checkingAnswer = false;

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

// Load questions from Python backend
async function loadQuestions() {
    questionText.textContent = "Loading questions...";

    try {
        const response = await fetch(
            `${API_BASE}/questions?exam=TNPSC&category=General%20English`
        );

        if (!response.ok) {
            throw new Error("Could not load questions.");
        }

        const data = await response.json();
        questions = data.questions;

        if (!questions.length) {
            throw new Error("No questions found.");
        }

        renderQuestion();

    } catch (error) {
        questionText.textContent =
            "Unable to connect to the quiz server. Please try again.";
        console.error(error);
    }
}

// Display current question
function renderQuestion() {
    if (!questions.length) return;

    const q = questions[currentQuestion];
    const savedAnswer = answers[currentQuestion];
    const total = questions.length;

    questionText.textContent = q.question;
    questionCount.textContent = `${currentQuestion + 1} / ${total}`;
    questionNumber.textContent =
        `QUESTION ${String(currentQuestion + 1).padStart(2, "0")}`;

    const progress = ((currentQuestion + 1) / total) * 100;

    progressFill.style.width = `${progress}%`;
    progressPercent.textContent = `${Math.round(progress)}%`;

    answeredCount.textContent =
        `${Object.keys(answers).length} answered`;

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

        if (savedAnswer) {
            button.disabled = true;

            if (key === savedAnswer.selected) {
                button.classList.add(
                    savedAnswer.correct ? "correct" : "wrong"
                );
            }
        } else if (!submitted) {
            button.disabled = checkingAnswer;
            button.addEventListener("click", () => selectAnswer(key));
        }

        optionsContainer.appendChild(button);
    });

    if (savedAnswer) {
        showFeedback(savedAnswer);
    }

    previousBtn.disabled = currentQuestion === 0;
    nextBtn.disabled = currentQuestion === total - 1;

    renderQuestionGrid();
}

// Send selected answer to Python backend
async function selectAnswer(key) {
    if (answers[currentQuestion] || submitted || checkingAnswer) return;

    checkingAnswer = true;
    renderQuestion();

    const q = questions[currentQuestion];

    try {
        const response = await fetch(`${API_BASE}/check-answer`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question_id: q.id,
                selected_option: key
            })
        });

        if (!response.ok) {
            throw new Error("Answer checking failed.");
        }

        const result = await response.json();

        answers[currentQuestion] = {
            selected: key,
            correct: result.correct,
            explanation: result.explanation
        };

    } catch (error) {
        alert("Unable to check your answer. Please try again.");
        console.error(error);

    } finally {
        checkingAnswer = false;
        renderQuestion();
    }
}

// Display answer feedback returned by backend
function showFeedback(result) {
    const box = document.createElement("div");

    box.className = `feedback-box ${
        result.correct ? "correct-feedback" : "wrong-feedback"
    }`;

    const title = document.createElement("div");
    title.className = "feedback-title";
    title.textContent = result.correct
        ? "✓ Correct Answer!"
        : "✗ Incorrect Answer!";

    const explanation = document.createElement("div");
    explanation.className = "explanation";
    explanation.textContent = `Explanation: ${result.explanation}`;

    box.append(title, explanation);
    feedbackContainer.appendChild(box);
}

// Question number navigation
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
            if (checkingAnswer) return;

            currentQuestion = index;
            renderQuestion();
        });

        questionGrid.appendChild(button);
    });
}

// Previous question
previousBtn.addEventListener("click", () => {
    if (currentQuestion > 0 && !checkingAnswer) {
        currentQuestion--;
        renderQuestion();
    }
});

// Next question
nextBtn.addEventListener("click", () => {
    if (
        currentQuestion < questions.length - 1 &&
        !checkingAnswer
    ) {
        currentQuestion++;
        renderQuestion();
    }
});

// Finish quiz
finishBtn.addEventListener("click", () => {
    if (checkingAnswer) return;

    const confirmed = confirm(
        "Are you sure you want to submit the test?"
    );

    if (confirmed) {
        showResults();
    }
});

// Results calculated using backend-verified answers
function showResults() {
    submitted = true;

    const total = questions.length;
    const answered = Object.keys(answers).length;

    const correct = Object.values(answers).filter(
        answer => answer.correct
    ).length;

    const wrong = answered - correct;
    const unanswered = total - answered;
    const accuracy = total ? (correct / total) * 100 : 0;

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

// Review answers
document.getElementById("review-btn").addEventListener("click", () => {
    submitted = false;

    document.getElementById("result-screen").classList.add("hidden");
    document.getElementById("quiz-screen").classList.remove("hidden");

    currentQuestion = 0;
    renderQuestion();
});

// Start application
loadQuestions();
