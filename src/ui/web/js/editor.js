class EditorManager {
    constructor(ide) {
        this.ide = ide;
        this.editor = null;
        this.currentFile = null;
    }
    
    init() {
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
    }
    
    async openFile(filePath) {
        const result = await eel.read_file(filePath)();
        
        if (result.success) {
            this.currentFile = filePath;
            const langInfo = getLanguageInfo(filePath);
            this.editor.setOption('mode', langInfo.mode);
            this.editor.setValue(result.content);
            return { success: true, langInfo };
        }
        return result;
    }
    
    getValue() {
        return this.editor.getValue();
    }
    
    setValue(content) {
        this.editor.setValue(content);
    }
    
    clear() {
        this.editor.setValue('');
        this.currentFile = null;
    }
}