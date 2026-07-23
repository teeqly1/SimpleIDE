class ContextMenu {
    constructor(ide) {
        this.ide = ide;
        this.menu = document.getElementById('context-menu');
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hide();
            }
        });
        
        this.menu.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', async () => {
                const action = item.dataset.action;
                const path = this.menu.dataset.targetPath;
                const type = this.menu.dataset.targetType;
                
                switch(action) {
                    case 'open':
                        if (type === 'directory') {
                            const treeItem = document.querySelector(`.tree-item[data-path="${path}"]`);
                            if (treeItem) this.ide.explorer.toggleDirectory(treeItem);
                        } else {
                            this.ide.openFileInTab(path);
                        }
                        break;
                    case 'new-file':
                        const newFileName = prompt('Имя нового файла:');
                        if (newFileName) {
                            await eel.create_item(path, newFileName, 'file')();
                            await this.ide.explorer.refresh();
                        }
                        break;
                    case 'new-folder':
                        const newFolderName = prompt('Имя новой папки:');
                        if (newFolderName) {
                            await eel.create_item(path, newFolderName, 'directory')();
                            await this.ide.explorer.refresh();
                        }
                        break;
                    case 'rename':
                        const oldName = path.split('/').pop();
                        const newName = prompt('Новое имя:', oldName);
                        if (newName && newName !== oldName) {
                            await eel.rename_item(path, newName)();
                            await this.ide.explorer.refresh();
                        }
                        break;
                    case 'delete':
                        if (confirm(`Удалить "${path.split('/').pop()}"?`)) {
                            await eel.delete_item(path)();
                            await this.ide.explorer.refresh();
                            this.ide.addConsoleLine(`Удалено: ${path}`, 'warning');
                        }
                        break;
                }
                
                this.hide();
            });
        });
    }
    
    show(x, y, treeItem) {
        this.menu.style.left = x + 'px';
        this.menu.style.top = y + 'px';
        this.menu.classList.add('show');
        this.menu.dataset.targetPath = treeItem.dataset.path;
        this.menu.dataset.targetType = treeItem.classList.contains('directory') ? 'directory' : 'file';
    }
    
    hide() {
        this.menu.classList.remove('show');
    }
}