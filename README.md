![Simple IDE](icon.svg)

# SimpleIDE

A lightweight and fast IDE for coding.

## Features

### Project Management
- Create new project (creates folder with `project.json`)
- Open existing project (requires `project.json`)
- Initialize project in existing folder (auto-creates `project.json`)
- Recent projects history with quick access

### File Manager
- File tree with collapsible folders
- Create, delete, rename files and folders
- Drag and drop support
- Right-click context menu
- Safe path handling (cannot access outside project folder)

### Code Editor
- Syntax highlighting for 40+ languages:
  Python, JavaScript, TypeScript, C, C++, C#, Java, Kotlin, Go, Rust, Swift, PHP, Ruby, HTML, CSS, SCSS, Less, SQL, Shell, Bash, YAML, JSON, Markdown, Dockerfile, and more
- Line numbers
- Code folding
- Bracket matching and auto-closing
- Tabbed interface for multiple files

### HTML Preview
- Built-in iframe preview for HTML files
- Auto-refresh on save

### Code Execution
- Run Python files (`.py`)
- Run JavaScript files (`.js`)
- Pre-launch commands support
- Stop execution button

### Console
- Real-time output from running processes
- Command input (type commands directly in console)
- Command history (arrow keys)
- Clear console button

### Settings
- Language selection (Russian, English) with localStorage persistence
- Editor theme (Monokai, Dracula, Material, Eclipse)
- Font size (12px, 14px, 16px, 18px)
- Custom background image upload

### UI/UX
- Loading screen with progress bar
- Toast notifications
- Animated buttons, modals, and context menus

## Installation

### Method 1: Download EXE
1. Download `SimpleIDE.exe` from [Releases](https://github.com/username/SimpleIDE/releases)
2. Run the executable (requires Chrome or Edge)

### Method 2: Portable Version
1. Download `SimpleIDE_portable.zip` from [Releases](https://github.com/username/SimpleIDE/releases)
2. Extract the archive
3. Run `start.bat` (installs dependencies and launches IDE)

### Method 3: From Source
```bash
git clone https://github.com/username/SimpleIDE.git
cd SimpleIDE
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python app.py
