
# SimpleIDE

Lightweight IDE for coding with Python and web technologies.

## What it does

SimpleIDE is a desktop code editor that runs in its own window. It provides:

- **Project management** - create, open, and initialize projects with `project.json`
- **File explorer** - browse files and folders with drag and drop support
- **Code editor** - syntax highlighting for 40+ languages (Python, JavaScript, C, C++, Java, Go, Rust, HTML, CSS, and more)
- **Code execution** - run Python and JavaScript files directly
- **Built-in console** - view output and type commands
- **HTML preview** - live preview of HTML files
- **Multiple tabs** - open several files at once
- **Language support** - Russian and English interface
- **Customizable** - choose theme, font size, and background image

## Why this IDE is lightweight

- Built with **Python + Eel** - uses system browser for UI, no heavy frameworks
- **No Electron** - doesn't bundle Chromium (uses your installed Chrome/Edge)
- **Minimal dependencies** - only `eel` and `watchdog`
- **Vanilla JavaScript** - no React, Vue, or Angular
- **Small footprint** - EXE is ~15MB, uses ~50MB RAM
- **Fast startup** - loads in 1-2 seconds
- **Modular code** - clean architecture, easy to modify

## Installation

### Download EXE (Windows)

1. Download `SimpleIDE.exe` from [Releases](https://github.com/teeqly/SimpleIDE/releases)
2. Run it (Any installed browser is required.)

### From source

```bash
git clone https://github.com/teeqly/SimpleIDE.git
cd SimpleIDE
pip install -r requirements.txt
python app.py
```

### Build from source

```bash
pip install pyinstaller
pyinstaller --onefile --windowed --add-data "src;src" --add-data "others;others" --name SimpleIDE app.py
```

## Requirements

- Windows, Linux, or macOS
- Python 3.8+ (for source installation)
- Google Chrome or Microsoft Edge

## License

MIT License. See [LICENSE](LICENSE) for details.

Original author: [teeqly](https://github.com/teeqly)
```
