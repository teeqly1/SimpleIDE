class ConsoleManager {
    constructor(ide) {
        this.ide = ide;
        this.consoleOutput = document.getElementById('console-output');
        this.outputInterval = null;
    }
    
    log(text, type = '') {
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = text;
        this.consoleOutput.appendChild(line);
        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
    }
    
    clear() {
        this.consoleOutput.innerHTML = '';
    }
    
    startPolling() {
        this.stopPolling();
        
        this.outputInterval = setInterval(async () => {
            try {
                const output = await eel.get_output()();
                if (output && output.trim()) {
                    this.consoleOutput.innerHTML = output.split('\n').map(line => 
                        `<div class="console-line">${this.escapeHtml(line)}</div>`
                    ).join('');
                    this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
                }
            } catch (error) {}
        }, 500);
    }
    
    stopPolling() {
        if (this.outputInterval) {
            clearInterval(this.outputInterval);
            this.outputInterval = null;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}