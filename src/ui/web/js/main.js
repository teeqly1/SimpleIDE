class SimpleIDE {
    constructor() {
        this.currentProject = null;
        this.isProjectOpen = false;
        this.config = null;
        this.settings = {};
        this.tutorialActive = false;
        this.explorerVisible = true;
        this.localhostPort = parseInt(localStorage.getItem('localhost_port')) || 1313;

        this.editor = new EditorManager(this);
        this.explorer = new FileExplorer(this);
        this.tabs = new TabsManager(this);
        this.console = new ConsoleManager(this);
        this.contextMenu = new ContextMenu(this);
        this.tutorial = new Tutorial(this);
        this.search = new SearchPopup(this);

        this.init();
    }

    async init() {
        this.editor.init();
        this.applyBackground();
        this.setupEventListeners();
        this.setupHotkeys();
        await this.sleep(300);
        await this.loadSavedProject();
        await this.checkTutorial();
        this.applySavedTheme();
    }

    async safeEel(fn, fallback = null) {
        try { return await fn(); }
        catch (error) { console.error('Eel error:', error); return fallback; }
    }

    applyBackground() {
        const bg = localStorage.getItem('ide_bg_image');
        if (bg) {
            document.body.style.backgroundImage = `url(${bg})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
        }
    }

    applySavedTheme() {
        const theme = localStorage.getItem('ide_theme') || 'monokai';
        if (this.editor && this.editor.editor) this.editor.editor.setOption('theme', theme);
    }

    async checkTutorial() {
        try { if ((await eel.get_settings()()).learn !== false) setTimeout(() => { this.tutorialActive = true; this.tutorial.setupEditorSteps(); }, 1000); } catch(e) {}
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    async loadSavedProject() {
        const session = await this.safeEel(() => eel.get_session()(), {});
        const pp = session.last_project || localStorage.getItem('currentProject');
        if (!pp) return;
        const r = await this.safeEel(() => eel.open_project(pp)());
        if (r && r.success) {
            this.currentProject = r.projectPath; this.isProjectOpen = true; this.config = r.config;
            document.getElementById('project-name').textContent = r.config?.projectName || '';
            document.getElementById('project-root-name').textContent = r.config?.projectName || 'Explorer';
            await this.explorer.refresh();
        }
    }

    setupEventListeners() {
        const bind = (id, fn) => {
            const btn = document.getElementById(id);
            if (btn) btn.onclick = () => { if (!this.tutorialActive) fn(); };
        };
        bind('btn-save', () => this.saveCurrentFile());
        bind('btn-run', () => this.runCode());
        bind('btn-look', () => this.look());
        bind('btn-stop', () => this.stopCode());
        bind('btn-settings', () => this.openSettings());
        bind('btn-new-file', () => this.explorer.createFile());
        bind('btn-new-folder', () => this.explorer.createFolder());
        bind('btn-clear-console', () => this.console.clear());
        
        const mc = document.querySelector('.modal-close');
        const mca = document.querySelector('.modal-cancel');
        const ss = document.getElementById('btn-save-settings');
        if (mc) mc.onclick = () => this.closeSettings();
        if (mca) mca.onclick = () => this.closeSettings();
        if (ss) ss.onclick = () => this.saveSettings();
    }

    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            if (this.tutorialActive) return;
            if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); this.saveCurrentFile(); }
        });
    }

    toggleExplorer() { this.explorerVisible = !this.explorerVisible; document.getElementById('explorer-panel').classList.toggle('collapsed', !this.explorerVisible); }

    openFileInTab(fp) { this.tabs.openFile(fp); }

    look() {
        const cf = this.editor.currentFile;
        if (!cf) return;
        const ext = cf.split('.').pop().toLowerCase();
        if (ext === 'html' || ext === 'htm' || ext === 'svg') this.showPreview(cf);
    }

    async showPreview(fp) {
        let pp = document.getElementById('preview-panel');
        if (!pp) {
            pp = document.createElement('div'); pp.id = 'preview-panel';
            pp.innerHTML = '<iframe id="preview-frame" style="width:100%;height:100%;border:none"></iframe>';
            document.getElementById('main-container').appendChild(pp);
        }
        pp.style.display = 'block';
        const r = await this.safeEel(() => eel.read_file(fp)());
        if (r && r.success) document.getElementById('preview-frame').src = URL.createObjectURL(new Blob([r.content], {type:'text/html'}));
    }

    hidePreview() { const pp = document.getElementById('preview-panel'); if (pp) pp.style.display = 'none'; }

    async saveCurrentFile() {
        if (!this.editor.currentFile) return;
        await this.safeEel(() => eel.save_file(this.editor.currentFile, this.editor.getValue())());
    }

    async runCode() {
        if (!this.isProjectOpen) return;
        this.config = await this.safeEel(() => eel.get_project_config()());
        const sf = this.config?.startFile;
        if (!sf) return;
        if (sf.endsWith('.html') || sf.endsWith('.htm')) {
            this.console.log('Starting localhost:' + this.localhostPort, 'info');
            const r = await this.safeEel(() => eel.start_localhost(this.localhostPort)());
            if (r && r.success) {
                let pp = document.getElementById('preview-panel');
                if (!pp) { pp = document.createElement('div'); pp.id = 'preview-panel'; pp.innerHTML = '<iframe id="preview-frame" style="width:100%;height:100%;border:none"></iframe>'; document.getElementById('main-container').appendChild(pp); }
                pp.style.display = 'block';
                document.getElementById('preview-frame').src = 'http://localhost:' + this.localhostPort;
            }
            return;
        }
        await this.saveCurrentFile();
        await this.safeEel(() => eel.run_code(sf, this.config.preLaunchCommand||'')());
        this.console.startPolling();
    }

    async stopCode() {
        await this.safeEel(() => eel.stop_execution()());
        await this.safeEel(() => eel.stop_localhost()());
        this.console.stopPolling();
        this.hidePreview();
    }

    openSettings() { document.getElementById('settings-modal').classList.add('show'); this.updateSettingsFileList(); }
    closeSettings() { document.getElementById('settings-modal').classList.remove('show'); }

    async updateSettingsFileList() {
        if (!this.isProjectOpen) return;
        const tree = await this.safeEel(() => eel.get_file_tree()(), []);
        const sel = document.getElementById('start-file');
        sel.innerHTML = '<option value="">Select...</option>';
        const add = (items) => { for (const i of items) { if (i.type==='file') sel.innerHTML += `<option value="${i.path}">${i.name}</option>`; if (i.children) add(i.children); } };
        add(tree);
    }

    async saveSettings() {
        await this.safeEel(() => eel.save_project_config({...this.config, startFile: document.getElementById('start-file').value, preLaunchCommand: document.getElementById('pre-command').value})());
        this.closeSettings();
    }

    closeCurrentTab() { const t = document.querySelector('.tab.active'); if (t) t.querySelector('.tab-close')?.click(); }
}

class SearchPopup {
    constructor(ide) { this.ide = ide; this.popup = document.createElement('div'); this.popup.className = 'search-popup'; this.popup.innerHTML = '<div class="search-row"><input id="search-input" placeholder="Find..."><button id="btn-close-search">×</button></div>'; document.body.appendChild(this.popup); document.getElementById('search-input').addEventListener('keydown', e => { if(e.key==='Enter') this.findNext(); if(e.key==='Escape') this.hide(); }); document.getElementById('btn-close-search').addEventListener('click', () => this.hide()); }
    show() { this.popup.classList.add('show'); document.getElementById('search-input').focus(); }
    showReplace() { this.show(); }
    hide() { this.popup.classList.remove('show'); }
    findNext() { const cm = this.ide.editor.editor, q = document.getElementById('search-input').value; if(!q)return; const c = cm.getSearchCursor(q, cm.getCursor()); if(c.findNext()) cm.setSelection(c.from(), c.to()); }
}

class Tutorial {
    constructor(ide) { this.ide = ide; this.steps = []; this.currentStep = 0; this.overlay = document.createElement('div'); Object.assign(this.overlay.style, {position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.7)',zIndex:9998,display:'none'}); this.highlight = document.createElement('div'); Object.assign(this.highlight.style, {position:'fixed',zIndex:9999,border:'2px solid #0e639c',borderRadius:'6px',boxShadow:'0 0 0 9999px rgba(0,0,0,0.7)',opacity:0}); this.tooltip = document.createElement('div'); Object.assign(this.tooltip.style, {position:'fixed',zIndex:10000,background:'#252526',border:'1px solid #0e639c',borderRadius:'10px',padding:'20px',color:'#ccc',width:'380px',opacity:0}); this.skipBtn = document.createElement('button'); this.skipBtn.textContent = 'Skip'; Object.assign(this.skipBtn.style, {position:'fixed',top:20,right:20,zIndex:10001,padding:'10px 20px',background:'rgba(0,0,0,0.5)',border:'1px solid #555',color:'#ccc',borderRadius:6,cursor:'pointer',opacity:0}); this.skipBtn.onclick = () => this.end(); document.body.append(this.overlay, this.highlight, this.tooltip, this.skipBtn); }
    show() { this.ide.tutorialActive = true; this.overlay.style.display = 'block'; this.skipBtn.style.opacity = '1'; this.currentStep = 0; this.showStep(); }
    showStep() {
        if (this.currentStep >= this.steps.length) { this.end(); return; }
        const s = this.steps[this.currentStep], t = document.querySelector(s.target);
        if (!t) { this.currentStep++; this.showStep(); return; }
        const r = t.getBoundingClientRect();
        this.highlight.style.cssText = `top:${r.top-8}px;left:${r.left-8}px;width:${r.width+16}px;height:${r.height+16}px;opacity:1;position:fixed;z-index:9999;border:2px solid #0e639c;border-radius:6px;box-shadow:0 0 0 9999px rgba(0,0,0,0.7);transition:all 0.3s`;
        let top=r.top, left=s.position==='left'?20:r.right+20;
        if(left+380>innerWidth)left=innerWidth-390;
        if(top+220>innerHeight)top=innerHeight-230;
        this.tooltip.style.cssText = `top:${top}px;left:${left}px;opacity:1;position:fixed;z-index:10000;background:#252526;border:1px solid #0e639c;border-radius:10px;padding:20px;color:#ccc;width:380px;transition:all 0.3s`;
        this.tooltip.innerHTML = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div style="width:40px;height:40px;border-radius:50%;background:#0e639c;display:flex;align-items:center;justify-content:center"><i class="fas ${s.icon||'fa-info-circle'}" style="color:white"></i></div><div style="color:#fff;font-weight:600">${s.title}</div></div><p style="font-size:13px;color:#aaa;margin-bottom:15px">${s.text}</p><div style="display:flex;justify-content:flex-end;gap:8px">${this.currentStep>0?'<button onclick="window.ide.tutorial.prev()" style="padding:8px 16px;background:#3e3e42;border:none;color:#ccc;border-radius:6px;cursor:pointer">Back</button>':''}<button onclick="window.ide.tutorial.next()" style="padding:8px 20px;background:#0e639c;border:none;color:white;border-radius:6px;cursor:pointer">${this.currentStep<this.steps.length-1?'Next':'Finish'}</button></div>`;
    }
    next() { this.currentStep++; this.showStep(); }
    prev() { this.currentStep--; this.showStep(); }
    end() { this.ide.tutorialActive = false; this.overlay.style.display = 'none'; this.highlight.style.opacity = '0'; this.tooltip.style.opacity = '0'; this.skipBtn.style.opacity = '0'; try { eel.save_settings(learn=false)(); } catch(e) {} }
    setupEditorSteps() {
        this.steps = [
            {target:'#explorer-panel',icon:'fa-folder-tree',title:'File Explorer',text:'Browse files.',position:'right'},
            {target:'#editor-container',icon:'fa-code',title:'Code Editor',text:'Write code.',position:'left'},
            {target:'#btn-look',icon:'fa-eye',title:'Look',text:'Preview HTML.',position:'left'},
            {target:'#console-panel',icon:'fa-terminal',title:'Console',text:'View output.',position:'top'}
        ];
        this.show();
    }
}

document.addEventListener('DOMContentLoaded', () => { window.ide = new SimpleIDE(); });