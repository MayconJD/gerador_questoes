// script.js (versão corrigida)

document.addEventListener('DOMContentLoaded', () => {

    // Por esta (adicione .js no final):
    const API_URL = "/api/gemini.js";

    // --- ELEMENTOS DO DOM ---
    const screens = {
        setup: document.getElementById('setup-screen'),
        quiz: document.getElementById('quiz-screen'),
        results: document.getElementById('results-screen')
    };

    const setupForm = document.getElementById('quiz-setup-form');
    const numQuestionsInput = document.getElementById('num-questions');
    const decreaseBtn = document.getElementById('decrease-btn');
    const increaseBtn = document.getElementById('increase-btn');

    const questionCounter = document.getElementById('question-counter');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const skipBtn = document.getElementById('skip-btn');
    const cancelQuizBtn = document.getElementById('cancel-quiz');

    const scoreText = document.getElementById('score-text');
    const menuBtn = document.getElementById('menu-btn');
    const reviewBtn = document.getElementById('review-btn');
    const feedbackContainer = document.getElementById('feedback-container');

    const cursorGlow = document.querySelector('.cursor-glow');

    // --- ESTADO DO APLICATIVO ---
    let questions = [];
    let userAnswers = [];
    let currentQuestionIndex = 0;
    let score = 0;

    // --- FUNÇÕES ---

    // Efeito de brilho do cursor
    document.addEventListener('mousemove', (e) => {
        cursorGlow.style.left = `${e.clientX}px`;
        cursorGlow.style.top = `${e.clientY}px`;
    });

    // Muda a tela visível
    const switchScreen = (screenName) => {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    };

    // Lógica do contador de questões
    decreaseBtn.addEventListener('click', () => {
        let currentValue = parseInt(numQuestionsInput.value);
        if (currentValue > 1) {
            numQuestionsInput.value = currentValue - 1;
        }
    });

    increaseBtn.addEventListener('click', () => {
        numQuestionsInput.value = parseInt(numQuestionsInput.value) + 1;
    });

    // Função para chamar a API do Gemini via nosso backend
    const callGeminiAPI = async (prompt) => {
        try {
            const response = await fetch('/api/gemini', { // ou './api/gemini'
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Erro na resposta da API:", data);
                throw new Error(data.error || `Erro na API: ${response.statusText}`);
            }

            // --- CORREÇÃO APLICADA AQUI ---
            // Verificação mais robusta para garantir que a resposta não foi bloqueada
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
                console.error("Formato de resposta inválido ou conteúdo bloqueado pela API:", data);
                
                // Fornece um erro mais útil se for um bloqueio de segurança
                const finishReason = data.candidates?.[0]?.finishReason;
                if (finishReason === 'SAFETY') {
                     throw new Error("O pedido foi bloqueado por segurança. Tente um prompt diferente.");
                }
                throw new Error("A API retornou uma resposta vazia ou em formato inválido.");
            }

            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Erro ao chamar a API Gemini:", error);
            alert(`Erro: ${error.message}. Verifique o console para mais detalhes.`);
            return null;
        }
    };


    // Busca as questões na API com o conteúdo programático específico
    const fetchQuestions = async (subjects, numQuestions) => {
        questionText.textContent = 'Gerando seu simulado... Isso pode levar alguns segundos.';
        optionsContainer.innerHTML = '';
        switchScreen('quiz');

        const syllabus = {
            'Língua Portuguesa': `intelecção de textos, intertextualidade, acentuação, ortografia, crase, pontuação, frase, oração, período, análise morfossintática, classificação de palavras, colocação pronominal, regência, concordância, termos da oração, período composto, semântica, elementos da comunicação, funções da linguagem, morfologia, vozes verbais, figuras de linguagem, sinônimos, antônimos, homônimos, parônimos, signo linguístico, estrutura e formação de palavras. Para interpretação, use textos curtos.`,
            'Matemática': `Números Naturais e Inteiros, Divisibilidade, MMC, MDC, Decomposição em Fatores Primos, Números Racionais, Noções de Números Reais, Relação de Ordem, Valor Absoluto, Equação de 1º e 2º Grau, Problemas com as quatro operações, Função do 1º e 2º Grau, Progressão Aritmética e Geométrica, Soma de termos de PA e PG, Porcentagem, Razão, Proporção, Juros Simples e Noções de Estatística.`,
            'Informática': `MS-Windows 10 (pastas, arquivos, atalhos, área de trabalho, menus), atalhos do Windows (copiar, colar, etc), MS-Word 2016 (formatação de texto, tabelas, cabeçalhos, inserção de objetos), MS-Excel 2016 (planilhas, células, fórmulas, funções, gráficos), Correio eletrônico (envio de mensagens, anexos), Internet (navegação, URL, links, busca), MS Teams (chats, chamadas, grupos, reuniões).`,
            'CG/Atualidades': `Cenário cultural, político, econômico e social no Brasil e no Mundo, Organização Social, Cultural, Saúde, Meio Ambiente, Política e Economia Brasileira, conflitos nacionais e mundiais. Focar em eventos amplamente veiculados nos últimos dois anos.`
        };

        let detailedSubjects;
        if (subjects.includes('Prova Completa')) {
            detailedSubjects = `Língua Portuguesa (${syllabus['Língua Portuguesa']}), Matemática (${syllabus['Matemática']}), Informática (${syllabus['Informática']}) e Conhecimentos Gerais/Atualidades (${syllabus['CG/Atualidades']})`;
        } else {
            detailedSubjects = subjects.map(subject => `${subject} (${syllabus[subject]})`).join(', ');
        }
        
        const prompt = `
            Gere ${numQuestions} questões de múltipla escolha para um concurso público de nível médio, misturando os seguintes tópicos: ${detailedSubjects}.
            Para cada questão, forneça:
            1. O enunciado da pergunta.
            2. Uma lista com 4 opções de resposta.
            3. O índice da resposta correta (de 0 a 3).

            O formato de saída DEVE ser um array JSON válido, sem nenhum texto, comentários ou formatação adicional (como \`\`\`json).
            Exemplo de formato:
            [
                {
                    "question": "Qual a capital do Brasil?",
                    "options": ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"],
                    "correctAnswerIndex": 2
                },
                {
                    "question": "Quanto é 2 + 2?",
                    "options": ["3", "4", "5", "6"],
                    "correctAnswerIndex": 1
                }
            ]
        `;

        const resultText = await callGeminiAPI(prompt);
        if (resultText) {
            try {
                const cleanedJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
                questions = JSON.parse(cleanedJson);
                userAnswers = new Array(questions.length).fill(null);
                currentQuestionIndex = 0;
                displayQuestion();
            } catch (error) {
                console.error("Erro ao processar o JSON das questões:", error, "JSON recebido:", resultText);
                questionText.textContent = 'Houve um erro ao gerar as questões. Tente novamente.';
            }
        } else {
            questionText.textContent = 'Não foi possível obter as questões da API. Verifique o console para mais detalhes.';
        }
    };

    // Exibe a questão atual na tela
    const displayQuestion = () => {
        if (currentQuestionIndex < 0 || currentQuestionIndex >= questions.length) return;

        const currentQuestion = questions[currentQuestionIndex];
        questionCounter.textContent = `Questão ${currentQuestionIndex + 1} de ${questions.length}`;
        questionText.textContent = currentQuestion.question;
        optionsContainer.innerHTML = '';

        currentQuestion.options.forEach((option, index) => {
            const optionId = `q${currentQuestionIndex}_option${index}`;
            const optionElement = document.createElement('div');
            optionElement.innerHTML = `
                <input type="radio" name="question${currentQuestionIndex}" id="${optionId}" value="${index}" class="option-input">
                <label for="${optionId}" class="option-label">${option}</label>
            `;
            optionsContainer.appendChild(optionElement);
        });

        const savedAnswer = userAnswers[currentQuestionIndex];
        if (savedAnswer !== null) {
            const radioToCheck = document.querySelector(`#q${currentQuestionIndex}_option${savedAnswer}`);
            if (radioToCheck) radioToCheck.checked = true;
        }

        updateNavButtons();
    };

    // Atualiza o estado dos botões de navegação
    const updateNavButtons = () => {
        prevBtn.disabled = currentQuestionIndex === 0;
        if (currentQuestionIndex === questions.length - 1) {
            nextBtn.textContent = 'Finalizar';
        } else {
            nextBtn.textContent = 'Próxima';
        }
    };

    // Salva a resposta do usuário
    optionsContainer.addEventListener('change', (event) => {
        if (event.target.type === 'radio') {
            userAnswers[currentQuestionIndex] = parseInt(event.target.value);
        }
    });

    // Inicia o simulado
    setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedSubjects = [...document.querySelectorAll('input[name="subject"]:checked')].map(cb => cb.value);
        const num = parseInt(numQuestionsInput.value);

        if (selectedSubjects.length > 0 && num > 0) {
            fetchQuestions(selectedSubjects, num);
        } else {
            alert('Por favor, selecione ao menos uma matéria e um número de questões maior que zero.');
        }
    });

    // Navegação do Quiz
    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            displayQuestion();
        } else {
            calculateScore();
            switchScreen('results');
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            displayQuestion();
        }
    });

    skipBtn.addEventListener('click', () => {
        nextBtn.click();
    });

    cancelQuizBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm("Tem certeza que deseja cancelar o simulado? Seu progresso será perdido.")) {
            resetQuiz();
        }
    });

    // Calcula a pontuação final
    const calculateScore = () => {
        score = 0;
        for (let i = 0; i < questions.length; i++) {
            if (userAnswers[i] === questions[i].correctAnswerIndex) {
                score++;
            }
        }
        scoreText.textContent = `Sua pontuação: ${score}/${questions.length}`;
        feedbackContainer.innerHTML = '';
        reviewBtn.style.display = 'inline-block';
    };

    // Busca feedback para as questões erradas
    reviewBtn.addEventListener('click', async () => {
        const wrongQuestions = [];
        for (let i = 0; i < questions.length; i++) {
            if (userAnswers[i] !== questions[i].correctAnswerIndex) {
                wrongQuestions.push({
                    question: questions[i].question,
                    userAnswer: userAnswers[i] !== null ? questions[i].options[userAnswers[i]] : "Não respondida",
                    correctAnswer: questions[i].options[questions[i].correctAnswerIndex]
                });
            }
        }

        if (wrongQuestions.length === 0) {
            feedbackContainer.innerHTML = '<p>Parabéns! Você não errou nenhuma questão.</p>';
            reviewBtn.style.display = 'none';
            return;
        }

        feedbackContainer.innerHTML = '<p>Analisando seus erros e gerando dicas de estudo...</p>';

        const prompt = `
            O usuário errou as seguintes questões em um simulado de concurso.
            Para cada erro, forneça um feedback construtivo e didático, explicando por que a resposta correta é a certa e qual o conceito principal que o usuário deve estudar para não errar novamente.
            Formate a resposta de forma clara. Use **títulos em negrito** para cada questão.
            Questões erradas: ${JSON.stringify(wrongQuestions)}
        `;

        const feedbackText = await callGeminiAPI(prompt);
        if (feedbackText) {
            let formattedFeedback = feedbackText
                .replace(/\*\*(.*?)\*\*/g, '<h3>$1</h3>')
                .replace(/\*/g, '')
                .replace(/\n/g, '<br>');
            feedbackContainer.innerHTML = formattedFeedback;
        } else {
            feedbackContainer.innerHTML = '<p>Não foi possível gerar o feedback no momento.</p>';
        }
        reviewBtn.style.display = 'none';
    });

    // Reseta o quiz para o estado inicial
    const resetQuiz = () => {
        questions = [];
        userAnswers = [];
        currentQuestionIndex = 0;
        score = 0;
        setupForm.reset();
        numQuestionsInput.value = 1;
        switchScreen('setup');
    };

    menuBtn.addEventListener('click', resetQuiz);


    // --- CÓDIGO PARA ELEMENTOS ANIMADOS ---
    const svgs = [
        `<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-6.6-4.35-9.33-8.19C.75 10.05 1.6 5.9 5.4 5.4c2.19-.3 3.84 1.29 4.6 2.7.76-1.41 2.41-3 4.6-2.7 3.8.5 4.65 4.65 2.73 7.41C18.6 16.65 12 21 12 21Z" fill="#4A5C2E"/><path d="M16 6.5l.5 1.5L18 8l-1.5.5L16 10l-.5-1.5L14 8l1.5-.5.5-1.5Z" fill="#f9f9f9"/></svg>`,
        `<svg viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="32" rx="20" ry="8" stroke="#4A5C2E" stroke-width="1.5"/><ellipse cx="32" cy="32" rx="14" ry="6" stroke="#4A5C2E" stroke-width="1.5" transform="rotate(25 32 32)"/><path d="M24 24l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" fill="#4A5C2E"/><path d="M42 40l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" fill="#4A5C2E"/></svg>`,
        `<svg viewBox="0 0 24 24" fill="#4A5C2E"><path d="M8 8l.7 2.3L11 11l-2.3.7L8 14l-.7-2.3L5 11l2.3-.7L8 8Zm8 0l.7 2.3L19 11l-2.3.7L16 14l-.7-2.3L13 11l2.3-.7L16 8Zm-4 4l.7 2.3L15 15l-2.3.7L12 18l-.7-2.3L9 15l2.3-.7L12 12Z"/></svg>`,
        `<svg viewBox="0 0 100 100" fill="none"><path d="M50 10C30 30 30 70 50 90C70 70 70 30 50 10Z" stroke="#4A5C2E" stroke-width="1.2"/><path d="M10 50C30 30 70 30 90 50C70 70 30 70 10 50Z" stroke="#4A5C2E" stroke-width="1.2"/><path d="M25 25C45 15 55 15 75 25C85 45 85 55 75 75C55 85 45 85 25 75C15 55 15 45 25 25Z" stroke="#4A5C2E" stroke-width="1.2"/></svg>`
    ];

    function criarElemento() {
        const elemento = document.createElement('div');
        elemento.classList.add('elemento');
        elemento.innerHTML = svgs[Math.floor(Math.random() * svgs.length)];

        elemento.style.left = Math.random() * (window.innerWidth - 80) + 'px';
        elemento.style.top = Math.random() * (window.innerHeight - 80) + 'px';
        document.body.appendChild(elemento);

        let dx = (Math.random() - 0.5) * 2;
        let dy = (Math.random() - 0.5) * 2;

        function mover() {
            const rect = elemento.getBoundingClientRect();
            let x = rect.left + dx;
            let y = rect.top + dy;

            if (x <= 0 || x >= window.innerWidth - rect.width) {
                dx = (Math.random() - 0.5) * 4;
            }
            if (y <= 0 || y >= window.innerHeight - rect.height) {
                dy = (Math.random() - 0.5) * 4;
            }

            elemento.style.left = `${rect.left + dx}px`;
            elemento.style.top = `${rect.top + dy}px`;
        }

        const moveInterval = setInterval(mover, 30);

        setTimeout(() => {
            clearInterval(moveInterval);
            elemento.style.opacity = '0';
            setTimeout(() => elemento.remove(), 500);
        }, 5000);

        elemento.addEventListener('click', () => {
            elemento.classList.add('explode');
            setTimeout(() => {
                elemento.remove();
                criarElemento();
            }, 400);
        });
    }

    setInterval(criarElemento, 1000);

});