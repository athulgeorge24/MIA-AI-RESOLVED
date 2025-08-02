// Load API key from environment variable or localStorage
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

let API_KEY = process.env.GROQ_API_KEY || localStorage.getItem('GROQ_API_KEY');

// DOM Elements
const modelSelect = document.getElementById('model-select');
const promptInput = document.getElementById('prompt-input');
const submitBtn = document.getElementById('submit-btn');
const clearBtn = document.getElementById('clear-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const responseArea = document.getElementById('response-area');

// App State
let currentModel = 'llama3-8b-8192';
let isDarkTheme = false;

// Check if API key is available or prompt user to enter it
function checkApiKey() {
    API_KEY = localStorage.getItem('GROQ_API_KEY');
    if (!API_KEY) {
        const apiKeyPrompt = prompt('Please enter your Groq API key:');
        if (apiKeyPrompt) {
            localStorage.setItem('GROQ_API_KEY', apiKeyPrompt.trim());
            API_KEY = apiKeyPrompt.trim();
            window.location.reload();
        } else {
            responseArea.innerHTML = `<p class="error">Error: API key not provided. You can get a Groq API key from <a href="https://console.groq.com/" target="_blank">https://console.groq.com/</a></p>`;
        }
    }
}

// Load preferences
function loadSavedPreferences() {
    checkApiKey();

    const savedModel = localStorage.getItem('model');
    if (savedModel) {
        currentModel = savedModel;
        modelSelect.value = currentModel;
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || !savedTheme) {
        isDarkTheme = true;
        document.body.classList.add('dark-theme');
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        isDarkTheme = false;
        document.body.classList.remove('dark-theme');
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Save preferences
function savePreferences() {
    localStorage.setItem('model', currentModel);
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
}

// Generate AI response
async function generateResponse(prompt) {
    try {
        const currentApiKey = localStorage.getItem('GROQ_API_KEY');
        if (!currentApiKey) {
            checkApiKey();
            return;
        }

        const loadingMsg = document.createElement('p');
        loadingMsg.className = 'loading';
        loadingMsg.textContent = 'Generating response...';
        responseArea.appendChild(loadingMsg);
        scrollToBottom();
        submitBtn.disabled = true;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentApiKey}`
            },
            body: JSON.stringify({
                model: currentModel,
                messages: [
                    { role: 'system', content: 'You are a helpful AI assistant.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Raw error:", errorText);

            // Remove key if auth fails
            if (response.status === 401 || errorText.includes('invalid') || errorText.includes('key')) {
                localStorage.removeItem('GROQ_API_KEY');
                responseArea.innerHTML = `<p class="error">Error: Invalid API key. Refresh the page and enter a new one.</p>`;
            } else {
                responseArea.innerHTML = `<p class="error">Error: ${errorText}</p>`;
            }
            return;
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;

        const aiBubble = document.createElement('div');
        aiBubble.className = 'message ai-message chat-bubble';
        aiBubble.innerHTML = formatResponse(aiResponse);
        responseArea.appendChild(aiBubble);
        scrollToBottom();

        const copyButton = document.createElement('button');
        copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyButton.classList.add('copy-btn');
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(aiResponse);
            copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
            }, 2000);
        });

        responseArea.appendChild(copyButton);

    } catch (error) {
        console.error("JS Error:", error);
        responseArea.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    } finally {
        submitBtn.disabled = false;
        promptInput.focus();
    }
}

// Format response (code blocks etc.)
function formatResponse(text) {
    return text.replace(/```([a-z]*)\n?([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>');
}

// Theme toggle
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggleBtn.innerHTML = isDarkTheme ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    savePreferences();
}

// Event listeners
submitBtn.addEventListener('click', () => {
    const prompt = promptInput.value.trim();
    if (prompt) {
        const userBubble = document.createElement('div');
        userBubble.className = 'message user-message chat-bubble';
        userBubble.textContent = prompt;
        responseArea.appendChild(userBubble);
        scrollToBottom();
        promptInput.value = '';
        generateResponse(prompt);
    }
});

clearBtn.addEventListener('click', () => {
    promptInput.value = '';
    responseArea.innerHTML = '';
});

modelSelect.addEventListener('change', (e) => {
    currentModel = e.target.value;
    savePreferences();
});

themeToggleBtn.addEventListener('click', toggleTheme);

promptInput.addEventListener("keydown", (e) => {
    const isEnter = e.key === "Enter";
    const isShiftEnter = e.shiftKey && isEnter;

    if (isEnter && !isShiftEnter) {
        e.preventDefault();
        submitBtn.click();
    }
});

function scrollToBottom() {
    responseArea.scrollTop = responseArea.scrollHeight;
}

// Initialize app
loadSavedPreferences();
