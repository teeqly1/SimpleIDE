class TabsManager {
    constructor(ide) {
        this.ide = ide;
        this.openTabs = new Map();
        this.tabsContainer = document.querySelector('.tabs-container');
    }
    
    async openFile(filePath) {
        const result = await this.ide.editor.openFile(filePath);
        
        if (result.success) {
            this.addTab(filePath, result.langInfo);
            this.ide.addConsoleLine(`Открыт: ${filePath}`, 'info');
        } else {
            this.ide.addConsoleLine(`Ошибка: ${result.error}`, 'error');
        }
    }
    
    addTab(filePath, langInfo) {
        const fileName = filePath.split('/').pop();
        
        const existingTab = Array.from(this.tabsContainer.children).find(
            tab => tab.dataset.path === filePath
        );
        
        if (existingTab) {
            this.activateTab(existingTab);
            return;
        }
        
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.path = filePath;
        tab.innerHTML = `
            <span>${fileName}</span>
            <button class="tab-close">&times;</button>
        `;
        
        tab.addEventListener('click', () => this.activateTab(tab));
        tab.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tab);
        });
        
        this.tabsContainer.appendChild(tab);
        this.activateTab(tab);
        this.openTabs.set(filePath, tab);
    }
    
    activateTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const filePath = tab.dataset.path;
        if (filePath && filePath !== this.ide.editor.currentFile) {
            this.ide.editor.openFile(filePath);
        }
    }
    
    closeTab(tab) {
        const filePath = tab.dataset.path;
        this.openTabs.delete(filePath);
        
        const currentIndex = Array.from(this.tabsContainer.children).indexOf(tab);
        tab.remove();
        
        const remainingTabs = this.tabsContainer.children;
        if (remainingTabs.length > 0) {
            const newIndex = Math.min(currentIndex, remainingTabs.length - 1);
            this.activateTab(remainingTabs[newIndex]);
        } else {
            this.ide.editor.clear();
        }
    }
}