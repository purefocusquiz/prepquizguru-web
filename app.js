
const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

const API_BASE = "https://prepquizguru-api.onrender.com";

// =====================================
// APP STATE
// =====================================

let selectedExam = "";
let selectedSubject = "";

let questions = [];
let currentQuestion = 0;
let answers = {};
let submitted = false;
let checkingAnswer = false;


// =====================================
// EXAM AND SUBJECT CONFIGURATION
// =====================================

const examSubjects = {
    Banking: [
        "Quantitative Aptitude",
        "Reasoning Ability",
        "English Language",
        "Banking Awareness"
    ],

    TNPSC: [
        "General English",
        "General Tamil",
        "General Studies",
        "Aptitude & Mental Ability"
    ],

    SSC: [
        "General Intelligence & Reasoning",
        "Quantitative Aptitude",
        "English Comprehension",
        "General Awareness"
    ]
};


// =====================================
// HTML ELEMENTS
// =====================================

const homeScreen = document.getElementById("home-screen");
const examScreen = document.getElementById("exam-screen");
const subjectScreen = document.getElementById("subject-screen");
const modeScreen = document.getElementById("mode-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const examBadge = document.getElementById("exam-badge");
const subjectList = document.getElementById("subject-list");

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
        examScreen,
        subjectScreen,
        modeScreen,
        quizScreen,
        resultScreen
    ];

    screens.forEach(item => item.classList.add("hidden"));

    screen.classList.remove("hidden");
}


// =====================================
// HOME SCREEN
// =====================================

document
    .getElementById("start-preparation-btn")
    .addEventListener("click", () => {
        showScreen(examScreen);
    });


// =====================================
// EXAM SELECTION
// =====================================

document.querySelectorAll(".selection-card[data-exam]")
    .forEach(button => {

        button.addEventListener("click", () => {

            selectedExam = button.dataset.exam;

            examBadge.textContent = selectedExam;

            document.getElementById("subject-description").textContent =
                `Choose a subject for ${selectedExam}.`;

            renderSubjects();

            showScreen(subjectScreen);
        });

    });


// =====================================
// SUBJECT SELECTION
// =====================================

function renderSubjects() {

    subjectList.innerHTML = "";

    const subjects = examSubjects[selectedExam] || [];

    subjects.forEach(subject => {

        const button = document.createElement("button");

        button.className = "selection-card";
        button.dataset.subject = subject;

        const icon = document.createElement("span");
        icon.className = "selection-icon";
        icon.textContent = getSubjectIcon(subject);

        const content = document.createElement("span");
        content.className = "selection-content";

        const title = document.createElement("strong");
        title.textContent = subject;

        const description = document.createElement("small");
        description.textContent =
            selectedExam === "TNPSC" && subject === "General English"
                ? "Free sample questions available"
                : "Practice content coming soon";

        content.append(title, description);

        const arrow = document.createElement("span");
        arrow.className = "selection-arrow";
        arrow.textContent = "→";

        button.append(icon, content, arrow);

        button.addEventListener("click", () => {

            selectedSubject = subject;

            document.getElementById("mode-description").textContent =
                `${selectedExam} · ${selectedSubject}`;

            showScreen(modeScreen);

        });

        subjectList.appendChild(button);

    });

}


function getSubjectIcon(subject) {

    if (subject.toLowerCase().includes("english")) return "🔤";
    if (subject.toLowerCase().includes("tamil")) return "📖";
    if (subject.toLowerCase().includes("reasoning")) return "🧠";
    if (subject.toLowerCase().includes("quantitative")) return "🔢";
    if (subject.toLowerCase().includes("awareness")) return "🌍";
    if (subject.toLowerCase().includes("studies")) return "📚";
    if (subject.toLowerCase().includes("aptitude")) return "📝";

    return "📘";
}


// =====================================
// BACK BUTTONS
// =====================================

document
    .getElementById("exam-back-btn")
    .addEventListener("click", () => {
        showScreen(homeScreen);
    });


document
    .getElementById("subject-back-btn")
    .addEventListener("click", () => {
        showScreen(examScreen);
    });


document
    .getElementById("mode-back-btn")
    .addEventListener("click", () => {
        showScreen(subjectScreen);
    });


// =====================================
// PRACTICE MODE
// =====================================

document
    .getElementById("free-practice-btn")
    .addEventListener("click", () => {
        loadQuestions();
    });


document
    .getElementById("mock-test-btn")
    .addEventListener("click", () => {
        alert("Mock Tests are coming soon!");
    });


document
    .getElementById("pyq-btn")
    .addEventListener("click", () => {
        alert("Previous Year Questions are coming soon!");
    });


// =====================================
// LOAD QUESTIONS FROM BACKEND
// =====================================

async function loadQuestions() {

    showScreen(quizScreen);

    questionText.textContent = "Loading questions...";
    optionsContainer.innerHTML = "";
    feedbackContainer.innerHTML = "";

    try {

        const url =
            `${API_BASE}/questions?exam=${encodeURIComponent(selectedExam)}` +
            `&category=${encodeURIComponent(selectedSubject)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Could not load questions.");
        }

        const data = await response.json();

        questions = data.questions || [];

        if (!questions.length) {

            alert(
                `Questions for ${selectedExam} - ${selectedSubject} ` +
                "are not available yet."
            );

            showScreen(modeScreen);
            return;
        }

        currentQuestion = 0;
        answers = {};
        submitted = false;
        checkingAnswer = false;

        document.getElementById("quiz-category").textContent =
            selectedSubject.toUpperCase();

        renderQuestion();

    } catch (error) {

        console.error(error);

        questionText.textContent =
            "Unable to connect to the quiz server. Please try again.";

        alert("Unable to load questions. Please check your connection.");

        showScreen(modeScreen);
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
