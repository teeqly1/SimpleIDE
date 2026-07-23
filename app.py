import sys
import os

# Патч для pkg_resources
try:
    import pkg_resources
except ImportError:
    import types
    pkg_resources = types.ModuleType('pkg_resources')
    def require(*a, **k): pass
    def get_distribution(*a, **k):
        class D: version = '0.0.0'
        return D()
    def resource_filename(p, r):
        try: return os.path.join(os.path.dirname(__import__(p).__file__), r)
        except: return os.path.join(os.path.dirname(__file__), r)
    def resource_string(p, r):
        with open(resource_filename(p, r), 'r', encoding='utf-8') as f: return f.read()
    pkg_resources.require = require
    pkg_resources.get_distribution = get_distribution
    pkg_resources.resource_filename = resource_filename
    pkg_resources.resource_string = resource_string
    sys.modules['pkg_resources'] = pkg_resources

import eel
import json
from datetime import datetime
import shutil
import subprocess
import threading
from pathlib import Path
import atexit

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_DIR = os.path.join(os.path.expanduser('~'), '.simple_ide')
LANGUAGES_DIR = os.path.join(BASE_DIR, 'others', 'languages')

os.makedirs(CONFIG_DIR, exist_ok=True)

# ===== Конфигурация =====
class Config:
    def __init__(self):
        self.settings_file = os.path.join(CONFIG_DIR, 'settings.json')
        self.recent_file = os.path.join(CONFIG_DIR, 'recent_projects.json')
        self.session_file = os.path.join(CONFIG_DIR, 'session.json')
        
        self.settings = self._load_json(self.settings_file, {
            "language": "ru", "theme": "monokai", "font_size": 14,
            "bg_image": None, "learn": True
        })
        self.recent_projects = self._load_json(self.recent_file, [])
        self.session = self._load_json(self.session_file, {
            "last_project": None, "open_tabs": [], "active_tab": None, "explorer_expanded": []
        })
    
    def _load_json(self, path, default):
        try:
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f: return json.load(f)
        except: pass
        return default
    
    def _save_json(self, path, data):
        try:
            with open(path, 'w', encoding='utf-8') as f: json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except: return False
    
    def save_settings(self, **kwargs):
        self.settings.update(kwargs)
        return self._save_json(self.settings_file, self.settings)
    
    def add_recent(self, path, name):
        self.recent_projects = [p for p in self.recent_projects if p['path'] != path]
        self.recent_projects.insert(0, {'path': path, 'name': name, 'date': datetime.now().isoformat()})
        self.recent_projects = self.recent_projects[:10]
        return self._save_json(self.recent_file, self.recent_projects)
    
    def save_session(self, **kwargs):
        if kwargs:
            self.session.update(kwargs)
        return self._save_json(self.session_file, self.session)

config = Config()

def get_default_translations(lc):
    if lc == 'ru':
        return {"app":{"name":"Simple IDE","description":"Легкая среда разработки"},"welcome":{"create_project":"Создать проект","open_project":"Открыть проект","init_project":"Инициализировать проект","recent_projects":"Последние проекты","no_recent":"Нет недавних проектов","settings":"Настройки","create_project_desc":"Создать новую папку с проектом","open_project_desc":"Открыть существующий проект (project.json)","init_project_desc":"Создать project.json в существующей папке","settings_desc":"Настроить IDE"},"settings":{"language":"Язык интерфейса:","save":"Сохранить","cancel":"Отмена","language_tab":"Язык","language_title":"Язык интерфейса","appearance_tab":"Визуализация","appearance_title":"Визуализация","background_tab":"Обои","background_title":"Обои","theme":"Тема редактора:","font_size":"Размер шрифта:","choose_bg":"Выберите изображение для фона:","reset_bg":"Сбросить фон"},"errors":{"error":"Ошибка"}}
    return {"app":{"name":"Simple IDE","description":"Lightweight Development Environment"},"welcome":{"create_project":"Create Project","open_project":"Open Project","init_project":"Initialize Project","recent_projects":"Recent Projects","no_recent":"No recent projects","settings":"Settings","create_project_desc":"Create a new folder with project","open_project_desc":"Open existing project (project.json)","init_project_desc":"Create project.json in existing folder","settings_desc":"Configure IDE"},"settings":{"language":"Interface language:","save":"Save","cancel":"Cancel","language_tab":"Language","language_title":"Interface Language","appearance_tab":"Appearance","appearance_title":"Appearance","background_tab":"Background","background_title":"Background","theme":"Editor theme:","font_size":"Font size:","choose_bg":"Choose background image:","reset_bg":"Reset background"},"errors":{"error":"Error"}}

def load_language(lc='ru'):
    try:
        lf = os.path.join(LANGUAGES_DIR, f'{lc}.json')
        if os.path.exists(lf):
            with open(lf, 'r', encoding='utf-8') as f: return json.load(f)
        return get_default_translations(lc)
    except: return get_default_translations(lc)

eel.init('src/ui/web')

class ProjectManager:
    def __init__(self): self.current_project_path = None; self.config_data = None
    def create(self, pp, pn):
        try:
            pd = os.path.join(pp, pn); os.makedirs(pd, exist_ok=True)
            cfg = {"projectName": pn, "version": "1.0.0", "createdAt": datetime.now().isoformat(), "startFile": None, "preLaunchCommand": "", "files": []}
            with open(os.path.join(pd, "project.json"), 'w', encoding='utf-8') as f: json.dump(cfg, f, indent=2, ensure_ascii=False)
            self.current_project_path = pd; self.config_data = cfg
            os.makedirs(os.path.join(pd, "src"), exist_ok=True)
            with open(os.path.join(pd, "README.md"), 'w', encoding='utf-8') as f: f.write(f"# {pn}\n\nCreated in Simple IDE")
            config.add_recent(pd, pn); config.save_session(last_project=pd)
            return {"success": True, "projectPath": pd}
        except Exception as e: return {"success": False, "error": str(e)}
    def init_folder(self, fp):
        try:
            cp = os.path.join(fp, "project.json")
            if os.path.exists(cp):
                with open(cp, 'r', encoding='utf-8') as f: self.config_data = json.load(f)
                self.current_project_path = fp
                config.add_recent(fp, self.config_data.get('projectName', os.path.basename(fp)))
                config.save_session(last_project=fp)
                return {"success": True, "projectPath": fp, "config": self.config_data}
            pn = os.path.basename(fp); files = []
            for root, dirs, filenames in os.walk(fp):
                for fn in filenames:
                    if not fn.startswith('.'): files.append(os.path.relpath(os.path.join(root, fn), fp).replace('\\', '/'))
            cfg = {"projectName": pn, "version": "1.0.0", "createdAt": datetime.now().isoformat(), "startFile": None, "preLaunchCommand": "", "files": files}
            with open(cp, 'w', encoding='utf-8') as f: json.dump(cfg, f, indent=2, ensure_ascii=False)
            self.current_project_path = fp; self.config_data = cfg
            config.add_recent(fp, pn); config.save_session(last_project=fp)
            return {"success": True, "projectPath": fp, "config": cfg}
        except Exception as e: return {"success": False, "error": str(e)}
    def open(self, pp=None):
        try:
            if pp is None:
                import tkinter as tk; from tkinter import filedialog
                root = tk.Tk(); root.withdraw(); root.attributes('-topmost', True)
                pp = filedialog.askdirectory(title="Select project folder"); root.destroy()
                if not pp: return {"success": False, "error": "Folder not selected"}
            cp = os.path.join(pp, "project.json")
            if not os.path.exists(cp): return {"success": False, "error": "project.json not found"}
            with open(cp, 'r', encoding='utf-8') as f: self.config_data = json.load(f)
            self.current_project_path = pp
            config.add_recent(pp, self.config_data.get('projectName', os.path.basename(pp)))
            config.save_session(last_project=pp)
            return {"success": True, "projectPath": pp, "config": self.config_data}
        except Exception as e: return {"success": False, "error": str(e)}
    def get_config(self): return self.config_data
    def save_config(self, c):
        try:
            if self.current_project_path:
                with open(os.path.join(self.current_project_path, "project.json"), 'w', encoding='utf-8') as f: json.dump(c, f, indent=2, ensure_ascii=False)
                self.config_data = c; return {"success": True}
            return {"success": False}
        except Exception as e: return {"success": False, "error": str(e)}

class FileManager:
    def __init__(self): self.project_root = None
    def set_root(self, p): self.project_root = Path(p).resolve()
    def _safe(self, rp):
        if not self.project_root: raise ValueError("No project root")
        if not rp: return self.project_root
        fp = (self.project_root / rp).resolve()
        if not str(fp).startswith(str(self.project_root)): raise ValueError("Access denied")
        return fp
    def tree(self):
        if not self.project_root: return []
        def scan(p, rel=""):
            items = []
            try:
                for e in sorted(os.scandir(p), key=lambda x: (not x.is_dir(), x.name.lower())):
                    if e.name == 'project.json' or (e.name.startswith('.') and e.name != '.gitignore'): continue
                    ip = os.path.join(rel, e.name).replace('\\', '/')
                    if e.is_dir(): items.append({"name": e.name, "path": ip, "type": "directory", "children": scan(e.path, ip)})
                    else: items.append({"name": e.name, "path": ip, "type": "file", "extension": os.path.splitext(e.name)[1]})
            except PermissionError: pass
            return items
        return scan(self.project_root)
    def create(self, pp, inn, it):
        try:
            fp = self._safe(os.path.join(pp, inn)) if pp else self.project_root / inn
            if it == 'directory': fp.mkdir(parents=True, exist_ok=True)
            else: fp.parent.mkdir(parents=True, exist_ok=True); fp.touch()
            return {"success": True}
        except Exception as e: return {"success": False, "error": str(e)}
    def delete(self, rp):
        try:
            fp = self._safe(rp)
            if fp.is_dir(): shutil.rmtree(fp)
            else: fp.unlink()
            return {"success": True}
        except Exception as e: return {"success": False, "error": str(e)}
    def rename(self, op, nn):
        try: self._safe(op).rename(self._safe(op).parent / nn); return {"success": True}
        except Exception as e: return {"success": False, "error": str(e)}
    def move(self, sp, tp):
        try: shutil.move(str(self._safe(sp)), str(self._safe(tp))); return {"success": True}
        except Exception as e: return {"success": False, "error": str(e)}
    def read(self, rp):
        try:
            fp = self._safe(rp)
            if fp.stat().st_size > 10*1024*1024: return {"success": False, "error": "File too large"}
            for enc in ['utf-8', 'cp1251', 'latin-1']:
                try:
                    with open(fp, 'r', encoding=enc) as f: return {"success": True, "content": f.read()}
                except: continue
            return {"success": False, "error": "Cannot read file"}
        except Exception as e: return {"success": False, "error": str(e)}
    def save(self, rp, c):
        try:
            fp = self._safe(rp); fp.parent.mkdir(parents=True, exist_ok=True)
            with open(fp, 'w', encoding='utf-8') as f: f.write(c)
            return {"success": True}
        except Exception as e: return {"success": False, "error": str(e)}

class Executor:
    def __init__(self): self.buf = []; self.proc = None; self.root = None
    def set_root(self, p): self.root = Path(p).resolve()
    def run(self, fp, pre=""):
        if self.proc and self.proc.poll() is None: return {"success": False, "error": "Already running"}
        self.buf = []
        def _run():
            try:
                if pre:
                    self.buf.append(f"> {pre}")
                    p = subprocess.run(pre, shell=True, cwd=str(self.root), capture_output=True, text=True)
                    if p.stdout: self.buf.append(p.stdout)
                    if p.stderr: self.buf.append(p.stderr)
                ffp = self.root / fp; ext = os.path.splitext(fp)[1].lower()
                cmd = f'python "{ffp}"' if ext == '.py' else f'node "{ffp}"' if ext == '.js' else None
                if not cmd: self.buf.append(f"Unsupported: {ext}"); return
                self.buf.append(f"> {cmd}")
                self.proc = subprocess.Popen(cmd, shell=True, cwd=str(self.root), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='ignore')
                for line in self.proc.stdout: self.buf.append(line.rstrip())
                err = self.proc.stderr.read()
                if err: self.buf.extend(err.split('\n'))
                self.proc.wait()
                self.buf.append(f"\nExit code: {self.proc.returncode}")
            except Exception as e: self.buf.append(f"Error: {str(e)}")
        threading.Thread(target=_run, daemon=True).start(); return {"success": True}
    def output(self): return '\n'.join(self.buf[-100:])
    def stop(self):
        if self.proc and self.proc.poll() is None: self.proc.terminate(); return {"success": True}
        return {"success": False}
    def cmd(self, cmd):
        try:
            if not self.root: return {"output": "", "error": "No project"}
            r = subprocess.run(cmd, shell=True, cwd=str(self.root), capture_output=True, text=True, timeout=30)
            return {"output": r.stdout + r.stderr, "error": None}
        except subprocess.TimeoutExpired: return {"output": "", "error": "Timeout (30s)"}
        except Exception as e: return {"output": "", "error": str(e)}

pm = ProjectManager(); fm = FileManager(); ex = Executor()

def cleanup():
    if ex.proc and ex.proc.poll() is None: ex.proc.terminate()
atexit.register(cleanup)

# ===== API =====
@eel.expose
def get_language(lc='ru'): return load_language(lc)
@eel.expose
def get_settings(): return config.settings
@eel.expose
def save_settings(**kwargs): return config.save_settings(**kwargs)
@eel.expose
def get_recent_projects(): return config.recent_projects
@eel.expose
def get_session(): return config.session
@eel.expose
def save_session(session_data=None):
    if session_data: return config.save_session(**session_data)
    return config.save_session()
@eel.expose
def create_new_project():
    import tkinter as tk; from tkinter import filedialog, simpledialog
    root = tk.Tk(); root.withdraw(); root.attributes('-topmost', True)
    pf = filedialog.askdirectory(title="Select parent folder")
    if not pf: root.destroy(); return {"success": False, "error": "No folder"}
    pn = simpledialog.askstring("New Project", "Project name:", parent=root); root.destroy()
    if not pn: return {"success": False, "error": "No name"}
    r = pm.create(pf, pn)
    if r.get('success'): fm.set_root(r['projectPath']); ex.set_root(r['projectPath'])
    return r
@eel.expose
def open_project(pp=None):
    r = pm.open(pp)
    if r.get('success'): fm.set_root(r['projectPath']); ex.set_root(r['projectPath'])
    return r
@eel.expose
def create_project_in_existing_folder():
    import tkinter as tk; from tkinter import filedialog
    root = tk.Tk(); root.withdraw(); root.attributes('-topmost', True)
    fp = filedialog.askdirectory(title="Select folder"); root.destroy()
    if not fp: return {"success": False, "error": "No folder"}
    r = pm.init_folder(fp)
    if r.get('success'): fm.set_root(r['projectPath']); ex.set_root(r['projectPath'])
    return r
@eel.expose
def get_file_tree(): return fm.tree()
@eel.expose
def create_item(pp, inn, it): return fm.create(pp, inn, it)
@eel.expose
def delete_item(p): return fm.delete(p)
@eel.expose
def rename_item(op, nn): return fm.rename(op, nn)
@eel.expose
def move_item(sp, tp): return fm.move(sp, tp)
@eel.expose
def read_file(fp): return fm.read(fp)
@eel.expose
def save_file(fp, c): return fm.save(fp, c)
@eel.expose
def run_code(fp, pre=""): return ex.run(fp, pre)
@eel.expose
def get_output(): return ex.output()
@eel.expose
def stop_execution(): return ex.stop()
@eel.expose
def get_project_config(): return pm.get_config()
@eel.expose
def save_project_config(c): return pm.save_config(c)
@eel.expose
def execute_command(cmd): return ex.cmd(cmd)

if __name__ == '__main__':
    config._save_json(config.settings_file, config.settings)
    config._save_json(config.recent_file, config.recent_projects)
    config._save_json(config.session_file, config.session)
    print(f"Config saved to: {CONFIG_DIR}")
    
    try: eel.start('load.html', size=(600, 500), mode='chrome', port=0, cmdline_args=['--no-proxy-server'])
    except:
        try: eel.start('load.html', size=(600, 500), mode='edge', port=0)
        except: eel.start('load.html', size=(600, 500), mode='default', port=8000)