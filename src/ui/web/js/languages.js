// Карта всех поддерживаемых языков программирования
const LanguageMap = {
    'py': { mode: 'python', name: 'Python' },
    'pyw': { mode: 'python', name: 'Python' },
    'js': { mode: 'javascript', name: 'JavaScript' },
    'mjs': { mode: 'javascript', name: 'JavaScript Module' },
    'jsx': { mode: 'javascript', name: 'React JSX' },
    'ts': { mode: 'javascript', name: 'TypeScript' },
    'tsx': { mode: 'javascript', name: 'React TSX' },
    'c': { mode: 'text/x-csrc', name: 'C' },
    'h': { mode: 'text/x-csrc', name: 'C Header' },
    'cpp': { mode: 'text/x-c++src', name: 'C++' },
    'hpp': { mode: 'text/x-c++src', name: 'C++ Header' },
    'cc': { mode: 'text/x-c++src', name: 'C++' },
    'cs': { mode: 'text/x-csharp', name: 'C#' },
    'java': { mode: 'text/x-java', name: 'Java' },
    'kt': { mode: 'text/x-java', name: 'Kotlin' },
    'html': { mode: 'htmlmixed', name: 'HTML' },
    'htm': { mode: 'htmlmixed', name: 'HTML' },
    'css': { mode: 'css', name: 'CSS' },
    'scss': { mode: 'css', name: 'SCSS' },
    'less': { mode: 'css', name: 'Less' },
    'php': { mode: 'application/x-httpd-php', name: 'PHP' },
    'rb': { mode: 'ruby', name: 'Ruby' },
    'go': { mode: 'go', name: 'Go' },
    'rs': { mode: 'rust', name: 'Rust' },
    'swift': { mode: 'swift', name: 'Swift' },
    'sql': { mode: 'text/x-sql', name: 'SQL' },
    'sh': { mode: 'shell', name: 'Shell' },
    'bash': { mode: 'shell', name: 'Bash' },
    'bat': { mode: 'shell', name: 'Batch' },
    'ps1': { mode: 'shell', name: 'PowerShell' },
    'xml': { mode: 'xml', name: 'XML' },
    'json': { mode: { name: 'javascript', json: true }, name: 'JSON' },
    'yaml': { mode: 'yaml', name: 'YAML' },
    'yml': { mode: 'yaml', name: 'YAML' },
    'md': { mode: 'markdown', name: 'Markdown' },
    'dockerfile': { mode: 'dockerfile', name: 'Dockerfile' },
    'txt': { mode: 'text/plain', name: 'Text' },
    'log': { mode: 'text/plain', name: 'Log' },
};

const FileIcons = {
    'py': 'fa-python',
    'js': 'fa-js-square',
    'jsx': 'fa-react',
    'ts': 'fa-code',
    'tsx': 'fa-react',
    'html': 'fa-html5',
    'css': 'fa-css3-alt',
    'scss': 'fa-css3-alt',
    'less': 'fa-css3-alt',
    'php': 'fa-php',
    'rb': 'fa-gem',
    'go': 'fa-code',
    'rs': 'fa-code',
    'swift': 'fa-code',
    'java': 'fa-java',
    'sql': 'fa-database',
    'md': 'fa-markdown',
    'json': 'fa-code',
    'xml': 'fa-code',
    'yaml': 'fa-code',
    'yml': 'fa-code',
    'sh': 'fa-terminal',
    'bash': 'fa-terminal',
    'bat': 'fa-terminal',
    'ps1': 'fa-terminal',
    'dockerfile': 'fa-docker',
    'txt': 'fa-file-alt',
    'log': 'fa-file-alt',
};

function getLanguageInfo(filePath) {
    if (!filePath) return { mode: 'text/plain', name: 'Text' };
    const ext = filePath.split('.').pop().toLowerCase();
    const fileName = filePath.split('/').pop().toLowerCase();
    if (fileName === 'dockerfile') return LanguageMap['dockerfile'];
    if (fileName === 'makefile') return { mode: 'shell', name: 'Makefile' };
    return LanguageMap[ext] || { mode: 'text/plain', name: 'Text' };
}

function getFileIcon(filename) {
    if (!filename) return 'fa-file';
    const ext = filename.split('.').pop().toLowerCase();
    return FileIcons[ext] || 'fa-file';
}