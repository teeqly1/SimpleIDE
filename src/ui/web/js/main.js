class SimpleIDE {
    constructor() {
        this.currentProject = null;
        this.isProjectOpen = false;
        this.config = null;
        this.settings = {};
        
        this.editor = new EditorManager(this);
        this.explorer = new FileExplorer(this);
        this.tabs = new TabsManager(this);
        this.console = new ConsoleManager(this);
        this.contextMenu = new ContextMenu(this);
        this.previewFrame = null;
        
        this.init();
    }
    
    async init() {
        this.showLoadingScreen('Initializing...');
        this.editor.init();
        this.createPreviewPanel();
        this.setupEventListeners();
        this.setupHotkeys();
        
        await this.loadSettings();
        
        await this.sleep(300);
        this.updateLoadingProgress('Loading project...');
        await this.loadSavedProject();
        
        await this.loadSession();
        
        this.hideLoadingScreen();
    }
    
    async loadSettings() {
        try {
            this.settings = await eel.get_settings()();
        } catch(e) {
            this.settings = { language: 'ru', theme: 'monokai', font_size: 14 };
        }
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
    
    showLoadingScreen(msg) {
        let el = document.getElementById('loading-screen');
        if (!el) {
            el = document.createElement('div'); el.id = 'loading-screen';
            el.innerHTML = `<div class="loading-content"><div class="loading-spinner"><i class="fas fa-code"></i><div class="spinner-circle"></div></div><div class="loading-text" id="loading-text">Loading...</div><div class="loading-progress"><div class="progress-bar" id="loading-progress-bar"></div></div><div class="loading-status" id="loading-status"></div></div>`;
            document.body.appendChild(el);
        }
        el.style.display = 'flex';
        document.getElementById('loading-text').textContent = msg;
    }
    
    updateLoadingProgress(msg) {
        const s = document.getElementById('loading-status');
        const b = document.getElementById('loading-progress-bar');
        if (s) s.textContent = msg;
        if (b) b.style.width = Math.min(parseInt(b.style.width || '0') + 25, 90) + '%';
    }
    
    hideLoadingScreen() {
        const b = document.getElementById('loading-progress-bar');
        if (b) b.style.width = '100%';
        setTimeout(() => {
            const el = document.getElementById('loading-screen');
            if (el) { el.style.opacity = '0'; el.style.transition = 'opacity 0.5s'; setTimeout(() => el.remove(), 500); }
        }, 500);
    }
    
    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    
    async loadSavedProject() {
        const session = await eel.get_session()();
        const projectPath = session.last_project || localStorage.getItem('currentProject');
        if (!projectPath) return;
        
        try {
            this.updateLoadingProgress('Opening project...');
            const result = await eel.open_project(projectPath)();
            if (result.success) {
                this.currentProject = result.projectPath;
                this.isProjectOpen = true;
                this.config = result.config;
                const pn = result.config?.projectName || projectPath.split('/').pop().split('\\').pop();
                document.getElementById('project-name').textContent = pn || '';
                document.getElementById('project-root-name').textContent = pn || 'Explorer';
                this.updateLoadingProgress('Scanning files...');
                await this.explorer.refresh();
                this.addConsoleLine(`Project loaded: ${result.projectPath}`, 'success');
            }
        } catch(e) {
            console.error('Error loading project:', e);
        }
    }
    
    async loadSession() {
        try {
            const session = await eel.get_session()();
            if (session.open_tabs && session.open_tabs.length > 0) {
                for (const tab of session.open_tabs) {
                    await this.tabs.openFile(tab);
                }
            }
            if (session.active_tab) {
                const tab = this.tabs.openTabs.get(session.active_tab);
                if (tab) this.tabs.activateTab(tab);
            }
        } catch(e) {}
    }
    
    async saveSession() {
        const session = {
            last_project: this.currentProject,
            open_tabs: Array.from(this.tabs.openTabs.keys()),
            active_tab: this.editor.currentFile,
            explorer_expanded: Array.from(document.querySelectorAll('.children:not(.collapsed)')).map(el => el.previousElementSibling?.dataset.path).filter(Boolean)
        };
        try { await eel.save_session(session)(); } catch(e) {}
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
        
        window.addEventListener('beforeunload', () => this.saveSession());
    }
    
    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault(); this.saveCurrentFile();
            }
        });
    }
    
    openFileInTab(fp) {
        this.tabs.openFile(fp);
        if (fp.endsWith('.html') || fp.endsWith('.htm')) this.showPreview(fp);
        else this.hidePreview();
    }
    
    async showPreview(fp) {
        const pp = document.getElementById('preview-panel');
        const ep = document.getElementById('editor-panel');
        if (pp && ep) {
            pp.style.display = 'block'; ep.style.flex = '0.5';
            try {
                const r = await eel.read_file(fp)();
                if (r.success && this.previewFrame) {
                    this.previewFrame.src = URL.createObjectURL(new Blob([r.content], {type: 'text/html'}));
                }
            } catch(e) {}
        }
    }
    
    hidePreview() {
        const pp = document.getElementById('preview-panel');
        const ep = document.getElementById('editor-panel');
        if (pp && ep) { pp.style.display = 'none'; ep.style.flex = '1'; }
    }
    
    async saveCurrentFile() {
        if (!this.editor.currentFile) { this.showToast('No file open', 'warning'); return; }
        const r = await eel.save_file(this.editor.currentFile, this.editor.getValue())();
        if (r.success) {
            this.showToast('Saved', 'success');
            if (this.editor.currentFile.endsWith('.html')) this.showPreview(this.editor.currentFile);
        } else this.showToast('Error saving', 'error');
    }
    
    async runCode() {
        if (!this.isProjectOpen) return;
        this.config = await eel.get_project_config()();
        if (!this.config?.startFile) return;
        await this.saveCurrentFile();
        const sf = this.config.startFile;
        if (sf.endsWith('.html')) { this.showPreview(sf); return; }
        this.addConsoleLine(`Running: ${sf}`, '');
        await eel.run_code(sf, this.config.preLaunchCommand || '')();
        this.console.startPolling();
    }
    
    async stopCode() {
        try { await eel.stop_execution()(); this.console.stopPolling(); } catch(e) {}
    }
    
    showToast(msg, type = 'info') {
        let t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
        const colors = {success:'#4caf50', error:'#f44336', warning:'#ff9800', info:'#2196f3'};
        Object.assign(t.style, {
            position:'fixed', top:'60px', right:'20px', padding:'12px 24px',
            background:colors[type]||colors.info, color:'white', borderRadius:'6px',
            fontSize:'14px', zIndex:'9999', opacity:'0', transform:'translateX(100px)',
            transition:'all 0.3s', boxShadow:'0 4px 12px rgba(0,0,0,0.3)'
        });
        t.textContent = msg;
        setTimeout(() => { t.style.opacity = '1'; t.style.transform = 'translateX(0)'; }, 10);
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100px)'; }, 2000);
    }
    
    addConsoleLine(text, type = '') { this.console.log(text, type); }
    
    openSettings() {
        document.getElementById('settings-modal').classList.add('show');
        this.updateSettingsFileList();
        if (this.config) {
            document.getElementById('start-file').value = this.config.startFile || '';
            document.getElementById('pre-command').value = this.config.preLaunchCommand || '';
        }
    }
    
    closeSettings() { document.getElementById('settings-modal').classList.remove('show'); }
    
    async updateSettingsFileList() {
        if (!this.isProjectOpen) return;
        const tree = await eel.get_file_tree()();
        const sel = document.getElementById('start-file');
        sel.innerHTML = '<option value="">Select file...</option>';
        const add = (items, prefix = '') => {
            for (const item of items) {
                if (item.type === 'file') { const o = document.createElement('option'); o.value = item.path; o.textContent = prefix + item.name; sel.appendChild(o); }
                else if (item.type === 'directory') add(item.children || [], prefix + item.name + '/');
            }
        };
        add(tree);
    }
    
    async saveSettings() {
        const cfg = { ...this.config, startFile: document.getElementById('start-file').value, preLaunchCommand: document.getElementById('pre-command').value };
        const r = await eel.save_project_config(cfg)();
        if (r.success) { this.config = cfg; this.closeSettings(); }
    }
}

document.addEventListener('DOMContentLoaded', () => { window.ide = new SimpleIDE(); });