document.addEventListener('DOMContentLoaded', init);

let colorHistory = [];

async function init() {
    await loadHistory();
    initEventListeners();
    renderHistory();
}

function initEventListeners() {
    document.getElementById('pickColorBtn').addEventListener('click', pickColor);
    document.getElementById('colorInput').addEventListener('input', (e) => {
        handleColorPick(e.target.value);
    });
    
    // 为历史颜色容器添加事件委托
    document.getElementById('colorHistory').addEventListener('click', (e) => {
        const colorElement = e.target.closest('.history-color');
        if (colorElement) {
            const color = colorElement.getAttribute('data-color');
            handleColorPick(color);
        }
    });
}

async function pickColor() {
    if (!window.EyeDropper) {
        showMessage('当前浏览器不支持取色器');
        return;
    }

    try {
        const eyeDropper = new EyeDropper();
        const { sRGBHex } = await eyeDropper.open();
        handleColorPick(sRGBHex);
    } catch (error) {
        console.log('取色取消');
    }
}

async function handleColorPick(color) {
    document.getElementById('colorPreview').style.background = color;
    document.getElementById('colorInput').value = color;
    await copyToClipboard(color);
    showMessage(`已复制：${color}`);
    await addToHistory(color);
}

async function copyToClipboard(text) {
    try {
        // 优先使用现代 Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        
        // 回退到传统方法
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) {
            throw new Error('复制失败');
        }
    } catch (error) {
        console.error('复制失败:', error);
        showMessage('复制失败，请手动复制', 3000);
    }
}

async function loadHistory() {
    const result = await chrome.storage.local.get('colorHistory');
    colorHistory = result.colorHistory || [];
}

async function saveHistory() {
    await chrome.storage.local.set({ colorHistory });
}

async function addToHistory(color) {
    // 如果颜色已存在，先移除它
    const index = colorHistory.indexOf(color);
    if (index !== -1) {
        colorHistory.splice(index, 1);
    }
    
    // 将新颜色添加到最前面
    colorHistory = [color, ...colorHistory].slice(0, 10);
    await saveHistory();
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('colorHistory');
    container.innerHTML = colorHistory.map(color => `
        <div class="history-color" 
             style="background: ${color}" 
             data-color="${color}"
             title="${color}"></div>
    `).join('');
}

function showMessage(text, duration = 2000) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.style.display = 'block';
    message.style.opacity = '1';
    
    // 根据消息类型设置不同的样式
    if (text.includes('已复制')) {
        message.style.background = '#f0f9eb';
        message.style.color = '#67c23a';
        message.style.borderLeft = '4px solid #67c23a';
    } else if (text.includes('不支持') || text.includes('失败')) {
        message.style.background = '#fef0f0';
        message.style.color = '#f56c6c';
        message.style.borderLeft = '4px solid #f56c6c';
    }
    
    // 添加淡出效果
    setTimeout(() => {
        message.style.opacity = '0';
        setTimeout(() => {
            message.style.display = 'none';
        }, 300);
    }, duration);
}