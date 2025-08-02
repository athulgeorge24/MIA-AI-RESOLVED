const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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
let API_KEY = null;

// === API Key Handling ===
function encryptKey(key) {
    return btoa(key); // Base64 encode
}

function decryptKey(encoded) {
    return atob(encoded);
}

function checkApiKey() {
    const encodedKey = sessionStorage.getItem('GROQ_API_KEY');
    if (!encodedKey) {
        showApiKeyPrompt();
    } else {
        API_KEY = decryptKey(encodedKey);
    }
}

function showApiKeyPrompt() {
    const apiKeyPrompt = prompt('Enter your Groq API key:');
    if (apiKeyPrompt) {
        const encrypted = encryptKey(apiKeyPrompt.trim());
        sessionStorage.setItem('GROQ_API_KEY', encrypted);
        API_KEY = apiKeyPrompt.trim();
        window.location.reload();
    } else {
        responseArea.innerHTML = `<p class="error">API key required. Get one from <a href="https://console.groq.com/" target="_blank">Groq Console</a></p>`;
    }
}

// === Preferences ===
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

function savePreferences() {
    localStorage.setItem('model', currentModel);
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
}

// === Response Generation ===
async function generateResponse(prompt) {
    try {
        if (!API_KEY || API_KEY.length < 10) {
            showApiKeyPrompt();
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
                'Authorization': `Bearer ${API_KEY}`
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

        responseArea.removeChild(loadingMsg);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Raw error:", errorText);

            if (response.status === 401 || errorText.includes('invalid') || errorText.includes('key')) {
                sessionStorage.removeItem('GROQ_API_KEY');
                responseArea.innerHTML = `<p class="error">Error: Invalid API key. Please refresh and enter a new one.</p>`;
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

// === Helpers ===
function formatResponse(text) {
    return text.replace(/```([a-z]*)\n?([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>');
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggleBtn.innerHTML = isDarkTheme ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    savePreferences();
}

function scrollToBottom() {
    responseArea.scrollTop = responseArea.scrollHeight;
}

// === Event Listeners ===
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

// Optional: Add a "Change API Key" button if you include it in HTML
const changeKeyBtn = document.getElementById('change-key-btn');
if (changeKeyBtn) {
    changeKeyBtn.addEventListener('click', () => {
        sessionStorage.removeItem('GROQ_API_KEY');
        showApiKeyPrompt();
    });
}

// === Init ===
loadSavedPreferences();
