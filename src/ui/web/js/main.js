class SimpleIDE {
    constructor() {
        this.currentProject = null;
        this.currentFile = null;
        this.openTabs = new Map();
        this.editor = null;
        this.isProjectOpen = false;
        this.config = null;
        this.selectedItem = null;
        
        this.init();
    }
    
    async init() {
        this.editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
            mode: 'python',
            theme: 'monokai',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4,
            tabSize: 4,
            lineWrapping: false,
            readOnly: false
        });
        
        this.setupEventListeners();
        await this.loadSavedProject();
    }
    
    async loadSavedProject() {
        const projectPath = localStorage.getItem('currentProject');
        if (projectPath) {
            const result = await eel.open_project(projectPath)();
            if (result.success) {
                this.currentProject = result.projectPath;
                this.isProjectOpen = true;
                this.config = result.config;
                
                const projectName = result.config ? result.config.projectName : projectPath.split('/').pop();
                document.getElementById('project-name').textContent = projectName;
                document.getElementById('project-root-name').textContent = projectName;
                
                await this.refreshFileTree();
                this.addConsoleLine(`Проект загружен: ${result.projectPath}`, 'success');
            }
        }
    }
    
    setupEventListeners() {
        document.getElementById('btn-save').addEventListener('click', () => this.saveCurrentFile());
        document.getElementById('btn-run').addEventListener('click', () => this.runCode());
        document.getElementById('btn-stop').addEventListener('click', () => this.stopCode());
        document.getElementById('btn-settings').addEventListener('click', () => this.openSettings());
        
        document.getElementById('btn-new-file').addEventListener('click', () => this.createNewFile());
        document.getElementById('btn-new-folder').addEventListener('click', () => this.createNewFolder());
        
        document.getElementById('btn-clear-console').addEventListener('click', () => this.clearConsole());
        
        document.querySelector('.modal-close').addEventListener('click', () => this.closeSettings());
        document.querySelector('.modal-cancel').addEventListener('click', () => this.closeSettings());
        document.getElementById('btn-save-settings').addEventListener('click', () => this.saveSettings());
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hideContextMenu();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.saveCurrentFile();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.runCode();
                        break;
                }
            }
        });
        
        document.getElementById('file-tree').addEventListener('click', (e) => {
            if (e.target.id === 'file-tree') {
                this.selectedItem = null;
                document.querySelectorAll('.tree-item.selected').forEach(i => i.classList.remove('selected'));
            }
        });
    }
    
    async refreshFileTree() {
        if (!this.isProjectOpen) return;
        
        const fileTree = await eel.get_file_tree()();
        const treeContainer = document.getElementById('file-tree');
        
        if (!fileTree || fileTree.length === 0) {
            treeContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>Папка пуста</p>
                    <p style="font-size: 12px; margin-top: 8px;">Создайте новый файл или папку</p>
                </div>
            `;
            return;
        }
        
        treeContainer.innerHTML = this.renderTree(fileTree);
        this.setupTreeEvents();
    }
    
    renderTree(items, level = 0) {
        let html = '';
        
        for (const item of items) {
            const paddingLeft = level * 20;
            const hasChildren = item.type === 'directory' && item.children && item.children.length > 0;
            
            html += `<div class="tree-item ${item.type}" data-path="${item.path}" style="padding-left: ${paddingLeft}px">`;
            
            if (item.type === 'directory') {
                // Все папки свернуты по умолчанию
                html += `<span class="tree-toggle">▶</span>`;
                html += `<i class="icon fas fa-folder"></i>`;
            } else {
                html += `<span class="tree-toggle" style="visibility: hidden;">▶</span>`;
                const icon = this.getFileIcon(item.name);
                html += `<i class="icon fas ${icon}"></i>`;
            }
            
            html += `<span class="name">${item.name}</span>`;
            html += `</div>`;
            
            if (hasChildren) {
                // Все children свернуты по умолчанию
                html += `<div class="children collapsed">`;
                html += this.renderTree(item.children, level + 1);
                html += `</div>`;
            }
        }
        
        return html;
    }
    
    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'py': 'fa-python',
            'js': 'fa-js',
            'html': 'fa-html5',
            'css': 'fa-css3-alt',
            'json': 'fa-code',
            'md': 'fa-markdown',
            'txt': 'fa-file-alt',
            'jpg': 'fa-file-image',
            'png': 'fa-file-image',
            'pdf': 'fa-file-pdf'
        };
        
        return iconMap[ext] || 'fa-file';
    }
    
    setupTreeEvents() {
        const treeItems = document.querySelectorAll('.tree-item');
        
        treeItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const path = item.dataset.path;
                
                treeItems.forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                this.selectedItem = path;
                
                if (item.classList.contains('directory')) {
                    this.toggleDirectory(item);
                } else {
                    this.openFile(path);
                }
            });
            
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                treeItems.forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                this.selectedItem = item.dataset.path;
                
                this.showContextMenu(e.clientX, e.clientY, item);
            });
            
            item.draggable = true;
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.path);
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (item.classList.contains('directory')) {
                    item.classList.add('drag-over');
                }
            });
            
            item.addEventListener('dragleave', (e) => {
                item.classList.remove('drag-over');
            });
            
            item.addEventListener('drop', async (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                
                if (item.classList.contains('directory')) {
                    const sourcePath = e.dataTransfer.getData('text/plain');
                    const sourceName = sourcePath.split('/').pop();
                    const targetPath = item.dataset.path + '/' + sourceName;
                    
                    if (sourcePath !== targetPath && !targetPath.startsWith(sourcePath + '/')) {
                        await this.moveItem(sourcePath, targetPath);
                    }
                }
            });
        });
        
        document.querySelectorAll('.tree-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const treeItem = toggle.parentElement;
                this.toggleDirectory(treeItem);
            });
        });
    }
    
    toggleDirectory(item) {
        const children = item.nextElementSibling;
        if (children && children.classList.contains('children')) {
            children.classList.toggle('collapsed');
            const toggle = item.querySelector('.tree-toggle');
            const icon = item.querySelector('.icon');
            
            if (children.classList.contains('collapsed')) {
                toggle.textContent = '▶';
                icon.className = icon.className.replace('fa-folder-open', 'fa-folder');
            } else {
                toggle.textContent = '▼';
                icon.className = icon.className.replace('fa-folder', 'fa-folder-open');
            }
        }
    }
    
    async openFile(filePath) {
        const result = await eel.read_file(filePath)();
        
        if (result.success) {
            this.currentFile = filePath;
            
            const ext = filePath.split('.').pop().toLowerCase();
            const modeMap = {
                'py': 'python',
                'js': 'javascript',
                'html': 'htmlmixed',
                'css': 'css',
                'json': { name: 'javascript', json: true }
            };
            
            this.editor.setOption('mode', modeMap[ext] || 'text/plain');
            this.editor.setValue(result.content);
            
            this.addTab(filePath);
        } else {
            this.addConsoleLine(`Ошибка открытия файла: ${result.error}`, 'error');
        }
    }
    
    addTab(filePath) {
        const fileName = filePath.split('/').pop();
        const tabsContainer = document.querySelector('.tabs-container');
        
        const existingTab = Array.from(tabsContainer.children).find(
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
        
        tabsContainer.appendChild(tab);
        this.activateTab(tab);
        this.openTabs.set(filePath, tab);
    }
    
    activateTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const filePath = tab.dataset.path;
        if (filePath && filePath !== this.currentFile) {
            this.openFile(filePath);
        }
    }
    
    closeTab(tab) {
        const filePath = tab.dataset.path;
        this.openTabs.delete(filePath);
        
        const tabsContainer = document.querySelector('.tabs-container');
        const currentIndex = Array.from(tabsContainer.children).indexOf(tab);
        
        tab.remove();
        
        const remainingTabs = tabsContainer.children;
        if (remainingTabs.length > 0) {
            const newIndex = Math.min(currentIndex, remainingTabs.length - 1);
            this.activateTab(remainingTabs[newIndex]);
        } else {
            this.editor.setValue('');
            this.currentFile = null;
        }
    }
    
    async saveCurrentFile() {
        if (!this.currentFile) {
            this.addConsoleLine('Нет открытого файла для сохранения', 'warning');
            return;
        }
        
        const content = this.editor.getValue();
        const result = await eel.save_file(this.currentFile, content)();
        
        if (result.success) {
            this.addConsoleLine(`Файл сохранен: ${this.currentFile}`, 'success');
        } else {
            this.addConsoleLine(`Ошибка сохранения: ${result.error}`, 'error');
        }
    }
    
    async runCode() {
        if (!this.isProjectOpen) {
            this.addConsoleLine('Проект не открыт', 'warning');
            return;
        }
        
        this.config = await eel.get_project_config()();
        
        if (!this.config || !this.config.startFile) {
            if (confirm('Не выбран стартовый файл. Открыть настройки проекта?')) {
                this.openSettings();
            }
            return;
        }
        
        if (this.currentFile) {
            await this.saveCurrentFile();
        }
        
        const startFile = this.config.startFile;
        const preCommand = this.config.preLaunchCommand || '';
        
        this.addConsoleLine(`Запуск: ${startFile}`, '');
        const result = await eel.run_code(startFile, preCommand)();
        
        if (!result.success) {
            this.addConsoleLine(`Ошибка запуска: ${result.error}`, 'error');
        }
        
        this.startOutputPolling();
    }
    
    startOutputPolling() {
        if (this.outputInterval) {
            clearInterval(this.outputInterval);
        }
        
        this.outputInterval = setInterval(async () => {
            const output = await eel.get_output()();
            const consoleOutput = document.getElementById('console-output');
            
            if (output && output.trim()) {
                consoleOutput.innerHTML = output.split('\n').map(line => 
                    `<div class="console-line">${this.escapeHtml(line)}</div>`
                ).join('');
                consoleOutput.scrollTop = consoleOutput.scrollHeight;
            }
        }, 500);
    }
    
    async stopCode() {
        try {
            const result = await eel.stop_execution()();
            if (result.success) {
                this.addConsoleLine('Выполнение остановлено', 'warning');
            }
            
            if (this.outputInterval) {
                clearInterval(this.outputInterval);
            }
        } catch (error) {
            console.error('Error stopping execution:', error);
        }
    }
    
    async createNewFile() {
        if (!this.isProjectOpen) {
            this.addConsoleLine('Проект не открыт', 'warning');
            return;
        }
        
        const fileName = prompt('Введите имя файла (например, script.py):');
        if (!fileName) return;
        
        const parentPath = this.selectedItem || '';
        const result = await eel.create_item(parentPath, fileName, 'file')();
        
        if (result.success) {
            this.addConsoleLine(`Файл создан: ${fileName}`, 'success');
            await this.refreshFileTree();
        } else {
            this.addConsoleLine(`Ошибка создания файла: ${result.error}`, 'error');
        }
    }
    
    async createNewFolder() {
        if (!this.isProjectOpen) {
            this.addConsoleLine('Проект не открыт', 'warning');
            return;
        }
        
        const folderName = prompt('Введите имя папки:');
        if (!folderName) return;
        
        const parentPath = this.selectedItem || '';
        const result = await eel.create_item(parentPath, folderName, 'directory')();
        
        if (result.success) {
            this.addConsoleLine(`Папка создана: ${folderName}`, 'success');
            await this.refreshFileTree();
        } else {
            this.addConsoleLine(`Ошибка создания папки: ${result.error}`, 'error');
        }
    }
    
    async moveItem(sourcePath, targetPath) {
        const result = await eel.move_item(sourcePath, targetPath)();
        
        if (result.success) {
            this.addConsoleLine(`Перемещено: ${sourcePath} -> ${targetPath}`, 'success');
            await this.refreshFileTree();
        } else {
            this.addConsoleLine(`Ошибка перемещения: ${result.error}`, 'error');
        }
    }
    
    showContextMenu(x, y, treeItem) {
        const contextMenu = document.getElementById('context-menu');
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.classList.add('show');
        contextMenu.dataset.targetPath = treeItem.dataset.path;
        contextMenu.dataset.targetType = treeItem.classList.contains('directory') ? 'directory' : 'file';
        
        contextMenu.querySelectorAll('.context-item').forEach(item => {
            item.onclick = async (e) => {
                const action = item.dataset.action;
                const path = treeItem.dataset.path;
                
                switch(action) {
                    case 'open':
                        if (treeItem.classList.contains('directory')) {
                            this.toggleDirectory(treeItem);
                        } else {
                            this.openFile(path);
                        }
                        break;
                    case 'new-file':
                        const newFileName = prompt('Имя нового файла:');
                        if (newFileName) {
                            await eel.create_item(path, newFileName, 'file')();
                            await this.refreshFileTree();
                        }
                        break;
                    case 'new-folder':
                        const newFolderName = prompt('Имя новой папки:');
                        if (newFolderName) {
                            await eel.create_item(path, newFolderName, 'directory')();
                            await this.refreshFileTree();
                        }
                        break;
                    case 'rename':
                        const oldName = path.split('/').pop();
                        const newName = prompt('Новое имя:', oldName);
                        if (newName && newName !== oldName) {
                            await eel.rename_item(path, newName)();
                            await this.refreshFileTree();
                        }
                        break;
                    case 'delete':
                        if (confirm(`Удалить "${path.split('/').pop()}"?`)) {
                            await eel.delete_item(path)();
                            await this.refreshFileTree();
                            this.addConsoleLine(`Удалено: ${path}`, 'warning');
                        }
                        break;
                }
                
                this.hideContextMenu();
            };
        });
    }
    
    hideContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        contextMenu.classList.remove('show');
    }
    
    openSettings() {
        const modal = document.getElementById('settings-modal');
        modal.classList.add('show');
        this.updateSettingsFileList();
        
        if (this.config) {
            document.getElementById('start-file').value = this.config.startFile || '';
            document.getElementById('pre-command').value = this.config.preLaunchCommand || '';
        }
    }
    
    closeSettings() {
        const modal = document.getElementById('settings-modal');
        modal.classList.remove('show');
    }
    
    async updateSettingsFileList() {
        if (!this.isProjectOpen) return;
        
        const fileTree = await eel.get_file_tree()();
        const select = document.getElementById('start-file');
        
        select.innerHTML = '<option value="">Выберите файл...</option>';
        
        const addFiles = (items, prefix = '') => {
            for (const item of items) {
                if (item.type === 'file') {
                    const option = document.createElement('option');
                    option.value = item.path;
                    option.textContent = prefix + item.name;
                    select.appendChild(option);
                } else if (item.type === 'directory') {
                    addFiles(item.children || [], prefix + item.name + '/');
                }
            }
        };
        
        addFiles(fileTree);
    }
    
    async saveSettings() {
        const startFile = document.getElementById('start-file').value;
        const preCommand = document.getElementById('pre-command').value;
        
        const config = {
            ...this.config,
            startFile: startFile,
            preLaunchCommand: preCommand
        };
        
        const result = await eel.save_project_config(config)();
        
        if (result.success) {
            this.config = config;
            this.addConsoleLine('Настройки проекта сохранены', 'success');
            this.closeSettings();
        } else {
            this.addConsoleLine(`Ошибка сохранения настроек: ${result.error}`, 'error');
        }
    }
    
    addConsoleLine(text, type = '') {
        const consoleOutput = document.getElementById('console-output');
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = text;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
    
    clearConsole() {
        document.getElementById('console-output').innerHTML = '';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.ide = new SimpleIDE();
});