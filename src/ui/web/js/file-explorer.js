class FileExplorer {
    constructor(ide) {
        this.ide = ide;
        this.selectedItem = null;
        this.treeContainer = document.getElementById('file-tree');
    }
    
    async refresh() {
        if (!this.ide.isProjectOpen) return;
        
        const fileTree = await eel.get_file_tree()();
        
        if (!fileTree || fileTree.length === 0) {
            this.treeContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>Папка пуста</p>
                    <p style="font-size: 12px; margin-top: 8px;">Создайте новый файл или папку</p>
                </div>`;
            return;
        }
        
        this.treeContainer.innerHTML = this.renderTree(fileTree);
        this.setupEvents();
    }
    
    renderTree(items, level = 0) {
        let html = '';
        
        for (const item of items) {
            const paddingLeft = level * 20;
            const hasChildren = item.type === 'directory' && item.children && item.children.length > 0;
            
            html += `<div class="tree-item ${item.type}" data-path="${item.path}" style="padding-left: ${paddingLeft}px">`;
            
            if (item.type === 'directory') {
                html += `<span class="tree-toggle">▶</span>`;
                html += `<i class="icon fas fa-folder"></i>`;
            } else {
                html += `<span class="tree-toggle" style="visibility: hidden;">▶</span>`;
                const icon = getFileIcon(item.name);
                html += `<i class="icon fas ${icon}"></i>`;
            }
            
            html += `<span class="name">${item.name}</span>`;
            html += `</div>`;
            
            if (hasChildren) {
                html += `<div class="children collapsed">`;
                html += this.renderTree(item.children, level + 1);
                html += `</div>`;
            }
        }
        
        return html;
    }
    
    setupEvents() {
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
                    this.ide.openFileInTab(path);
                }
            });
            
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                treeItems.forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                this.selectedItem = item.dataset.path;
                
                this.ide.contextMenu.show(e.clientX, e.clientY, item);
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
                        const result = await eel.move_item(sourcePath, targetPath)();
                        if (result.success) {
                            this.ide.addConsoleLine(`Перемещено: ${sourcePath} -> ${targetPath}`, 'success');
                            await this.refresh();
                        }
                    }
                }
            });
        });
        
        document.querySelectorAll('.tree-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDirectory(toggle.parentElement);
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
    
    async createFile() {
        if (!this.ide.isProjectOpen) {
            this.ide.addConsoleLine('Проект не открыт', 'warning');
            return;
        }
        
        const fileName = prompt('Введите имя файла (например, script.py):');
        if (!fileName) return;
        
        const parentPath = this.selectedItem || '';
        const result = await eel.create_item(parentPath, fileName, 'file')();
        
        if (result.success) {
            this.ide.addConsoleLine(`Файл создан: ${fileName}`, 'success');
            await this.refresh();
        } else {
            this.ide.addConsoleLine(`Ошибка: ${result.error}`, 'error');
        }
    }
    
    async createFolder() {
        if (!this.ide.isProjectOpen) {
            this.ide.addConsoleLine('Проект не открыт', 'warning');
            return;
        }
        
        const folderName = prompt('Введите имя папки:');
        if (!folderName) return;
        
        const parentPath = this.selectedItem || '';
        const result = await eel.create_item(parentPath, folderName, 'directory')();
        
        if (result.success) {
            this.ide.addConsoleLine(`Папка создана: ${folderName}`, 'success');
            await this.refresh();
        } else {
            this.ide.addConsoleLine(`Ошибка: ${result.error}`, 'error');
        }
    }
}