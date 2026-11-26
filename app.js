const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}

const API_BASE = "https://prepquizguru-api.onrender.com";


// =====================================
// ANALYTICS
// =====================================

const telegramInitData = tg?.initData || "";

function trackAnalytics(eventData) {
    if (!telegramInitData) return;

    const eventId = crypto.randomUUID();

    fetch(`${API_BASE}/analytics/event`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            init_data: telegramInitData,
            event_id: eventId,
            ...eventData
        }),
        keepalive: true
    }).catch(error => {
        console.warn("Analytics tracking failed:", error);
    });
}

// Record Mini App launch
trackAnalytics({
    event_type: "app_open"
});



// =====================================
// APP STATE
// =====================================

let selectedSubject = "";
let currentLanguage = "en";
let sessionId = "";

let questions = [];
let currentQuestion = 0;
let answers = {};
let submitted = false;
let completing = false;
let checkingAnswer = false;
let questionRequestId = 0;
// =====================================
// HTML ELEMENTS
// =====================================

const homeScreen = document.getElementById("home-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");
const feedbackScreen = document.getElementById("feedback-screen");

// Feedback elements
const openFeedbackBtn = document.getElementById("open-feedback-btn");
const feedbackMessage = document.getElementById("feedback-message");
const feedbackStatus = document.getElementById("feedback-status");
const submitFeedbackBtn = document.getElementById("submit-feedback-btn");
const feedbackBackBtn = document.getElementById("feedback-back-btn");

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
const languageToggle = document.getElementById("language-toggle");


// =====================================
// SCREEN NAVIGATION
// =====================================

function showScreen(screen) {
    const screens = [
        homeScreen,
        quizScreen,
        resultScreen,
        feedbackScreen
    ];

    screens.forEach(item => item.classList.add("hidden"));

    screen.classList.remove("hidden");
}

// =================================
// FEEDBACK SYSTEM
// =================================

let feedbackSubmitting = false;

// Open feedback screen
openFeedbackBtn.addEventListener("click", () => {
    feedbackStatus.textContent = "";
    feedbackStatus.className = "";

    showScreen(feedbackScreen);
});

// Return to subjects
feedbackBackBtn.addEventListener("click", () => {
    if (feedbackSubmitting) return;

    showScreen(homeScreen);
});

// Submit feedback
submitFeedbackBtn.addEventListener("click", async () => {

    if (feedbackSubmitting) return;

    const message = feedbackMessage.value.trim();

    if (!message) {
        feedbackStatus.textContent = "Please enter your feedback before submitting.";
        feedbackStatus.className = "error";
        return;
    }

    if (message.length > 2000) {
        feedbackStatus.textContent = "Feedback cannot exceed 2000 characters.";
        feedbackStatus.className = "error";
        return;
    }

    if (!telegramInitData) {
        feedbackStatus.textContent =
            "Telegram session not found. Please reopen PrepQuizGuru from Telegram.";
        feedbackStatus.className = "error";
        return;
    }

    feedbackSubmitting = true;
    submitFeedbackBtn.disabled = true;
    feedbackBackBtn.disabled = true;
    submitFeedbackBtn.textContent = "Submitting...";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${API_BASE}/feedback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                init_data: telegramInitData,
                message: message
            }),
            signal: controller.signal
        });

        await response.json().catch(() => ({}));

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error(
                    "Your Telegram session could not be verified. Close and reopen PrepQuizGuru from Telegram."
                );
            }

            throw new Error(
                "We couldn't submit your feedback. Please try again."
            );
        }

        feedbackMessage.value = "";

        feedbackStatus.textContent =
            "Thank you! Your feedback has been submitted privately.";

        feedbackStatus.className = "success";

    } catch (error) {

        feedbackStatus.textContent = error.name === "AbortError"
            ? "The request timed out. Please try again."
            : error.message || "Something went wrong. Please try again.";

        feedbackStatus.className = "error";

    } finally {

        clearTimeout(timeoutId);

        feedbackSubmitting = false;
        submitFeedbackBtn.disabled = false;
        feedbackBackBtn.disabled = false;
        submitFeedbackBtn.textContent = "Submit Feedback";
    }
});


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

    if (checkingAnswer || completing) {
        alert("Please wait until the current operation finishes.");
        return;
    }

    // Ignore any question-loading request still in progress
    questionRequestId++;

    showScreen(homeScreen);

});

quizScreen.insertBefore(
    quizHomeBtn,
    quizScreen.firstChild
);
// Back to Subjects button for completed quiz review
const reviewHomeBtn = document.createElement("button");

reviewHomeBtn.className = "secondary-btn";
reviewHomeBtn.textContent = "← Back to Subjects";
reviewHomeBtn.style.width = "100%";

reviewHomeBtn.addEventListener("click", () => {
    showScreen(homeScreen);
});

const resultHomeBtn = document.createElement("button");

resultHomeBtn.className = "secondary-btn";
resultHomeBtn.textContent = "← Back to Subjects";

resultHomeBtn.addEventListener("click", () => {

    if (completing) {
        return;
    }

    showScreen(homeScreen);
});

resultScreen.appendChild(resultHomeBtn);


// =====================================
// LOAD QUESTIONS FROM BACKEND
// =====================================



async function loadQuestions() {

    // Identify this as the latest request
    const requestId = ++questionRequestId;
    const requestedSubject = selectedSubject;
    // Every new quiz starts in English.
    currentLanguage = "en";

    // Show the toggle only for bilingual subjects.
    const bilingualSubjects = [
        "Aptitude",
        "Reasoning",
        "General Studies"
    ];

    const isBilingual =
        bilingualSubjects.includes(requestedSubject);

    languageToggle.hidden = !isBilingual;
    languageToggle.textContent = "தமிழ்";

    // Clear previous subject data
    questions = [];
    sessionId = "";
    
    currentQuestion = 0;
    answers = {};
    submitted = false;
    completing = false;
    checkingAnswer = false;
    finishBtn.disabled = true;
	// Restore normal quiz buttons for the new quiz.
    finishBtn.style.display = "";
    quizHomeBtn.style.display = "";
    reviewHomeBtn.remove();

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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    try {
        const response = await fetch(`${API_BASE}/questions`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                category: requestedSubject,
                init_data: telegramInitData
            }),

            signal: controller.signal
        });

        if (requestId !== questionRequestId) return;

        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data = await response.json();

        // Ignore responses from older subject requests
        if (requestId !== questionRequestId) return;
	questions = data.questions || [];
	sessionId = data.session_id || "";

	if (!questions.length || !sessionId) {
    	    questions = [];
    	    sessionId = "";

    	    showScreen(homeScreen);
    	    alert(`No valid quiz session is available for ${requestedSubject}.`);
    	    return;
	}

	// Notify backend that the quiz has started.
	const startResponse = await fetch(`${API_BASE}/quiz-started`, {
    	    method: "POST",
    	    headers: {
        	"Content-Type": "application/json"
    	    },
    	    body: JSON.stringify({
        	session_id: sessionId,
        	init_data: telegramInitData
    	    })
	});

	if (!startResponse.ok) {
    	    throw new Error("Unable to start quiz session.");
	}

	// Ignore this response if the user has moved to another screen
	// or selected another subject while the request was processing.
	if (requestId !== questionRequestId) return;

	finishBtn.disabled = false;


        document.getElementById("quiz-category").textContent =
            requestedSubject.toUpperCase();

        renderQuestion();

    } catch (error) {

        // Ignore errors from older requests
        if (requestId !== questionRequestId) return;

        console.error("Question loading error:", error);

        questions = [];
        sessionId = "";
        questionGrid.innerHTML = "";
        optionsContainer.innerHTML = "";

        questionText.textContent = "Unable to load questions.";

        alert(
            error.name === "AbortError"
                ? "The server took too long to respond. Please try again."
                : "Unable to load questions. Please check your internet connection and try again."
        );

        showScreen(homeScreen);

    } finally {
        clearTimeout(timeout);
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

    // Use Tamil only when the complete question and all four
    // Tamil options are available. Otherwise, use English.
    const hasTamilContent =
	    q.has_tamil_translation === true &&
	    typeof q.question_ta === "string" &&
	    q.question_ta.trim() !== "" &&
	    q.options_ta &&
	    ["A", "B", "C", "D"].every(
	        key =>
	            typeof q.options_ta[key] === "string" &&
	            q.options_ta[key].trim() !== ""
	    );

    const useTamil =
        currentLanguage === "ta" && hasTamilContent;

    const displayedQuestion = useTamil
        ? q.question_ta
        : q.question;

    const displayedOptions = useTamil
        ? q.options_ta
        : q.options;

    questionText.textContent = displayedQuestion;

    questionCount.textContent =
        `${currentQuestion + 1} / ${total}`;

    questionNumber.textContent =
        `QUESTION ${String(currentQuestion + 1).padStart(2, "0")}`;

    const progress = ((currentQuestion + 1) / total) * 100;

    progressFill.style.width = `${progress}%`;

    progressPercent.textContent =
        `${Math.round(progress)}%`;

    const actualAnswered = Object.values(answers).filter(
        answer => !answer.unanswered
    ).length;

    answeredCount.textContent =
        `${actualAnswered} answered`;

    optionsContainer.innerHTML = "";
    feedbackContainer.innerHTML = "";

    Object.entries(displayedOptions).forEach(([key, value]) => {

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

            if (key === savedAnswer.correctOption) {

                button.classList.add("correct");

            } else if (key === savedAnswer.selected) {

                button.classList.add("wrong");

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
        showFeedback(savedAnswer, displayedOptions);
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
                session_id: sessionId,
                question_id: q.id,
                selected_option: key,
                init_data: telegramInitData
            })

        });

        if (!response.ok) {
            throw new Error("Answer checking failed.");
        }

        const result = await response.json();

        answers[currentQuestion] = {
            selected: key,
            correct: result.correct,
            correctOption: result.correct_option,
            explanation: result.explanation,
            explanation_ta: result.explanation_ta
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



function showFeedback(result, options) {

    const box = document.createElement("div");

    box.className = result.unanswered
        ? "feedback-box"
        : `feedback-box ${
            result.correct ? "correct-feedback" : "wrong-feedback"
        }`;

    const title = document.createElement("div");

    title.className = "feedback-title";

    if (result.unanswered) {
        title.textContent = "○ Not Answered";
    } else {
        title.textContent = result.correct
            ? "✓ Correct Answer!"
            : "✗ Incorrect Answer!";
    }

    box.appendChild(title);

    // Show the correct answer for unanswered questions.
    if (result.unanswered) {

        const correctAnswer = document.createElement("div");

        correctAnswer.className = "explanation";

        correctAnswer.textContent =
            `Correct Answer: ${result.correctOption}. ${options[result.correctOption]}`;

        box.appendChild(correctAnswer);

    }

    // Check whether the current question has a complete Tamil translation.
    const q = questions[currentQuestion];

    const hasCompleteTamil =
	    q.has_tamil_translation === true &&
	    typeof q.question_ta === "string" &&
	    q.question_ta.trim() !== "" &&
	    q.options_ta &&
	    ["A", "B", "C", "D"].every(
	        key =>
	            typeof q.options_ta[key] === "string" &&
	            q.options_ta[key].trim() !== ""
	    ) &&
	    typeof result.explanation_ta === "string" &&
	    result.explanation_ta.trim() !== "";

    // Use Tamil only when the entire question is translated.
    const useTamil =
        currentLanguage === "ta" && hasCompleteTamil;

    const displayedExplanation = useTamil
        ? result.explanation_ta
        : result.explanation;

    const explanation = document.createElement("div");

    explanation.className = "explanation";

    explanation.textContent = useTamil
        ? `விளக்கம்: ${displayedExplanation}`
        : `Explanation: ${displayedExplanation}`;

    box.appendChild(explanation);

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

		if (answers[index] && !answers[index].unanswered) {
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
// ENGLISH / TAMIL LANGUAGE TOGGLE
// =====================================

languageToggle.addEventListener("click", () => {

    const bilingualSubjects = [
        "Aptitude",
        "Reasoning",
        "General Studies"
    ];

    if (!bilingualSubjects.includes(selectedSubject)) {
        return;
    }

    // Switch the current language.
    currentLanguage =
        currentLanguage === "en" ? "ta" : "en";

    // Update button label.
    languageToggle.textContent =
        currentLanguage === "en" ? "தமிழ்" : "English";

    // Redisplay the same question.
    renderQuestion();

});


// =====================================
// FINISH QUIZ
// =====================================

finishBtn.addEventListener("click", () => {

    if (checkingAnswer || !questions.length || submitted) return;

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

async function showResults() {

    if (submitted || checkingAnswer || !questions.length || !sessionId) {
        return;
    }

    submitted = true;
    completing = true;
    finishBtn.disabled = true;

    try {

        const response = await fetch(`${API_BASE}/complete-quiz`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                session_id: sessionId,
                init_data: telegramInitData
            })
        });

        if (!response.ok) {
            throw new Error(`Quiz completion failed: HTTP ${response.status}`);
        }

		const result = await response.json();
		
		// Prepare review data for all questions.
		if (Array.isArray(result.review)) {
		
		    result.review.forEach(item => {
		
		        const index = questions.findIndex(
		            q => q.id === item.question_id
		        );
		
		        if (index === -1) return;
		
		        answers[index] = {
		            selected: item.selected_option,
		            correct: item.status === "correct",
		            correctOption: item.correct_option,
		            explanation: item.explanation,
                    explanation_ta: item.explanation_ta,
		            unanswered: item.status === "unanswered"
		        };
		
		    });
		
		}
		
		completing = false;

        const total = result.total_questions;
        const answered = result.answered;
        const correct = result.correct;
        const wrong = result.wrong;
        const unanswered = result.unanswered;
        const accuracy = result.accuracy;

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
            `Accuracy: ${Number(accuracy).toFixed(1)}%`;

    } catch (error) {

        console.error("Quiz completion error:", error);

        // Allow the user to retry completion.
        submitted = false;
        completing = false;
        finishBtn.disabled = false;

        alert(
            "Unable to submit your quiz results. Please check your connection and try again."
        );

    }
}
// =====================================
// REVIEW ANSWERS
// =====================================

document
    .getElementById("review-btn")
    .addEventListener("click", () => {

        currentQuestion = 0;

        // Hide Submit during review.
        finishBtn.style.display = "none";

        // Hide the top Back to Subjects button.
        quizHomeBtn.style.display = "none";

        // Place Back to Subjects where Submit normally appears.
        quizScreen.insertBefore(
            reviewHomeBtn,
            finishBtn
        );

        showScreen(quizScreen);

        renderQuestion();

    });

// =====================================
// START APPLICATION
// =====================================

showScreen(homeScreen);
