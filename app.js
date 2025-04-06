// Load API key from environment variable or prompt the user if not found
const API_KEY = process.env.GROQ_API_KEY || localStorage.getItem('GROQ_API_KEY');
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

// Check if API key is available or prompt user to enter it
function checkApiKey() {
    if (!API_KEY) {
        const apiKeyPrompt = prompt('Please enter your Groq API key:');
        
        if (apiKeyPrompt) {
            // Save API key to localStorage for future use
            localStorage.setItem('GROQ_API_KEY', apiKeyPrompt);
            // Reload the page to use the new API key
            window.location.reload();
        } else {
            responseArea.innerHTML = `<p class="error">Error: API key not provided. You can get a Groq API key from <a href="https://console.groq.com/" target="_blank">https://console.groq.com/</a></p>`;
        }
    }
}

// Load saved preferences from localStorage
function loadSavedPreferences() {
    checkApiKey();

    const savedModel = localStorage.getItem('model');
    if (savedModel) {
        currentModel = savedModel;
        modelSelect.value = currentModel;
    }

    // Set default theme to dark mode if no theme is saved
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || !savedTheme) { // Default to dark mode if no theme is saved
        isDarkTheme = true;
        document.body.classList.add('dark-theme');
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        isDarkTheme = false;
        document.body.classList.remove('dark-theme');
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Save preferences to localStorage
function savePreferences() {
    localStorage.setItem('model', currentModel);
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');

    // Ensure the default theme is set to dark if no theme exists
    if (!localStorage.getItem('theme')) {
        localStorage.setItem('theme', 'dark');
    }
}

// Generate AI response
async function generateResponse(prompt) {
    try {
        const currentApiKey = process.env.GROQ_API_KEY || localStorage.getItem('GROQ_API_KEY');
        
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
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }
        
        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        const aiBubble = document.createElement('div');
        aiBubble.className = 'message ai-message chat-bubble';
        aiBubble.innerHTML = formatResponse(aiResponse);
        responseArea.appendChild(aiBubble);
        scrollToBottom();
        
        const loadingEl = document.getElementById('loading-message');
        if (loadingEl) loadingEl.remove();

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
        if (error.message.includes('API key') || error.message.includes('authentication') || error.message.includes('Authorization')) {
            localStorage.removeItem('GROQ_API_KEY');
            responseArea.innerHTML = `<p class="error">Error: Invalid API key. Please refresh the page to enter a new key.</p>`;
        } else {
            responseArea.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        }
    } finally {
        submitBtn.disabled = false;
        promptInput.focus();
    }
}

// Format the AI response with HTML
function formatResponse(text) {
    text = text.replace(/```([a-z]*)([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>');
    return text;
}

// Toggle theme
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggleBtn.innerHTML = isDarkTheme ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    savePreferences();
}

// Event Listeners
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

// Initialize the app
loadSavedPreferences();

function scrollToBottom() {
    responseArea.scrollTop = responseArea.scrollHeight;
}

// UPDATED keydown event listener for Enter/Return to submit the form
promptInput.addEventListener("keydown", (e) => {
    const isEnter = e.key === "Enter"; // Check if Enter key is pressed
    const isCtrlEnter = e.ctrlKey && isEnter; // Check if Ctrl + Enter is pressed
    const isShiftEnter = e.shiftKey && isEnter; // Check if Shift + Enter is pressed

    if (isEnter && !isShiftEnter) {
        // If Enter is pressed without Shift, prevent default behavior and trigger submit
        e.preventDefault(); // Prevent newline creation
        submitBtn.click(); // Trigger the submit button click
    }
    // If Shift + Enter is pressed, allow the default behavior (newline creation)
});
