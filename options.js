// Options page script for Font Manager Extension

document.addEventListener('DOMContentLoaded', () => {
    initializeOptionsPage();
});

// 初始化選項頁面
async function initializeOptionsPage() {
    try {
        await loadGlobalSettings();
        await loadSiteSettings();
        await updateStatistics();
        setupEventListeners();
        console.log('Options page initialized successfully');
    } catch (error) {
        console.error('Error initializing options page:', error);
        showNotification('初始化失敗', 'error');
    }
}

// 設定事件監聽器
function setupEventListeners() {
    // 全局設定相關
    document.getElementById('saveGlobalSettings').addEventListener('click', saveGlobalSettings);

    // 顏色選擇器同步
    setupColorSyncListeners();

    // 網站設定相關
    document.getElementById('refreshSiteList').addEventListener('click', loadSiteSettings);
    document.getElementById('clearAllSiteSettings').addEventListener('click', clearAllSiteSettings);

    // 配置管理相關
    document.getElementById('exportConfig').addEventListener('click', exportConfiguration);
    document.getElementById('importConfig').addEventListener('change', importConfiguration);
    document.getElementById('resetToDefault').addEventListener('click', resetToDefault);
    document.getElementById('clearAllData').addEventListener('click', clearAllData);
}

// 設定顏色選擇器同步
function setupColorSyncListeners() {
    // 文字顏色同步
    const textColor = document.getElementById('globalTextColor');
    const textColorPicker = document.getElementById('globalTextColorPicker');

    textColor.addEventListener('change', () => {
        textColorPicker.value = textColor.value;
    });

    textColorPicker.addEventListener('change', () => {
        textColor.value = textColorPicker.value;
    });

    // 背景顏色同步
    const bgColor = document.getElementById('globalBgColor');
    const bgColorPicker = document.getElementById('globalBgColorPicker');

    bgColor.addEventListener('change', () => {
        bgColorPicker.value = bgColor.value;
    });

    bgColorPicker.addEventListener('change', () => {
        bgColor.value = bgColorPicker.value;
    });
}

// 載入全局設定
async function loadGlobalSettings() {
    try {
        const result = await browser.storage.local.get(['globalSettings']);
        const settings = result.globalSettings || getDefaultSettings();

        document.getElementById('globalFontSize').value = settings.fontSize || 16;
        document.getElementById('globalTextColor').value = settings.textColor || '#000000';
        document.getElementById('globalTextColorPicker').value = settings.textColor || '#000000';
        document.getElementById('globalBgColor').value = settings.backgroundColor || '#ffffff';
        document.getElementById('globalBgColorPicker').value = settings.backgroundColor || '#ffffff';
        document.getElementById('globalFontFamily').value = settings.fontFamily || 'Default Font';
        document.getElementById('globalUnderlineLinks').checked = settings.underlineLinks !== false;
        document.getElementById('globalColorLinks').checked = settings.colorLinks !== false;

    } catch (error) {
        console.error('Error loading global settings:', error);
        showNotification('載入全局設定失敗', 'error');
    }
}

// 保存全局設定
async function saveGlobalSettings() {
    try {
        const settings = {
            fontSize: parseInt(document.getElementById('globalFontSize').value),
            textColor: document.getElementById('globalTextColor').value,
            backgroundColor: document.getElementById('globalBgColor').value,
            fontFamily: document.getElementById('globalFontFamily').value,
            underlineLinks: document.getElementById('globalUnderlineLinks').checked,
            colorLinks: document.getElementById('globalColorLinks').checked,
            lastModified: new Date().toISOString()
        };

        await browser.storage.local.set({ globalSettings: settings });
        showNotification('全局設定已保存', 'success');

        // 通知所有開啟的分頁重新載入設定
        const tabs = await browser.tabs.query({});
        tabs.forEach(tab => {
            browser.tabs.sendMessage(tab.id, {
                action: 'reloadSettings'
            }).catch(() => {
                // 忽略無法發送消息的分頁
            });
        });

    } catch (error) {
        console.error('Error saving global settings:', error);
        showNotification('保存設定失敗', 'error');
    }
}

// 載入網站特定設定
async function loadSiteSettings() {
    try {
        const result = await browser.storage.local.get(['siteSettings']);
        const siteSettings = result.siteSettings || {};

        const siteList = document.getElementById('siteList');

        if (Object.keys(siteSettings).length === 0) {
            siteList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">尚無網站特定設定</p>';
            return;
        }

        const siteItems = Object.entries(siteSettings).map(([hostname, settings]) => {
            const lastModified = settings.lastModified ?
                new Date(settings.lastModified).toLocaleString('zh-TW') : '未知';

            return `
                <div class="site-item">
                    <div>
                        <strong>${hostname}</strong>
                        <br>
                        <small style="color: #666;">
                            字體: ${settings.fontSize || 16}px,
                            字體族: ${settings.fontFamily || 'Default'},
                            修改: ${lastModified}
                        </small>
                    </div>
                    <div>
                        <button class="btn btn-secondary" onclick="editSiteSettings('${hostname}')">編輯</button>
                        <button class="btn btn-danger" onclick="deleteSiteSettings('${hostname}')">刪除</button>
                    </div>
                </div>
            `;
        }).join('');

        siteList.innerHTML = siteItems;

    } catch (error) {
        console.error('Error loading site settings:', error);
        showNotification('載入網站設定失敗', 'error');
    }
}

// 刪除特定網站設定
async function deleteSiteSettings(hostname) {
    if (!confirm(`確定要刪除 ${hostname} 的設定嗎？`)) {
        return;
    }

    try {
        const result = await browser.storage.local.get(['siteSettings']);
        const siteSettings = result.siteSettings || {};

        if (siteSettings[hostname]) {
            delete siteSettings[hostname];
            await browser.storage.local.set({ siteSettings });

            // 重新加載網站列表
            await loadSiteSettings();

            // 通知相關標籤頁重新加載設置
            const tabs = await browser.tabs.query({});
            tabs.forEach(tab => {
                try {
                    const url = new URL(tab.url);
                    if (url.hostname === hostname) {
                        browser.tabs.sendMessage(tab.id, { action: 'reloadSettings' });
                    }
                } catch (e) {
                    // 忽略無效URL
                }
            });

            showNotification(`已刪除 ${hostname} 的設定`, 'success');
        }
    } catch (error) {
        console.error('Error deleting site settings:', error);
        showNotification('刪除設定失敗', 'error');
    }
}

// 編輯網站設定（需要在HTML中添加對應的表單）
async function editSiteSettings(hostname) {
    // 這裡可以實現編輯網站特定設定的邏輯
    // 例如彈出一個編輯表單，加載該網站的當前設定
    alert(`編輯 ${hostname} 的設定功能即將推出！`);
}

// 清除所有網站設定
async function clearAllSiteSettings() {
    if (!confirm('確定要清除所有網站的特定設定嗎？這項操作無法撤銷！')) {
        return;
    }

    try {
        await browser.storage.local.set({ siteSettings: {} });
        await loadSiteSettings();

        // 通知所有標籤頁重新加載設置
        const tabs = await browser.tabs.query({});
        tabs.forEach(tab => {
            browser.tabs.sendMessage(tab.id, { action: 'reloadSettings' }).catch(() => {
                // 忽略無法發送消息的分頁
            });
        });

        showNotification('所有網站設定已清除', 'success');
    } catch (error) {
        console.error('Error clearing all site settings:', error);
        showNotification('清除設定失敗', 'error');
    }
}

// 導出配置
async function exportConfiguration() {
    try {
        const config = await browser.runtime.sendMessage({ action: 'exportConfig' });

        if (config.error) {
            throw new Error(config.error);
        }

        // 將配置轉換為JSON字符串
        const jsonString = JSON.stringify(config.config, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // 創建下載鏈接
        const a = document.createElement('a');
        a.href = url;
        a.download = `font-manager-config-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();

        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);

        showNotification('配置已導出', 'success');
    } catch (error) {
        console.error('Error exporting configuration:', error);
        showNotification('導出配置失敗', 'error');
    }
}

// 導入配置
async function importConfiguration(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const config = JSON.parse(e.target.result);
                const response = await browser.runtime.sendMessage({
                    action: 'importConfig',
                    config: config
                });

                if (response.error) {
                    throw new Error(response.error);
                }

                // 重新加載頁面設置
                await loadGlobalSettings();
                await loadSiteSettings();
                await updateStatistics();

                showNotification('配置已導入', 'success');

                // 重置文件輸入，允許重複選擇同一文件
                document.getElementById('importConfig').value = '';
            } catch (error) {
                console.error('Error parsing configuration:', error);
                showNotification('導入失敗：無效的配置文件', 'error');
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Error importing configuration:', error);
        showNotification('導入配置失敗', 'error');
    }
}

// 重置為預設值
async function resetToDefault() {
    if (!confirm('確定要將所有設定重置為預設值嗎？')) {
        return;
    }

    try {
        const defaultSettings = getDefaultSettings();
        await browser.storage.local.set({
            globalSettings: defaultSettings,
            siteSettings: {}
        });

        // 重新加載頁面
        await loadGlobalSettings();
        await loadSiteSettings();
        await updateStatistics();

        // 通知所有標籤頁
        const tabs = await browser.tabs.query({});
        tabs.forEach(tab => {
            browser.tabs.sendMessage(tab.id, { action: 'reloadSettings' }).catch(() => {
                // 忽略錯誤
            });
        });

        showNotification('已重置為預設設定', 'success');
    } catch (error) {
        console.error('Error resetting to default:', error);
        showNotification('重置失敗', 'error');
    }
}

// 清除所有數據
async function clearAllData() {
    if (!confirm('確定要清除所有數據嗎？這將刪除所有設定！')) {
        return;
    }

    try {
        await browser.storage.local.clear();
        // 重新初始化默認設置
        const defaultSettings = getDefaultSettings();
        await browser.storage.local.set({
            globalSettings: defaultSettings,
            siteSettings: {},
            isEnabled: true
        });

        // 重新加載頁面
        await loadGlobalSettings();
        await loadSiteSettings();
        await updateStatistics();

        showNotification('所有數據已清除', 'success');
    } catch (error) {
        console.error('Error clearing all data:', error);
        showNotification('清除數據失敗', 'error');
    }
}

// 更新統計信息
async function updateStatistics() {
    try {
        const result = await browser.storage.local.get(['siteSettings', 'globalSettings']);
        const siteSettings = result.siteSettings || {};

        // 更新網站數量
        document.getElementById('totalSites').textContent = Object.keys(siteSettings).length;

        // 更新最後使用時間
        const lastUsedEl = document.getElementById('lastUsed');
        if (result.globalSettings && result.globalSettings.lastModified) {
            lastUsedEl.textContent = new Date(result.globalSettings.lastModified).toLocaleString('zh-TW');
        } else {
            lastUsedEl.textContent = '從未使用';
        }

    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// 顯示通知
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification';
    notification.classList.add(type);
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 獲取默認設定
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

// 暴露函數到全局，以便HTML中調用
window.editSiteSettings = editSiteSettings;
window.deleteSiteSettings = deleteSiteSettings;