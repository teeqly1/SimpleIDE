// Управление проектом
class ProjectManager {
    constructor() {
        this.currentProject = null;
        this.isProjectOpen = false;
        this.config = null;
    }
    
    async loadFromStorage() {
        const projectPath = localStorage.getItem('currentProject');
        if (!projectPath) return;
        
        try {
            const result = await eel.open_project(projectPath)();
            if (result.success) {
                this.currentProject = result.projectPath;
                this.isProjectOpen = true;
                this.config = result.config;
                
                const projectName = result.config ? result.config.projectName : projectPath.split('/').pop();
                document.getElementById('project-name').textContent = projectName;
                document.getElementById('project-root-name').textContent = projectName;
                
                await window.ide.explorer.refresh();
                window.ide.console.log(`Проект загружен: ${result.projectPath}`, 'success');
            }
        } catch (error) {
            console.error('Ошибка загрузки проекта:', error);
        }
    }
    
    async saveCurrentFile() {
        const result = await window.ide.editor.saveFile();
        
        if (result.success) {
            window.ide.console.log(`Файл сохранен: ${result.filePath}`, 'success');
        } else {
            window.ide.console.log(`Ошибка сохранения: ${result.error}`, 'error');
        }
    }
    
    async runCode() {
        if (!this.isProjectOpen) {
            window.ide.console.log('Проект не открыт', 'warning');
            return;
        }
        
        this.config = await eel.get_project_config()();
        
        if (!this.config || !this.config.startFile) {
            if (confirm('Не выбран стартовый файл. Открыть настройки проекта?')) {
                window.ide.openSettings();
            }
            return;
        }
        
        await this.saveCurrentFile();
        
        const startFile = this.config.startFile;
        const preCommand = this.config.preLaunchCommand || '';
        
        window.ide.console.log(`Запуск: ${startFile}`, '');
        await eel.run_code(startFile, preCommand)();
        window.ide.console.startPolling();
    }
    
    async stopCode() {
        try {
            await eel.stop_execution()();
            window.ide.console.log('Выполнение остановлено', 'warning');
            window.ide.console.stopPolling();
        } catch (error) {
            console.error('Error stopping execution:', error);
        }
    }
}