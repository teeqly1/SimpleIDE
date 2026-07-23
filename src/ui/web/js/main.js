class SimpleIDE {
    constructor() {
        this.currentProject = null;
        this.isProjectOpen = false;
        this.config = null;
        this.settings = {};
        this.tutorialActive = false;
        
        this.editor = new EditorManager(this);
        this.explorer = new FileExplorer(this);
        this.tabs = new TabsManager(this);
        this.console = new ConsoleManager(this);
        this.contextMenu = new ContextMenu(this);
        this.tutorial = new Tutorial(this);
        this.search = new SearchPopup(this);
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
        await this.checkTutorial();
    }
    
    async checkTutorial() {
        try {
            const settings = await eel.get_settings()();
            if (settings.learn !== false) {
                setTimeout(() => {
                    this.tutorialActive = true;
                    this.tutorial.setupEditorSteps();
                }, 1000);
            }
        } catch(e) {}
    }
    
    async loadSettings() {
        try { this.settings = await eel.get_settings()(); }
        catch(e) { this.settings = { language: 'ru', theme: 'monokai', font_size: 14, learn: true }; }
    }
    
    createPreviewPanel() {
        const pp = document.createElement('div');
        pp.id = 'preview-panel';
        pp.style.cssText = 'display:none;flex:1;background:white;border-left:1px solid var(--border-color);';
        this.previewFrame = document.createElement('iframe');
        this.previewFrame.id = 'preview-frame';
        this.previewFrame.style.cssText = 'width:100%;height:100%;border:none;background:white;';
        pp.appendChild(this.previewFrame);
        document.getElementById('editor-container').parentElement.appendChild(pp);
    }
    
    togglePreview() {
        const pp = document.getElementById('preview-panel');
        if (pp && pp.style.display === 'block') this.hidePreview();
        else if (this.editor.currentFile && this.editor.currentFile.endsWith('.html')) this.showPreview(this.editor.currentFile);
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
        const pp = session.last_project || localStorage.getItem('currentProject');
        if (!pp) return;
        try {
            this.updateLoadingProgress('Opening project...');
            const r = await eel.open_project(pp)();
            if (r.success) {
                this.currentProject = r.projectPath;
                this.isProjectOpen = true;
                this.config = r.config;
                const pn = r.config?.projectName || pp.split('/').pop().split('\\').pop();
                document.getElementById('project-name').textContent = pn || '';
                document.getElementById('project-root-name').textContent = pn || 'Explorer';
                this.updateLoadingProgress('Scanning files...');
                await this.explorer.refresh();
                this.addConsoleLine('Project loaded: ' + r.projectPath, 'success');
            }
        } catch(e) {}
    }
    
    async loadSession() {
        try {
            const s = await eel.get_session()();
            if (s.open_tabs) for (const t of s.open_tabs) await this.tabs.openFile(t);
            if (s.active_tab) { const tab = this.tabs.openTabs.get(s.active_tab); if (tab) this.tabs.activateTab(tab); }
        } catch(e) {}
    }
    
    async saveSession() {
        const s = { last_project: this.currentProject, open_tabs: Array.from(this.tabs.openTabs.keys()), active_tab: this.editor.currentFile };
        try { await eel.save_session(s)(); } catch(e) {}
    }
    
    setupEventListeners() {
        const btns = ['btn-save','btn-run','btn-stop','btn-settings','btn-new-file','btn-new-folder','btn-clear-console'];
        btns.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', (e) => { if (!this.tutorialActive) this['on' + id.replace('btn-','').replace(/-./g, x=>x[1].toUpperCase())]?.(); });
        });
        
        document.getElementById('btn-save').addEventListener('click', () => { if (!this.tutorialActive) this.saveCurrentFile(); });
        document.getElementById('btn-run').addEventListener('click', () => { if (!this.tutorialActive) this.runCode(); });
        document.getElementById('btn-stop').addEventListener('click', () => { if (!this.tutorialActive) this.stopCode(); });
        document.getElementById('btn-settings').addEventListener('click', () => { if (!this.tutorialActive) this.openSettings(); });
        document.getElementById('btn-new-file').addEventListener('click', () => { if (!this.tutorialActive) this.explorer.createFile(); });
        document.getElementById('btn-new-folder').addEventListener('click', () => { if (!this.tutorialActive) this.explorer.createFolder(); });
        document.getElementById('btn-clear-console').addEventListener('click', () => { if (!this.tutorialActive) this.console.clear(); });
        
        document.querySelector('.modal-close')?.addEventListener('click', () => this.closeSettings());
        document.querySelector('.modal-cancel')?.addEventListener('click', () => this.closeSettings());
        document.getElementById('btn-save-settings')?.addEventListener('click', () => this.saveSettings());
        window.addEventListener('beforeunload', () => this.saveSession());
    }
    
    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            if (this.tutorialActive) return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); this.saveCurrentFile(); }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); this.search.show(); }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') { e.preventDefault(); this.search.showReplace(); }
            if (e.key === 'F3') { e.preventDefault(); e.shiftKey ? this.search.findPrev() : this.search.findNext(); }
        });
    }
    
    openFileInTab(fp) { this.tabs.openFile(fp); if (fp.endsWith('.html')||fp.endsWith('.htm')) this.showPreview(fp); else this.hidePreview(); }
    
    async showPreview(fp) {
        const pp = document.getElementById('preview-panel'), ep = document.getElementById('editor-panel');
        if (pp && ep) { pp.style.display = 'block'; ep.style.flex = '0.5'; try { const r = await eel.read_file(fp)(); if (r.success && this.previewFrame) this.previewFrame.src = URL.createObjectURL(new Blob([r.content],{type:'text/html'})); } catch(e) {} }
    }
    
    hidePreview() { const pp = document.getElementById('preview-panel'), ep = document.getElementById('editor-panel'); if (pp && ep) { pp.style.display = 'none'; ep.style.flex = '1'; } }
    
    async saveCurrentFile() {
        if (!this.editor.currentFile) return;
        const r = await eel.save_file(this.editor.currentFile, this.editor.getValue())();
        if (r.success && this.editor.currentFile.endsWith('.html')) this.showPreview(this.editor.currentFile);
    }
    
    async runCode() {
        if (!this.isProjectOpen) return;
        this.config = await eel.get_project_config()();
        if (!this.config?.startFile) return;
        await this.saveCurrentFile();
        const sf = this.config.startFile;
        if (sf.endsWith('.html')) { this.showPreview(sf); return; }
        this.addConsoleLine('Running: ' + sf, '');
        await eel.run_code(sf, this.config.preLaunchCommand || '')();
        this.console.startPolling();
    }
    
    async stopCode() { try { await eel.stop_execution()(); this.console.stopPolling(); } catch(e) {} }
    
    addConsoleLine(text, type = '') { this.console.log(text, type); }
    
    openSettings() { document.getElementById('settings-modal').classList.add('show'); this.updateSettingsFileList(); if (this.config) { document.getElementById('start-file').value = this.config.startFile||''; document.getElementById('pre-command').value = this.config.preLaunchCommand||''; } }
    closeSettings() { document.getElementById('settings-modal').classList.remove('show'); }
    
    async updateSettingsFileList() {
        if (!this.isProjectOpen) return;
        const tree = await eel.get_file_tree()();
        const sel = document.getElementById('start-file');
        sel.innerHTML = '<option value="">Select file...</option>';
        const add = (items, p='') => { for (const i of items) { if (i.type==='file') { const o=document.createElement('option'); o.value=i.path; o.textContent=p+i.name; sel.appendChild(o); } else if (i.type==='directory') add(i.children||[], p+i.name+'/'); } };
        add(tree);
    }
    
    async saveSettings() {
        const cfg = { ...this.config, startFile: document.getElementById('start-file').value, preLaunchCommand: document.getElementById('pre-command').value };
        await eel.save_project_config(cfg)(); this.config = cfg; this.closeSettings();
    }
    
    closeCurrentTab() {
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) { const closeBtn = activeTab.querySelector('.tab-close'); if (closeBtn) closeBtn.click(); }
    }
    
    createNewFile() { this.explorer.createFile(); }
}

// ===== Search Popup =====
class SearchPopup {
    constructor(ide) {
        this.ide = ide;
        this.popup = null;
        this.createPopup();
    }
    
    createPopup() {
        this.popup = document.createElement('div');
        this.popup.className = 'search-popup';
        this.popup.innerHTML = `
            <div class="search-row">
                <input type="text" id="search-input" placeholder="Find...">
                <button id="btn-find-next" title="Find Next">↓</button>
                <button id="btn-find-prev" title="Find Previous">↑</button>
                <button id="btn-close-search" title="Close">×</button>
            </div>
            <div class="search-row" id="replace-row" style="display:none;">
                <input type="text" id="replace-input" placeholder="Replace with...">
                <button id="btn-replace">Replace</button>
                <button id="btn-replace-all">All</button>
            </div>
            <div class="search-info" id="search-info"></div>
            <div class="search-options">
                <label><input type="checkbox" id="case-sensitive"> Match case</label>
                <label><input type="checkbox" id="whole-word"> Whole word</label>
            </div>
        `;
        document.body.appendChild(this.popup);
        
        document.getElementById('search-input').addEventListener('input', () => this.findNext());
        document.getElementById('search-input').addEventListener('keydown', (e) => { if (e.key==='Enter') { e.preventDefault(); this.findNext(); } if (e.key==='Escape') this.hide(); });
        document.getElementById('btn-find-next').addEventListener('click', () => this.findNext());
        document.getElementById('btn-find-prev').addEventListener('click', () => this.findPrev());
        document.getElementById('btn-close-search').addEventListener('click', () => this.hide());
        document.getElementById('btn-replace').addEventListener('click', () => this.replaceNext());
        document.getElementById('btn-replace-all').addEventListener('click', () => this.replaceAll());
        document.getElementById('replace-input').addEventListener('keydown', (e) => { if (e.key==='Enter') { e.preventDefault(); this.replaceNext(); } if (e.key==='Escape') this.hide(); });
    }
    
    show() { this.popup.classList.add('show'); document.getElementById('search-input').focus(); document.getElementById('search-input').select(); }
    showReplace() { this.show(); document.getElementById('replace-row').style.display = 'flex'; document.getElementById('replace-input').focus(); }
    hide() { this.popup.classList.remove('show'); document.getElementById('replace-row').style.display = 'none'; }
    
    findNext() {
        const cm = this.ide.editor.editor;
        const query = document.getElementById('search-input').value;
        if (!query) { document.getElementById('search-info').textContent = ''; return; }
        const cursor = cm.getSearchCursor(query, cm.getCursor(), document.getElementById('case-sensitive').checked);
        if (cursor.findNext()) { cm.setSelection(cursor.from(), cursor.to()); cm.scrollIntoView({from:cursor.from(),to:cursor.to()},50); document.getElementById('search-info').textContent='Found'; document.getElementById('search-info').style.color='#4caf50'; }
        else { const sc = cm.getSearchCursor(query, {line:0,ch:0}, document.getElementById('case-sensitive').checked); if (sc.findNext()) { cm.setSelection(sc.from(), sc.to()); cm.scrollIntoView({from:sc.from(),to:sc.to()},50); document.getElementById('search-info').textContent='Search wrapped'; document.getElementById('search-info').style.color='#ff9800'; } else { document.getElementById('search-info').textContent='Not found'; document.getElementById('search-info').style.color='#f44336'; } }
    }
    
    findPrev() {
        const cm = this.ide.editor.editor;
        const query = document.getElementById('search-input').value;
        if (!query) return;
        const cursor = cm.getSearchCursor(query, cm.getCursor(), document.getElementById('case-sensitive').checked);
        if (cursor.findPrevious()) { cm.setSelection(cursor.from(), cursor.to()); cm.scrollIntoView({from:cursor.from(),to:cursor.to()},50); }
    }
    
    replaceNext() {
        const cm = this.ide.editor.editor;
        const query = document.getElementById('search-input').value;
        const replace = document.getElementById('replace-input').value;
        if (!query) return;
        const cursor = cm.getSearchCursor(query, cm.getCursor(), document.getElementById('case-sensitive').checked);
        if (cursor.findNext()) { cursor.replace(replace); document.getElementById('search-info').textContent='Replaced'; document.getElementById('search-info').style.color='#2196f3'; this.findNext(); }
    }
    
    replaceAll() {
        const cm = this.ide.editor.editor;
        const query = document.getElementById('search-input').value;
        const replace = document.getElementById('replace-input').value;
        if (!query) return;
        let count = 0;
        const cursor = cm.getSearchCursor(query, {line:0,ch:0}, document.getElementById('case-sensitive').checked);
        while (cursor.findNext()) { cursor.replace(replace); count++; }
        document.getElementById('search-info').textContent = `Replaced ${count} occurrences`;
        document.getElementById('search-info').style.color = '#4caf50';
    }
}

// ===== Tutorial =====
class Tutorial {
    constructor(ide) {
        this.ide = ide;
        this.steps = [];
        this.currentStep = 0;
        this.overlay = null;
        this.tooltip = null;
        this.skipBtn = null;
        this.highlight = null;
        this.createElements();
    }
    
    createElements() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorial-overlay';
        Object.assign(this.overlay.style, {position:'fixed',top:'0',left:'0',width:'100%',height:'100%',background:'rgba(0,0,0,0.7)',zIndex:'9998',display:'none',transition:'all 0.5s ease'});
        
        this.highlight = document.createElement('div');
        this.highlight.id = 'tutorial-highlight';
        Object.assign(this.highlight.style, {position:'fixed',zIndex:'9999',border:'2px solid #0e639c',borderRadius:'6px',boxShadow:'0 0 0 9999px rgba(0,0,0,0.7)',transition:'all 0.5s ease',opacity:'0',pointerEvents:'none'});
        
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'tutorial-tooltip';
        Object.assign(this.tooltip.style, {position:'fixed',zIndex:'10000',background:'#252526',border:'1px solid #0e639c',borderRadius:'10px',padding:'20px',color:'#ccc',width:'380px',boxShadow:'0 10px 40px rgba(0,0,0,0.6)',opacity:'0',transform:'translateY(15px)',transition:'all 0.4s ease',pointerEvents:'auto'});
        
        this.skipBtn = document.createElement('button');
        this.skipBtn.textContent = 'Skip tutorial';
        Object.assign(this.skipBtn.style, {position:'fixed',top:'20px',right:'20px',zIndex:'10001',padding:'10px 20px',background:'rgba(0,0,0,0.5)',border:'1px solid #555',color:'#ccc',borderRadius:'6px',cursor:'pointer',fontSize:'13px',opacity:'0',transition:'opacity 0.3s'});
        this.skipBtn.onclick = () => this.end();
        
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.highlight);
        document.body.appendChild(this.tooltip);
        document.body.appendChild(this.skipBtn);
    }
    
    show() { this.ide.tutorialActive = true; this.overlay.style.display = 'block'; this.skipBtn.style.opacity = '1'; this.currentStep = 0; this.showStep(); }
    
    showStep() {
        if (this.currentStep >= this.steps.length) { this.end(); return; }
        const step = this.steps[this.currentStep];
        const target = document.querySelector(step.target);
        if (!target) { this.currentStep++; this.showStep(); return; }
        
        const rect = target.getBoundingClientRect();
        this.highlight.style.top = (rect.top-8)+'px';
        this.highlight.style.left = (rect.left-8)+'px';
        this.highlight.style.width = (rect.width+16)+'px';
        this.highlight.style.height = (rect.height+16)+'px';
        this.highlight.style.opacity = '1';
        
        const tw=380, th=220, m=20, ww=window.innerWidth, wh=window.innerHeight;
        let top, left;
        const pos = step.position||'auto';
        
        if (pos==='right') { left=rect.right+m; top=rect.top+(rect.height-th)/2; }
        else if (pos==='left') { left=20; top=rect.top; }
        else if (pos==='top') { left=rect.left; top=rect.top-250; }
        else { left=rect.right+m; top=rect.top; }
        
        if (left+tw>ww) left=ww-tw-10; if (left<10) left=10;
        if (top<10) top=10; if (top+th>wh) top=wh-th-10;
        
        this.tooltip.style.top = top+'px';
        this.tooltip.style.left = left+'px';
        this.tooltip.style.opacity = '1';
        this.tooltip.style.transform = 'translateY(0)';
        
        this.tooltip.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
                <div style="width:40px;height:40px;border-radius:50%;background:#0e639c;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas ${step.icon||'fa-info-circle'}" style="color:white;font-size:18px;"></i>
                </div>
                <div><div style="color:#fff;font-weight:600;font-size:15px;">${step.title}</div><div style="color:#666;font-size:11px;">Step ${this.currentStep+1}/${this.steps.length}</div></div>
            </div>
            <p style="font-size:13px;line-height:1.7;color:#aaa;margin-bottom:18px;">${step.text}</p>
            <div style="display:flex;justify-content:flex-end;gap:10px;">
                ${this.currentStep>0?`<button onclick="window.ide.tutorial.prev()" style="padding:8px 16px;background:#3e3e42;border:none;color:#ccc;border-radius:6px;cursor:pointer;font-size:13px;">Back</button>`:''}
                <button onclick="window.ide.tutorial.next()" style="padding:8px 20px;background:#0e639c;border:none;color:white;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;">${this.currentStep<this.steps.length-1?'Next →':'Finish ✓'}</button>
            </div>`;
    }
    
    next() { this.currentStep++; this.showStep(); }
    prev() { this.currentStep--; this.showStep(); }
    
    end() {
        this.ide.tutorialActive = false;
        this.overlay.style.display = 'none'; this.highlight.style.opacity = '0';
        this.tooltip.style.opacity = '0'; this.tooltip.style.transform = 'translateY(15px)';
        this.skipBtn.style.opacity = '0';
        try { eel.save_settings(learn=false)(); localStorage.setItem('tutorial_done','true'); } catch(e) {}
    }
    
    setupEditorSteps() {
        this.steps = [
            {target:'#explorer-panel',icon:'fa-folder-tree',title:'File Explorer',text:'Browse all files and folders. Right-click for options. Drag to move.',position:'right'},
            {target:'#btn-new-file',icon:'fa-file-plus',title:'New File',text:'Create a new file in selected folder.',position:'right'},
            {target:'#editor-container',icon:'fa-code',title:'Code Editor',text:'Write code here. 40+ languages supported. Ctrl+S to save.',position:'left'},
            {target:'#btn-run',icon:'fa-play',title:'Run Code',text:'Execute Python/JS files. Set start file in project settings.',position:'left'},
            {target:'#console-panel',icon:'fa-terminal',title:'Console',text:'View output and type commands in the input field.',position:'top'}
        ];
        this.show();
    }
}

document.addEventListener('DOMContentLoaded', () => { window.ide = new SimpleIDE(); });