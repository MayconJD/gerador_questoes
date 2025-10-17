// =========================
// INÍCIO DO SCRIPT PRINCIPAL
// =========================
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

const API_KEY = "AIzaSyCdDDkLKcDZIy4QlGOYMALJn5XB2XxSuOs";
const genAI = new GoogleGenerativeAI(API_KEY);

document.addEventListener("DOMContentLoaded", () => {
  const screens = {
    setup: document.getElementById("setup-screen"),
    quiz: document.getElementById("quiz-screen"),
    results: document.getElementById("results-screen"),
  };

  const setupForm = document.getElementById("quiz-setup-form");
  const numQuestionsInput = document.getElementById("num-questions");
  const decreaseBtn = document.getElementById("decrease-btn");
  const increaseBtn = document.getElementById("increase-btn");
  const questionCounter = document.getElementById("question-counter");
  const questionText = document.getElementById("question-text");
  const optionsContainer = document.getElementById("options-container");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const skipBtn = document.getElementById("skip-btn");
  const cancelQuizBtn = document.getElementById("cancel-quiz");
  const scoreText = document.getElementById("score-text");
  const menuBtn = document.getElementById("menu-btn");
  const reviewBtn = document.getElementById("review-btn");
  const feedbackContainer = document.getElementById("feedback-container");
  const cursorGlow = document.querySelector(".cursor-glow");

  let questions = [];
  let userAnswers = [];
  let currentQuestionIndex = 0;
  let score = 0;

  // === CURSOR GLOW ===
  document.addEventListener("mousemove", (e) => {
    cursorGlow.style.left = `${e.clientX}px`;
    cursorGlow.style.top = `${e.clientY}px`;
  });

  // === TROCAR DE TELA ===
  const switchScreen = (name) => {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  };

  // === CONTADOR DE QUESTÕES ===
  decreaseBtn.addEventListener("click", () => {
    const v = parseInt(numQuestionsInput.value);
    if (v > 1) numQuestionsInput.value = v - 1;
  });
  increaseBtn.addEventListener("click", () => {
    numQuestionsInput.value = parseInt(numQuestionsInput.value) + 1;
  });

  // === CHAMADA DIRETA AO GEMINI ===
  async function callGemini(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });  // mudou de 1.5 para 2.5
    const result = await model.generateContent(prompt);

    console.log("Resposta completa da API Gemini:", result);

    // Se for o formato moderno
    if (result?.response && typeof result.response.text === "function") {
      const text = result.response.text();
      return text;
    }

    // Alternativa (caso estrutura antiga)
    if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return result.candidates[0].content.parts[0].text;
    }

    throw new Error("Estrutura inesperada de retorno da API");
  } catch (err) {
    console.error("Erro ao chamar Gemini:", err);
    questionText.textContent = "Erro ao conectar à API Gemini.";
    return null;
  }
}

  // === GERAR QUESTÕES ===
  async function fetchQuestions(subjects, numQuestions) {
    questionText.textContent = "Gerando simulado...";
    optionsContainer.innerHTML = "";
    switchScreen("quiz");

    const topics = {
      "Língua Portuguesa": "acentuação, ortografia, crase, pontuação, interpretação de texto, análise sintática",
      Matemática: "equações, porcentagem, frações, regra de três, gráficos e tabelas",
      Informática: "MS Windows, Word, Excel, internet, correio eletrônico",
    };

    const detailedSubjects = subjects.includes("Prova Completa")
      ? Object.entries(topics).map(([k, v]) => `${k} (${v})`).join(", ")
      : subjects.map((s) => `${s} (${topics[s]})`).join(", ");

    const prompt = `
Gere ${numQuestions} questões de múltipla escolha para concurso público (nível médio)
com base nos seguintes temas: ${detailedSubjects}.
Use o formato JSON puro, exatamente assim:
[
  {
    "question": "Texto da pergunta",
    "options": ["A", "B", "C", "D"],
    "correctAnswerIndex": 0
  }
]`;

    const resultText = await callGemini(prompt);
    if (!resultText) return;

    try {
      const clean = resultText.replace(/```json|```/g, "").trim();
      questions = JSON.parse(clean);
      if (!Array.isArray(questions) || !questions[0]) throw new Error("Formato inesperado");
      userAnswers = new Array(questions.length).fill(null);
      currentQuestionIndex = 0;
      displayQuestion();
    } catch (e) {
      console.error("Erro ao processar JSON:", e, resultText);
      questionText.textContent = "Erro ao processar as questões. Tente novamente.";
    }
  }

  // === EXIBIR QUESTÃO ===
  function displayQuestion() {
    const q = questions[currentQuestionIndex];
    if (!q) return;
    questionCounter.textContent = `Questão ${currentQuestionIndex + 1} de ${questions.length}`;
    questionText.textContent = q.question;
    optionsContainer.innerHTML = "";

    q.options.forEach((opt, i) => {
      const id = `q${currentQuestionIndex}_opt${i}`;
      const div = document.createElement("div");
      div.innerHTML = `
        <input type="radio" name="question${currentQuestionIndex}" id="${id}" value="${i}" class="option-input">
        <label for="${id}" class="option-label">${opt}</label>`;
      optionsContainer.appendChild(div);
    });

    const saved = userAnswers[currentQuestionIndex];
    if (saved !== null) {
      const radio = document.querySelector(`#q${currentQuestionIndex}_opt${saved}`);
      if (radio) radio.checked = true;
    }

    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.textContent = currentQuestionIndex === questions.length - 1 ? "Finalizar" : "Próxima";
  }

  optionsContainer.addEventListener("change", (e) => {
    if (e.target.type === "radio") {
      userAnswers[currentQuestionIndex] = parseInt(e.target.value);
    }
  });

  setupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const subjects = [...document.querySelectorAll('input[name="subject"]:checked')].map((cb) => cb.value);
    const num = parseInt(numQuestionsInput.value);
    if (subjects.length === 0) return alert("Selecione ao menos uma matéria.");
    fetchQuestions(subjects, num);
  });

  nextBtn.addEventListener("click", () => {
    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex++;
      displayQuestion();
    } else {
      calculateScore();
      switchScreen("results");
    }
  });

  prevBtn.addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      displayQuestion();
    }
  });

  skipBtn.addEventListener("click", () => nextBtn.click());
  cancelQuizBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Deseja cancelar o simulado?")) resetQuiz();
  });

  function calculateScore() {
    score = 0;
    questions.forEach((q, i) => {
      if (userAnswers[i] === q.correctAnswerIndex) score++;
    });
    scoreText.textContent = `Sua pontuação: ${score}/${questions.length}`;
    feedbackContainer.innerHTML = "";
  }

  reviewBtn.addEventListener("click", () => {
    feedbackContainer.innerHTML = "";
    questions.forEach((q, i) => {
      const user = userAnswers[i] !== null ? q.options[userAnswers[i]] : "Não respondida";
      const correct = q.options[q.correctAnswerIndex];
      feedbackContainer.innerHTML += `
        <h3>Questão ${i + 1}</h3>
        <p>${q.question}</p>
        <p><strong>Sua resposta:</strong> ${user}</p>
        <p><strong>Correta:</strong> ${correct}</p>
        <hr>`;
    });
  });

  menuBtn.addEventListener("click", resetQuiz);

  function resetQuiz() {
    switchScreen("setup");
    questions = [];
    userAnswers = [];
    score = 0;
  }
});
