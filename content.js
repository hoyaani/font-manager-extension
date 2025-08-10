// Content script for Font Manager Extension

(function() {
    'use strict';

    let currentSettings = {};
    let isInitialized = false;

    // 初始化內容腳本
    async function initialize() {
        if (isInitialized) return;

        try {
            const hostname = window.location.hostname;
            await loadAndApplySettings(hostname);
            setupMessageListener();
            isInitialized = true;
            console.log('Font Manager: Content script initialized for', hostname);
        } catch (error) {
            console.error('Font Manager: Initialization error:', error);
        }
    }

    // 載入並套用設定
    async function loadAndApplySettings(hostname) {
        try {
            const response = await browser.runtime.sendMessage({
                action: 'getSettings',
                hostname: hostname
            });

            if (response && response.settings) {
                currentSettings = response.settings;
                applySettings(currentSettings);
            }
        } catch (error) {
            console.error('Font Manager: Error loading settings:', error);
        }
    }

    // 設定消息監聽器
    function setupMessageListener() {
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'adjustFontSize':
                    adjustFontSize(message.delta);
                    sendResponse({ success: true });
                    break;

                case 'resetFont':
                    resetFontSettings();
                    sendResponse({ success: true });
                    break;

                case 'applySettings':
                    if (message.settings) {
                        currentSettings = message.settings;
                        applySettings(currentSettings);
                    }
                    sendResponse({ success: true });
                    break;

                case 'reloadSettings':
                    loadAndApplySettings(window.location.hostname);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ error: 'Unknown action' });
            }
        });
    }

    // 套用字體設定
    function applySettings(settings) {
        try {
            // 移除之前的樣式
            removeExistingStyles();

            // 創建新的樣式規則
            const styleRules = generateStyleRules(settings);

            // 注入樣式
            injectStyles(styleRules);

            console.log('Font Manager: Settings applied:', settings);
        } catch (error) {
            console.error('Font Manager: Error applying settings:', error);
        }
    }

    // 生成CSS樣式規則
    function generateStyleRules(settings) {
        const rules = [];

        // 基本字體設定
        if (settings.fontSize && settings.fontSize !== 16) {
            rules.push(`* { font-size: ${settings.fontSize}px !important; }`);
        }

        if (settings.textColor && settings.textColor !== '#000000') {
            rules.push(`body, body * { color: ${settings.textColor} !important; }`);
        }

        if (settings.backgroundColor && settings.backgroundColor !== '#ffffff') {
            rules.push(`body { background-color: ${settings.backgroundColor} !important; }`);
        }

        if (settings.fontFamily && settings.fontFamily !== 'Default Font') {
            const fontFamily = settings.fontFamily === 'Default Font' ?
                'Arial, sans-serif' : settings.fontFamily;
            rules.push(`body, body * { font-family: ${fontFamily} !important; }`);
        }

        // 連結設定
        if (settings.underlineLinks === false) {
            rules.push(`a { text-decoration: none !important; }`);
        } else if (settings.underlineLinks === true) {
            rules.push(`a { text-decoration: underline !important; }`);
        }

        if (settings.colorLinks === false) {
            rules.push(`a { color: inherit !important; }`);
        } else if (settings.colorLinks === true && settings.textColor !== '#000000') {
            rules.push(`a { color: #1a73e8 !important; }`);
        }

        // 確保重要元素的可讀性
        rules.push(`
            input, textarea, select, button {
                background-color: white !important;
                color: black !important;
                border: 1px solid #ccc !important;
            }

            input:focus, textarea:focus, select:focus {
                outline: 2px solid #4285f4 !important;
            }

            ::placeholder {
                color: #666 !important;
            }
        `);

        return rules.join('\n');
    }

    // 注入樣式
    function injectStyles(styleRules) {
        if (!styleRules.trim()) return;

        const styleElement = document.createElement('style');
        styleElement.id = 'font-manager-styles';
        styleElement.textContent = styleRules;

        // 優先插入到 head，如果沒有 head 就插入到文檔開始
        const targetElement = document.head || document.documentElement;
        targetElement.appendChild(styleElement);
    }

    // 移除現有樣式
    function removeExistingStyles() {
        const existingStyle = document.getElementById('font-manager-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
    }

    // 調整字體大小
    function adjustFontSize(delta) {
        const newSize = Math.max(8, Math.min(72, (currentSettings.fontSize || 16) + delta));
        currentSettings.fontSize = newSize;
        applySettings(currentSettings);

        // 保存到當前網站設定
        saveCurrentSettings();

        // 顯示臨時通知
        showTemporaryNotification(`字體大小: ${newSize}px`);
    }

    // 重置字體設定
    async function resetFontSettings() {
        try {
            // 獲取全局預設設定
            const response = await browser.runtime.sendMessage({
                action: 'getSettings',
                hostname: '__global__'
            });

            if (response && response.settings) {
                currentSettings = response.settings;
                applySettings(currentSettings);
                showTemporaryNotification('字體設定已重置');
            }
        } catch (error) {
            console.error('Font Manager: Error resetting font:', error);
        }
    }

    // 保存當前設定到網站特定設定
    async function saveCurrentSettings() {
        try {
            await browser.runtime.sendMessage({
                action: 'saveSettings',
                hostname: window.location.hostname,
                settings: {
                    ...currentSettings,
                    lastModified: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Font Manager: Error saving settings:', error);
        }
    }

    // 顯示臨時通知
    function showTemporaryNotification(message) {
        // 移除現有通知
        const existing = document.getElementById('font-manager-notification');
        if (existing) {
            existing.remove();
        }

        // 創建新通知
        const notification = document.createElement('div');
        notification.id = 'font-manager-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(66, 133, 244, 0.95);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            transition: all 0.3s ease;
            transform: translateX(400px);
            opacity: 0;
        `;

        document.body.appendChild(notification);

        // 觸發進入動畫
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);

        // 自動隱藏
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2500);
    }

    // 檢測頁面變化並重新套用設定
    function observePageChanges() {
        // 監聽動態內容變化
        const observer = new MutationObserver((mutations) => {
            let shouldReapply = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // 檢查是否有重要的新節點添加
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName && ['DIV', 'SPAN', 'P', 'A', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName)) {
                                shouldReapply = true;
                                break;
                            }
                        }
                    }
                }
            });

            if (shouldReapply) {
                // 延遲重新套用，避免過於頻繁
                clearTimeout(observer.reapplyTimer);
                observer.reapplyTimer = setTimeout(() => {
                    applySettings(currentSettings);
                }, 500);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 頁面加載完成後初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // 開始監聽頁面變化
    if (document.body) {
        observePageChanges();
    } else {
        document.addEventListener('DOMContentLoaded', observePageChanges);
    }

    // 監聽頁面可見性變化，重新套用設定
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && currentSettings) {
            setTimeout(() => applySettings(currentSettings), 100);
        }
    });

})();