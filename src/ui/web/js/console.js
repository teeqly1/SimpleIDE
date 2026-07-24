class ConsoleManager {
    constructor(ide) {
        this.ide = ide;
        this.consoleOutput = document.getElementById('console-output');
        this.outputInterval = null;
        this.commandHistory = [];
        this.historyIndex = -1;
        this.consoleOutput.style.userSelect = 'text';
        this.consoleOutput.style.cursor = 'text';
    }
    
    log(text, type = '') {
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = text;
        line.style.userSelect = 'text';
        this.consoleOutput.appendChild(line);
        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
    }
    
    clear() {
        this.consoleOutput.innerHTML = '';
    }
    
    execute(ide) {
        const input = document.getElementById('console-input');
        const cmd = input.value.trim();
        if (!cmd) return;
        
        this.commandHistory.push(cmd);
        this.historyIndex = -1;
        this.log('> ' + cmd, 'command');
        
        if (cmd === 'clear' || cmd === 'cls') {
            this.clear();
        } else if (cmd === 'help') {
            this.log('Commands: clear/cls, help, pwd', 'info');
        } else if (cmd === 'pwd') {
            this.log(ide.currentProject || 'No project', '');
        } else {
            eel.execute_command(cmd)().then(r => {
                if (r && r.output) {
                    const lines = r.output.split('\n');
                    lines.forEach(line => { if (line.trim()) this.log(line, ''); });
                }
                if (r && r.error) this.log(r.error, 'error');
            }).catch(e => this.log('Error: ' + e, 'error'));
        }
        
        input.value = '';
        input.focus();
    }
    
    startPolling() {
        this.stopPolling();
        let lastOutput = '';
        
        this.outputInterval = setInterval(async () => {
            try {
                const output = await eel.get_output()();
                if (output && output !== lastOutput) {
                    const newLines = output.substring(lastOutput.length);
                    if (newLines.trim()) {
                        const lines = newLines.split('\n');
                        lines.forEach(line => {
                            if (line.trim()) {
                                const div = document.createElement('div');
                                div.className = 'console-line output';
                                div.textContent = line;
                                div.style.userSelect = 'text';
                                this.consoleOutput.appendChild(div);
                            }
                        });
                        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
                    }
                    lastOutput = output;
                }
            } catch(e) {}
        }, 300);
    }
    
    stopPolling() {
        if (this.outputInterval) {
            clearInterval(this.outputInterval);
            this.outputInterval = null;
        }
    }
}