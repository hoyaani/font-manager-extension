// Background Script for Font Manager Extension

// 安裝時初始化預設設定
browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // 設定預設值
        const defaultSettings = {
            fontSize: 16,
            textColor: '#000000',
            backgroundColor: '#ffffff',
            fontFamily: 'Default Font',
            underlineLinks: true,
            colorLinks: true,
            enabled: true
        };

        browser.storage.local.set({
            globalSettings: defaultSettings,
            siteSettings: {},
            isEnabled: true
        });

        // 顯示歡迎通知
        browser.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-48.png',
            title: '字體管理器已安裝',
            message: '點擊工具欄圖標開始使用字體管理功能！'
        });
    }
});

// 處理快捷鍵命令
browser.commands.onCommand.addListener((command) => {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            switch (command) {
                case 'increase-font':
                    browser.tabs.sendMessage(tabs[0].id, { 
                        action: 'adjustFontSize', 
                        delta: 2 
                    });
                    break;
                case 'decrease-font':
                    browser.tabs.sendMessage(tabs[0].id, { 
                        action: 'adjustFontSize', 
                        delta: -2 
                    });
                    break;
                case 'reset-font':
                    browser.tabs.sendMessage(tabs[0].id, { 
                        action: 'resetFont' 
                    });
                    break;
            }
        }
    });
});

// 監聽來自content script的消息
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'getSettings':
            getSettingsForSite(message.hostname)
                .then(settings => sendResponse({ settings }))
                .catch(error => sendResponse({ error: error.message }));
            return true; // 保持消息通道開放

        case 'saveSettings':
            saveSettingsForSite(message.hostname, message.settings)
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ error: error.message }));
            return true;

        case 'exportConfig':
            exportConfiguration()
                .then(config => sendResponse({ config }))
                .catch(error => sendResponse({ error: error.message }));
            return true;

        case 'importConfig':
            importConfiguration(message.config)
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ error: error.message }));
            return true;

        case 'showNotification':
            browser.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon-48.png',
                title: '字體管理器',
                message: message.text
            });
            sendResponse({ success: true });
            break;
    }
});

// 獲取特定網站的設定
async function getSettingsForSite(hostname) {
    try {
        const result = await browser.storage.local.get(['globalSettings', 'siteSettings']);
        const globalSettings = result.globalSettings || getDefaultSettings();
        const siteSettings = result.siteSettings || {};
        
        // 合併全局設定和網站特定設定
        const finalSettings = {
            ...globalSettings,
            ...siteSettings[hostname]
        };

        return finalSettings;
    } catch (error) {
        console.error('Error getting settings:', error);
        return getDefaultSettings();
    }
}

// 保存特定網站的設定
async function saveSettingsForSite(hostname, settings) {
    try {
        const result = await browser.storage.local.get(['siteSettings']);
        const siteSettings = result.siteSettings || {};
        
        siteSettings[hostname] = settings;
        
        await browser.storage.local.set({ siteSettings });
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
}

// 導出配置
async function exportConfiguration() {
    try {
        const result = await browser.storage.local.get(['globalSettings', 'siteSettings']);
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            globalSettings: result.globalSettings || getDefaultSettings(),
            siteSettings: result.siteSettings || {},
            metadata: {
                exportedBy: 'Font Manager Extension',
                totalSites: Object.keys(result.siteSettings || {}).length
            }
        };
    } catch (error) {
        console.error('Error exporting configuration:', error);
        throw error;
    }
}

// 導入配置
async function importConfiguration(config) {
    try {
        if (!config.version || !config.globalSettings) {
            throw new Error('Invalid configuration file format');
        }

        await browser.storage.local.set({
            globalSettings: config.globalSettings,
            siteSettings: config.siteSettings || {}
        });

        // 通知所有開啟的分頁重新載入設定
        browser.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                browser.tabs.sendMessage(tab.id, { 
                    action: 'reloadSettings' 
                }).catch(() => {
                    // 忽略無法發送消息的分頁（如chrome://頁面）
                });
            });
        });

        return true;
    } catch (error) {
        console.error('Error importing configuration:', error);
        throw error;
    }
}

// 獲取預設設定
function getDefaultSettings() {
    return {
        fontSize: 16,
        textColor: '#000000',
        backgroundColor: '#ffffff',
        fontFamily: 'Default Font',
        underlineLinks: true,
        colorLinks: true,
        enabled: true
    };
}

// 監聽分頁更新事件，自動套用設定
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        try {
            const url = new URL(tab.url);
            const hostname = url.hostname;
            
            // 獲取並套用該網站的設定
            getSettingsForSite(hostname).then(settings => {
                browser.tabs.sendMessage(tabId, {
                    action: 'applySettings',
                    settings: settings
                }).catch(() => {
                    // 忽略無法發送消息的分頁
                });
            });
        } catch (error) {
            // 無效的URL，忽略
        }
    }
});

// 監聽瀏覽器啟動事件
browser.runtime.onStartup.addListener(() => {
    // 檢查擴充功能狀態
    browser.storage.local.get(['isEnabled']).then(result => {
        if (result.isEnabled !== false) {
            console.log('Font Manager Extension started');
        }
    });
});

// 處理擴充功能圖標點擊（如果popup無法開啟時的備用）
browser.browserAction.onClicked.addListener((tab) => {
    // 這個事件只在沒有popup時觸發
    // 可以在這裡實現備用功能，如開啟選項頁面
    browser.runtime.openOptionsPage();
});