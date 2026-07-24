// Полный исправленный класс Tutorial
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
        Object.assign(this.overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.7)', zIndex: '9998', display: 'none',
            transition: 'all 0.5s ease'
        });
        
        this.highlight = document.createElement('div');
        this.highlight.id = 'tutorial-highlight';
        Object.assign(this.highlight.style, {
            position: 'fixed', zIndex: '9999', border: '2px solid #0e639c',
            borderRadius: '6px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
            transition: 'all 0.5s ease', opacity: '0', pointerEvents: 'none'
        });
        
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'tutorial-tooltip';
        Object.assign(this.tooltip.style, {
            position: 'fixed', zIndex: '10000', background: '#252526',
            border: '1px solid #0e639c', borderRadius: '10px', padding: '20px',
            color: '#ccc', maxWidth: '380px', width: '380px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            opacity: '0', transform: 'translateY(15px)',
            transition: 'all 0.4s ease', pointerEvents: 'auto'
        });
        
        this.skipBtn = document.createElement('button');
        this.skipBtn.textContent = 'Skip tutorial';
        Object.assign(this.skipBtn.style, {
            position: 'fixed', top: '20px', right: '20px', zIndex: '10001',
            padding: '10px 20px', background: 'rgba(0,0,0,0.5)', border: '1px solid #555',
            color: '#ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
            opacity: '0', transition: 'opacity 0.3s'
        });
        this.skipBtn.onclick = () => this.end();
        
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.highlight);
        document.body.appendChild(this.tooltip);
        document.body.appendChild(this.skipBtn);
    }
    
    show() {
        this.ide.tutorialActive = true;
        this.overlay.style.display = 'block';
        this.skipBtn.style.opacity = '1';
        this.currentStep = 0;
        this.showStep();
    }
    
    getTooltipPosition(rect, step) {
        const tooltipWidth = 380;
        const tooltipHeight = 220;
        const margin = 20;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Используем указанную позицию из шага или авто-определение
        const preferred = step.position || 'auto';
        
        let top, left;
        
        // Если указана позиция
        if (preferred === 'left') {
            left = rect.left - tooltipWidth - margin;
            top = rect.top + (rect.height - tooltipHeight) / 2;
            if (left < margin) left = rect.right + margin; // fallback to right
        } else if (preferred === 'right') {
            left = rect.right + margin;
            top = rect.top + (rect.height - tooltipHeight) / 2;
            if (left + tooltipWidth > windowWidth - margin) left = rect.left - tooltipWidth - margin; // fallback to left
        } else if (preferred === 'bottom') {
            left = rect.left;
            top = rect.bottom + margin;
            if (top + tooltipHeight > windowHeight - margin) top = rect.top - tooltipHeight - margin; // fallback to top
        } else if (preferred === 'top') {
            left = rect.left;
            top = rect.top - tooltipHeight - margin;
            if (top < margin) top = rect.bottom + margin; // fallback to bottom
        } else {
            // Авто-определение: приоритет - слева для левой панели, справа для остального
            if (rect.left < 300) {
                // Элемент слева (explorer) - показываем справа от него
                left = rect.right + margin;
                top = rect.top;
            } else if (rect.left > windowWidth - 400) {
                // Элемент справа - показываем слева от него
                left = rect.left - tooltipWidth - margin;
                top = rect.top;
            } else if (rect.top < 200) {
                // Элемент сверху - показываем снизу
                left = rect.left;
                top = rect.bottom + margin;
            } else {
                // По умолчанию - сверху от элемента
                left = rect.left;
                top = rect.top - tooltipHeight - margin;
            }
        }
        
        // Гарантируем что подсказка не выходит за экран
        if (left + tooltipWidth > windowWidth - margin) {
            left = windowWidth - tooltipWidth - margin;
        }
        if (left < margin) {
            left = margin;
        }
        if (top + tooltipHeight > windowHeight - margin) {
            top = windowHeight - tooltipHeight - margin;
        }
        if (top < margin) {
            top = margin;
        }
        
        return { top, left };
    }
    
showStep() {
    if (this.currentStep >= this.steps.length) { this.end(); return; }
    
    const step = this.steps[this.currentStep];
    const target = document.querySelector(step.target);
    
    if (!target) { this.currentStep++; this.showStep(); return; }
    
    const rect = target.getBoundingClientRect();
    
    this.highlight.style.top = (rect.top - 8) + 'px';
    this.highlight.style.left = (rect.left - 8) + 'px';
    this.highlight.style.width = (rect.width + 16) + 'px';
    this.highlight.style.height = (rect.height + 16) + 'px';
    this.highlight.style.opacity = '1';
    
    const tooltipW = 380, margin = 20;
    const winW = window.innerWidth, winH = window.innerHeight;
    let top, left;
    
    const pos = step.position || 'auto';
    
    if (pos === 'right') {
        // Справа от элемента (для explorer слева)
        left = rect.right + margin;
        top = rect.top;
    } else if (pos === 'left') {
        // СЛЕВА от элемента (для editor в центре)
        // Фиксированная позиция слева от центра
        left = 20;
        top = rect.top;
    } else if (pos === 'top') {
        // Сверху (для console снизу)
        left = rect.left;
        top = rect.top - 250;
    } else {
        left = rect.right + margin;
        top = rect.top;
    }
    
    // Безопасные границы
    if (left + tooltipW > winW) left = winW - tooltipW - 10;
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    if (top + 220 > winH) top = winH - 230;
    
    this.tooltip.style.top = top + 'px';
    this.tooltip.style.left = left + 'px';
    this.tooltip.style.opacity = '1';
    this.tooltip.style.transform = 'translateY(0)';
    
    this.tooltip.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
            <div style="width:40px;height:40px;border-radius:50%;background:#0e639c;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="fas ${step.icon||'fa-info-circle'}" style="color:white;font-size:18px;"></i>
            </div>
            <div>
                <div style="color:#fff;font-weight:600;font-size:15px;">${step.title}</div>
                <div style="color:#666;font-size:11px;">Step ${this.currentStep+1} of ${this.steps.length}</div>
            </div>
        </div>
        <p style="font-size:13px;line-height:1.7;color:#aaa;margin-bottom:18px;">${step.text}</p>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
            ${this.currentStep>0?`<button onclick="window.ide.tutorial.prev()" style="padding:8px 16px;background:#3e3e42;border:none;color:#ccc;border-radius:6px;cursor:pointer;font-size:13px;">Back</button>`:''}
            <button onclick="window.ide.tutorial.next()" style="padding:8px 20px;background:#0e639c;border:none;color:white;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;">
                ${this.currentStep<this.steps.length-1?'Next →':'Finish ✓'}
            </button>
        </div>
    `;
}
    
    next() { this.currentStep++; this.showStep(); }
    prev() { this.currentStep--; this.showStep(); }
    
    end() {
        this.ide.tutorialActive = false;
        this.overlay.style.display = 'none';
        this.highlight.style.opacity = '0';
        this.tooltip.style.opacity = '0';
        this.tooltip.style.transform = 'translateY(15px)';
        this.skipBtn.style.opacity = '0';
        
        // Сохраняем что обучение пройдено
        try { 
            eel.save_settings(learn=false)();
            localStorage.setItem('tutorial_done', 'true');
        } catch(e) {}
    }
    
    setupWelcomeSteps() {
        this.steps = [
            {target:'.welcome-logo h1', icon:'fa-star', title:'Welcome!', text:'SimpleIDE is a lightweight code editor for quick development. No heavy frameworks, just fast coding.', position:'bottom'},
            {target:'#recent-list', icon:'fa-history', title:'Recent Projects', text:'Your recently opened projects appear here automatically. Click any project to open it instantly.', position:'right'},
            {target:'.welcome-btn.primary', icon:'fa-folder-plus', title:'Create Project', text:'Start a new project. A folder with project.json configuration will be created automatically.', position:'right'},
            {target:'.welcome-btn:nth-child(2)', icon:'fa-folder-open', title:'Open Project', text:'Open an existing project that already has a project.json file in its folder.', position:'right'},
            {target:'.welcome-btn:nth-child(3)', icon:'fa-folder', title:'Initialize', text:'Turn any existing folder into a project by creating a project.json file inside it.', position:'right'},
            {target:'.settings-btn', icon:'fa-cog', title:'Settings', text:'Customize the IDE: change language, editor theme, font size, and background image.', position:'left'}
        ];
        this.show();
    }
    
setupEditorSteps() {
    this.steps = [
        {target:'#explorer-panel', icon:'fa-folder-tree', title:'File Explorer', text:'Browse all files and folders. Right-click for options.', position:'right'},
        {target:'#btn-new-file', icon:'fa-file-plus', title:'New File', text:'Create a new file in selected folder.', position:'right'},
        {target:'#editor-container', icon:'fa-code', title:'Code Editor', text:'Write code here. 40+ languages supported. Ctrl+S to save.', position:'left'},
        {target:'#btn-run', icon:'fa-play', title:'Run Code', text:'Execute Python/JS files. Set start file in project settings first.', position:'left'},
        {target:'#console-panel', icon:'fa-terminal', title:'Console', text:'View output here. Type commands in the input field below.', position:'top'}
    ];
    this.show();
}
        this.show();
    }
}