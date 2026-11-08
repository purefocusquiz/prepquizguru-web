
const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

const API_BASE = "https://prepquizguru-api.onrender.com";

// =====================================
// APP STATE
// =====================================

let selectedSubject = "";

let questions = [];
let currentQuestion = 0;
let answers = {};
let submitted = false;
let checkingAnswer = false;
let questionRequestId = 0;

// =====================================
// HTML ELEMENTS
// =====================================

const homeScreen = document.getElementById("home-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

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


// =====================================
// SCREEN NAVIGATION
// =====================================

function showScreen(screen) {
    const screens = [
        homeScreen,
        quizScreen,
        resultScreen
    ];

    screens.forEach(item => item.classList.add("hidden"));

    screen.classList.remove("hidden");
}


// =====================================
// SUBJECT SELECTION
// =====================================

document.querySelectorAll(".selection-card[data-subject]")
    .forEach(button => {

        button.addEventListener("click", () => {

            selectedSubject = button.dataset.subject;

            loadQuestions();

        });

    });


// =====================================
// BACK TO SUBJECTS BUTTONS
// =====================================

const quizHomeBtn = document.createElement("button");

quizHomeBtn.className = "secondary-btn";
quizHomeBtn.textContent = "← Back to Subjects";

quizHomeBtn.addEventListener("click", () => {
    showScreen(homeScreen);
});

quizScreen.insertBefore(
    quizHomeBtn,
    quizScreen.firstChild
);


const resultHomeBtn = document.createElement("button");

resultHomeBtn.className = "secondary-btn";
resultHomeBtn.textContent = "← Back to Subjects";

resultHomeBtn.addEventListener("click", () => {
    showScreen(homeScreen);
});

resultScreen.appendChild(resultHomeBtn);


// =====================================
// LOAD QUESTIONS FROM BACKEND
// =====================================


async function loadQuestions() {
    // Clear previous subject data immediately
    questions = [];
    currentQuestion = 0;
    answers = {};
    submitted = false;
    checkingAnswer = false;

    // Reset the quiz screen
    showScreen(quizScreen);

    questionText.textContent = "Loading questions...";
    optionsContainer.innerHTML = "";
    feedbackContainer.innerHTML = "";
    questionGrid.innerHTML = "";
    questionCount.textContent = "";
    questionNumber.textContent = "";
    answeredCount.textContent = "0 answered";
    progressFill.style.width = "0%";
    progressPercent.textContent = "0%";

    previousBtn.disabled = true;
    nextBtn.disabled = true;

    try {
        const url =
            `${API_BASE}/questions?category=${encodeURIComponent(selectedSubject)}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000);

        let response;

        try {
            response = await fetch(url, {
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data = await response.json();

        questions = data.questions || [];

        if (!questions.length) {
            showScreen(homeScreen);
            alert(`No questions are currently available for ${selectedSubject}.`);
            return;
        }

        document.getElementById("quiz-category").textContent =
            selectedSubject.toUpperCase();

        renderQuestion();

    } catch (error) {
        console.error("Question loading error:", error);

        questions = [];
        questionGrid.innerHTML = "";
        optionsContainer.innerHTML = "";

        questionText.textContent = "Unable to load questions.";

        alert(
            error.name === "AbortError"
                ? "The server took too long to respond. Please try again."
                : "Unable to load questions. Please check your connection and try again."
        );

        showScreen(homeScreen);
    }
}


// =====================================
// DISPLAY CURRENT QUESTION
// =====================================

function renderQuestion() {

    if (!questions.length) return;

    const q = questions[currentQuestion];

    const savedAnswer = answers[currentQuestion];

    const total = questions.length;

    questionText.textContent = q.question;

    questionCount.textContent =
        `${currentQuestion + 1} / ${total}`;

    questionNumber.textContent =
        `QUESTION ${String(currentQuestion + 1).padStart(2, "0")}`;

    const progress = ((currentQuestion + 1) / total) * 100;

    progressFill.style.width = `${progress}%`;

    progressPercent.textContent =
        `${Math.round(progress)}%`;

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

            button.addEventListener("click", () => {
                selectAnswer(key);
            });

        } else {

            button.disabled = true;

        }

        optionsContainer.appendChild(button);

    });

    if (savedAnswer) {
        showFeedback(savedAnswer);
    }

    previousBtn.disabled =
        currentQuestion === 0 || checkingAnswer;

    nextBtn.disabled =
        currentQuestion === total - 1 || checkingAnswer;

    renderQuestionGrid();

}


// =====================================
// CHECK ANSWER THROUGH BACKEND
// =====================================

async function selectAnswer(key) {

    if (
        answers[currentQuestion] ||
        submitted ||
        checkingAnswer
    ) {
        return;
    }

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


// =====================================
// ANSWER FEEDBACK
// =====================================

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

    explanation.textContent =
        `Explanation: ${result.explanation}`;

    box.append(title, explanation);

    feedbackContainer.appendChild(box);

}


// =====================================
// QUESTION NUMBER NAVIGATION
// =====================================

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


// =====================================
// PREVIOUS AND NEXT BUTTONS
// =====================================

previousBtn.addEventListener("click", () => {

    if (currentQuestion > 0 && !checkingAnswer) {

        currentQuestion--;

        renderQuestion();

    }

});


nextBtn.addEventListener("click", () => {

    if (
        currentQuestion < questions.length - 1 &&
        !checkingAnswer
    ) {

        currentQuestion++;

        renderQuestion();

    }

});


// =====================================
// FINISH QUIZ
// =====================================

finishBtn.addEventListener("click", () => {

    if (checkingAnswer) return;

    const confirmed = confirm(
        "Are you sure you want to submit the test?"
    );

    if (confirmed) {
        showResults();
    }

});


// =====================================
// RESULTS
// =====================================

function showResults() {

    submitted = true;

    const total = questions.length;

    const answered = Object.keys(answers).length;

    const correct = Object.values(answers).filter(
        answer => answer.correct
    ).length;

    const wrong = answered - correct;

    const unanswered = total - answered;

    const accuracy = total
        ? (correct / total) * 100
        : 0;

    showScreen(resultScreen);

    document.getElementById("result-score").textContent =
        `${correct} / ${total}`;

    document.getElementById("correct-count").textContent =
        correct;

    document.getElementById("wrong-count").textContent =
        wrong;

    document.getElementById("unanswered-count").textContent =
        unanswered;

    document.getElementById("accuracy-text").textContent =
        `Accuracy: ${accuracy.toFixed(1)}%`;

}


// =====================================
// REVIEW ANSWERS
// =====================================

document
    .getElementById("review-btn")
    .addEventListener("click", () => {

        submitted = false;

        currentQuestion = 0;

        showScreen(quizScreen);

        renderQuestion();

    });


// =====================================
// START APPLICATION
// =====================================

showScreen(homeScreen);
