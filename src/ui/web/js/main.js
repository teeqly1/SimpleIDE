class SimpleIDE {
    constructor() {
        this.currentProject = null;
        this.isProjectOpen = false;
        this.config = null;
        
        this.editor = new EditorManager(this);
        this.explorer = new FileExplorer(this);
        this.tabs = new TabsManager(this);
        this.console = new ConsoleManager(this);
        this.contextMenu = new ContextMenu(this);
        this.previewFrame = null;
        
        this.init();
    }
    
    async init() {
        this.showLoadingScreen('Инициализация редактора...');
        this.editor.init();
        this.createPreviewPanel();
        this.setupEventListeners();
        this.setupHotkeys();
        
        await this.sleep(300);
        this.updateLoadingProgress('Загрузка проекта...');
        await this.loadSavedProject();
        
        this.hideLoadingScreen();
    }
    
    createPreviewPanel() {
        const previewPanel = document.createElement('div');
        previewPanel.id = 'preview-panel';
        previewPanel.style.cssText = 'display: none; flex: 1; background: white; border-left: 1px solid var(--border-color);';
        
        this.previewFrame = document.createElement('iframe');
        this.previewFrame.id = 'preview-frame';
        this.previewFrame.style.cssText = 'width: 100%; height: 100%; border: none; background: white;';
        
        previewPanel.appendChild(this.previewFrame);
        document.getElementById('editor-container').parentElement.appendChild(previewPanel);
    }
    
    showLoadingScreen(message) {
        let loading = document.getElementById('loading-screen');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'loading-screen';
            loading.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"><i class="fas fa-code"></i><div class="spinner-circle"></div></div>
                    <div class="loading-text" id="loading-text">Загрузка...</div>
                    <div class="loading-progress"><div class="progress-bar" id="loading-progress-bar"></div></div>
                    <div class="loading-status" id="loading-status"></div>
                </div>`;
            document.body.appendChild(loading);
        }
        loading.style.display = 'flex';
    }
    
    updateLoadingProgress(message) {
        const status = document.getElementById('loading-status');
        const bar = document.getElementById('loading-progress-bar');
        if (status) status.textContent = message;
        if (bar) bar.style.width = Math.min(parseInt(bar.style.width || '0') + 25, 90) + '%';
    }
    
    hideLoadingScreen() {
        const bar = document.getElementById('loading-progress-bar');
        if (bar) bar.style.width = '100%';
        setTimeout(() => {
            const loading = document.getElementById('loading-screen');
            if (loading) { loading.style.opacity = '0'; loading.style.transition = 'opacity 0.5s'; setTimeout(() => loading.remove(), 500); }
        }, 500);
    }
    
    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    
    async loadSavedProject() {
        const projectPath = localStorage.getItem('currentProject');
        if (!projectPath) return;
        try {
            this.updateLoadingProgress('Подключение к проекту...');
            const result = await eel.open_project(projectPath)();
            if (result.success) {
                this.currentProject = result.projectPath;
                this.isProjectOpen = true;
                this.config = result.config;
                const projectName = result.config?.projectName || projectPath.split('/').pop().split('\\').pop();
                document.getElementById('project-name').textContent = projectName || '';
                document.getElementById('project-root-name').textContent = projectName || 'Проводник';
                this.updateLoadingProgress('Сканирование файлов...');
                await this.explorer.refresh();
                this.addConsoleLine(`Проект загружен: ${result.projectPath}`, 'success');
            } else {
                localStorage.removeItem('currentProject');
            }
        } catch (error) {
            console.error('Ошибка загрузки проекта:', error);
            localStorage.removeItem('currentProject');
        }
    }
    
    setupEventListeners() {
        document.getElementById('btn-save').addEventListener('click', () => this.saveCurrentFile());
        document.getElementById('btn-run').addEventListener('click', () => this.runCode());
        document.getElementById('btn-stop').addEventListener('click', () => this.stopCode());
        document.getElementById('btn-settings').addEventListener('click', () => this.openSettings());
        document.getElementById('btn-new-file').addEventListener('click', () => this.explorer.createFile());
        document.getElementById('btn-new-folder').addEventListener('click', () => this.explorer.createFolder());
        document.getElementById('btn-clear-console').addEventListener('click', () => this.console.clear());
        document.querySelector('.modal-close')?.addEventListener('click', () => this.closeSettings());
        document.querySelector('.modal-cancel')?.addEventListener('click', () => this.closeSettings());
        document.getElementById('btn-save-settings')?.addEventListener('click', () => this.saveSettings());
    }
    
    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); this.saveCurrentFile(); }
        });
    }
    
    openFileInTab(filePath) {
        this.tabs.openFile(filePath);
        if (filePath.endsWith('.html') || filePath.endsWith('.htm')) this.showPreview(filePath);
        else this.hidePreview();
    }
    
    async showPreview(filePath) {
        const previewPanel = document.getElementById('preview-panel');
        const editorPanel = document.getElementById('editor-panel');
        if (previewPanel && editorPanel) {
            previewPanel.style.display = 'block'; editorPanel.style.flex = '0.5';
            try {
                const result = await eel.read_file(filePath)();
                if (result.success && this.previewFrame) {
                    this.previewFrame.src = URL.createObjectURL(new Blob([result.content], { type: 'text/html' }));
                }
            } catch (e) {}
        }
    }
    
    hidePreview() {
        const previewPanel = document.getElementById('preview-panel');
        const editorPanel = document.getElementById('editor-panel');
        if (previewPanel && editorPanel) { previewPanel.style.display = 'none'; editorPanel.style.flex = '1'; }
    }
    
    async saveCurrentFile() {
        if (!this.editor.currentFile) { this.showToast('Нет открытого файла', 'warning'); return; }
        const result = await eel.save_file(this.editor.currentFile, this.editor.getValue())();
        if (result.success) {
            this.showToast('Файл сохранен', 'success');
            this.addConsoleLine(`Файл сохранен: ${this.editor.currentFile}`, 'success');
            if (this.editor.currentFile.endsWith('.html')) this.showPreview(this.editor.currentFile);
        } else this.showToast('Ошибка сохранения', 'error');
    }
    
    async runCode() {
        if (!this.isProjectOpen) { this.showToast('Проект не открыт', 'warning'); return; }
        this.config = await eel.get_project_config()();
        if (!this.config?.startFile) { if (confirm('Не выбран стартовый файл. Открыть настройки?')) this.openSettings(); return; }
        await this.saveCurrentFile();
        const startFile = this.config.startFile;
        if (startFile.endsWith('.html')) { this.showPreview(startFile); return; }
        this.addConsoleLine(`Запуск: ${startFile}`, '');
        await eel.run_code(startFile, this.config.preLaunchCommand || '')();
        this.console.startPolling();
    }
    
    async stopCode() {
        try { await eel.stop_execution()(); this.addConsoleLine('Выполнение остановлено', 'warning'); this.console.stopPolling(); } catch (e) {}
    }
    
    showToast(message, type = 'info') {
        let toast = document.getElementById('toast');
        if (!toast) { toast = document.createElement('div'); toast.id = 'toast'; document.body.appendChild(toast); }
        const colors = { success: '#4caf50', error: '#f44336', warning: '#ff9800', info: '#2196f3' };
        Object.assign(toast.style, {
            position: 'fixed', top: '60px', right: '20px', padding: '12px 24px',
            background: colors[type] || colors.info, color: 'white', borderRadius: '6px',
            fontSize: '14px', zIndex: '9999', opacity: '0', transform: 'translateX(100px)',
            transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        });
        toast.textContent = message;
        setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; }, 10);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; }, 2000);
    }
    
    addConsoleLine(text, type = '') { this.console.log(text, type); }
    openSettings() { document.getElementById('settings-modal').classList.add('show'); this.updateSettingsFileList(); if (this.config) { document.getElementById('start-file').value = this.config.startFile || ''; document.getElementById('pre-command').value = this.config.preLaunchCommand || ''; } }
    closeSettings() { document.getElementById('settings-modal').classList.remove('show'); }
    
    async updateSettingsFileList() {
        if (!this.isProjectOpen) return;
        const fileTree = await eel.get_file_tree()();
        const select = document.getElementById('start-file');
        select.innerHTML = '<option value="">Выберите файл...</option>';
        const addFiles = (items, prefix = '') => {
            for (const item of items) {
                if (item.type === 'file') { const o = document.createElement('option'); o.value = item.path; o.textContent = prefix + item.name; select.appendChild(o); }
                else if (item.type === 'directory') addFiles(item.children || [], prefix + item.name + '/');
            }
        };
        addFiles(fileTree);
    }
    
    async saveSettings() {
        const config = { ...this.config, startFile: document.getElementById('start-file').value, preLaunchCommand: document.getElementById('pre-command').value };
        const result = await eel.save_project_config(config)();
        if (result.success) { this.config = config; this.showToast('Настройки сохранены', 'success'); this.closeSettings(); }
    }
}

document.addEventListener('DOMContentLoaded', () => { window.ide = new SimpleIDE(); });