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
    'go': { mode: 'go', name: 'Go' },
    'rs': { mode: 'rust', name: 'Rust' },
    'swift': { mode: 'swift', name: 'Swift' },
    'rb': { mode: 'ruby', name: 'Ruby' },
    'php': { mode: 'application/x-httpd-php', name: 'PHP' },
    'html': { mode: 'htmlmixed', name: 'HTML' },
    'htm': { mode: 'htmlmixed', name: 'HTML' },
    'css': { mode: 'css', name: 'CSS' },
    'scss': { mode: 'css', name: 'SCSS' },
    'sass': { mode: 'css', name: 'Sass' },
    'less': { mode: 'css', name: 'Less' },
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
    'toml': { mode: 'toml', name: 'TOML' },
    'ini': { mode: 'properties', name: 'INI' },
    'cfg': { mode: 'properties', name: 'Config' },
    'conf': { mode: 'properties', name: 'Config' },
    'txt': { mode: 'text/plain', name: 'Text' },
    'log': { mode: 'text/plain', name: 'Log' },
};

const FileIcons = {
    'py': 'fa-python', 'js': 'fa-js-square', 'ts': 'fa-code', 'jsx': 'fa-react',
    'html': 'fa-html5', 'css': 'fa-css3-alt', 'scss': 'fa-css3-alt',
    'c': 'fa-c', 'cpp': 'fa-c', 'h': 'fa-c', 'cs': 'fa-code',
    'java': 'fa-java', 'go': 'fa-code', 'rs': 'fa-code', 'rb': 'fa-gem',
    'php': 'fa-php', 'swift': 'fa-code', 'kt': 'fa-code',
    'sql': 'fa-database', 'sh': 'fa-terminal', 'bash': 'fa-terminal',
    'json': 'fa-code', 'xml': 'fa-code', 'yaml': 'fa-code', 'yml': 'fa-code',
    'md': 'fa-markdown', 'dockerfile': 'fa-docker', 'toml': 'fa-cog',
    'txt': 'fa-file-alt', 'log': 'fa-file-alt',
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