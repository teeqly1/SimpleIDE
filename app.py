import sys, os, json, shutil, subprocess, threading, atexit
from datetime import datetime
from pathlib import Path

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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RECENT_PROJECTS_FILE = os.path.join(BASE_DIR, 'recent_projects.json')
LANGUAGES_DIR = os.path.join(BASE_DIR, 'others', 'languages')

def load_recent_projects():
    try:
        if os.path.exists(RECENT_PROJECTS_FILE):
            with open(RECENT_PROJECTS_FILE, 'r', encoding='utf-8') as f: return json.load(f)
    except: pass
    return []

def save_recent_projects(projects):
    try:
        with open(RECENT_PROJECTS_FILE, 'w', encoding='utf-8') as f: json.dump(projects, f, ensure_ascii=False, indent=2)
    except: pass

def add_to_recent(pp, pn):
    r = load_recent_projects(); r = [p for p in r if p['path'] != pp]
    r.insert(0, {'path': pp, 'name': pn, 'date': datetime.now().isoformat()}); save_recent_projects(r[:10])

def get_default_translations(lc):
    if lc == 'ru':
        return {"app":{"name":"Simple IDE","description":"Легкая среда разработки"},"welcome":{"create_project":"Создать проект","open_project":"Открыть проект","init_project":"Инициализировать проект","recent_projects":"Последние проекты","no_recent":"Нет недавних проектов","settings":"Настройки","create_project_desc":"Создать новую папку с проектом","open_project_desc":"Открыть существующий проект (project.json)","init_project_desc":"Создать project.json в существующей папке","settings_desc":"Настроить IDE"},"settings":{"language":"Язык интерфейса:","save":"Сохранить","cancel":"Отмена","language_tab":"Язык"},"errors":{"error":"Ошибка"}}
    return {"app":{"name":"Simple IDE","description":"Lightweight Development Environment"},"welcome":{"create_project":"Create Project","open_project":"Open Project","init_project":"Initialize Project","recent_projects":"Recent Projects","no_recent":"No recent projects","settings":"Settings","create_project_desc":"Create a new folder with project","open_project_desc":"Open existing project (project.json)","init_project_desc":"Create project.json in existing folder","settings_desc":"Configure IDE"},"settings":{"language":"Interface language:","save":"Save","cancel":"Cancel","language_tab":"Language"},"errors":{"error":"Error"}}

def load_language(lc='ru'):
    try:
        lf = os.path.join(LANGUAGES_DIR, f'{lc}.json')
        if os.path.exists(lf):
            with open(lf, 'r', encoding='utf-8') as f: return json.load(f)
        return get_default_translations(lc)
    except Exception as e: print(f"Ошибка загрузки языка: {e}"); return get_default_translations(lc)

eel.init('src/ui/web')

class ProjectManager:
    def __init__(self): self.current_project_path = None; self.config = None
    def create_project(self, pp, pn):
        try:
            pd = os.path.join(pp, pn); os.makedirs(pd, exist_ok=True)
            config = {"projectName": pn, "version": "1.0.0", "createdAt": datetime.now().isoformat(), "startFile": None, "preLaunchCommand": "", "files": []}
            with open(os.path.join(pd, "project.json"), 'w', encoding='utf-8') as f: json.dump(config, f, indent=2, ensure_ascii=False)
            self.current_project_path = pd; self.config = config
            os.makedirs(os.path.join(pd, "src"), exist_ok=True)
            with open(os.path.join(pd, "README.md"), 'w', encoding='utf-8') as f: f.write(f"# {pn}\n\nПроект создан в Simple IDE")
            add_to_recent(pd, pn); return {"success": True, "projectPath": pd}
        except Exception as e: return {"success": False, "error": str(e)}
    def initialize_project_in_folder(self, fp):
        try:
            cp = os.path.join(fp, "project.json")
            if os.path.exists(cp):
                with open(cp, 'r', encoding='utf-8') as f: self.config = json.load(f)
                self.current_project_path = fp; add_to_recent(fp, self.config.get('projectName', os.path.basename(fp)))
                return {"success": True, "projectPath": fp, "config": self.config}
            pn = os.path.basename(fp); files = []
            for root, dirs, filenames in os.walk(fp):
                for fn in filenames:
                    if not fn.startswith('.'): files.append(os.path.relpath(os.path.join(root, fn), fp).replace('\\', '/'))
            config = {"projectName": pn, "version": "1.0.0", "createdAt": datetime.now().isoformat(), "startFile": None, "preLaunchCommand": "", "files": files}
            with open(cp, 'w', encoding='utf-8') as f: json.dump(config, f, indent=2, ensure_ascii=False)
            self.current_project_path = fp; self.config = config; add_to_recent(fp, pn)
            return {"success": True, "projectPath": fp, "config": config}
        except Exception as e: return {"success": False, "error": str(e)}
    def open_project(self, pp=None):
        try:
            if pp is None:
                import tkinter as tk; from tkinter import filedialog
                root = tk.Tk(); root.withdraw(); root.attributes('-topmost', True)
                pp = filedialog.askdirectory(title="Выберите папку проекта"); root.destroy()
                if not pp: return {"success": False, "error": "Папка не выбрана"}
            cp = os.path.join(pp, "project.json")
            if not os.path.exists(cp): return {"success": False, "error": "project.json не найден"}
            with open(cp, 'r', encoding='utf-8') as f: self.config = json.load(f)
            self.current_project_path = pp; add_to_recent(pp, self.config.get('projectName', os.path.basename(pp)))
            return {"success": True, "projectPath": pp, "config": self.config}
        except Exception as e: return {"success": False, "error": str(e)}
    def get_config(self): return self.config
    def save_config(self, c):
        try:
            if self.current_project_path:
                with open(os.path.join(self.current_project_path, "project.json"), 'w', encoding='utf-8') as f: json.dump(c, f, indent=2, ensure_ascii=False)
                self.config = c; return {"success": True}
            return {"success": False}
        except Exception as e: return {"success": False, "error": str(e)}

class FileManager:
    def __init__(self): self.project_root = None
    def set_project_root(self, p): self.project_root = Path(p).resolve()
    def _safe_path(self, rp):
        if not self.project_root: raise ValueError("Корневая папка не установлена")
        if not rp: return self.project_root
        fp = (self.project_root / rp).resolve()
        if not str(fp).startswith(str(self.project_root)): raise ValueError("Выход за пределы проекта")
        return fp
    def get_file_tree(self):
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
    def create_item(self, pp, iname, itype):
        try:
            fp = self._safe_path(os.path.join(pp, iname)) if pp else self.project_root / iname
            if itype == 'directory': fp.mkdir(parents=True, exist_ok=True)
            else: fp.parent.mkdir(parents=True, exist_ok=True); fp.touch()
            return {"success": True}
        except Exception as e: return {"success": False, "error": str(e)}
    def delete_item(self, rp):
        try:
            fp = self._safe_path(rp)
            if fp.is_dir(): shutil.rmtree(fp)
            else: fp.unlink()
            return {"success": True}
        except Exception as e: return {"success": False, "error": str(e)}
    def rename_item(self, op, nn):
        try: self._safe_path(op).rename(self._safe_path(op).parent / nn); return {"success": True}
        except Exception as e: return {"success": False, "error": str(e)}
    def move_item(self, sp, tp):
        try: shutil.move(str(self._safe_path(sp)), str(self._safe_path(tp))); return {"success": True}
        except Exception as e: return {"success": False, "error": str(e)}
    def read_file(self, rp):
        try:
            fp = self._safe_path(rp)
            if fp.stat().st_size > 10*1024*1024: return {"success": False, "error": "Файл слишком большой"}
            for enc in ['utf-8', 'cp1251', 'latin-1']:
                try:
                    with open(fp, 'r', encoding=enc) as f: return {"success": True, "content": f.read()}
                except: continue
            return {"success": False, "error": "Не удалось прочитать"}
        except Exception as e: return {"success": False, "error": str(e)}
    def save_file(self, rp, c):
        try:
            fp = self._safe_path(rp); fp.parent.mkdir(parents=True, exist_ok=True)
            with open(fp, 'w', encoding='utf-8') as f: f.write(c)
            return {"success": True}
        except Exception as e: return {"success": False, "error": str(e)}

class Executor:
    def __init__(self): self.output_buffer = []; self.current_process = None; self.project_root = None
    def set_project_root(self, p): self.project_root = Path(p).resolve()
    def run_code(self, fp, pre=""):
        if self.current_process and self.current_process.poll() is None: return {"success": False, "error": "Процесс уже выполняется"}
        self.output_buffer = []
        def run():
            try:
                if pre:
                    self.output_buffer.append(f"> {pre}")
                    p = subprocess.run(pre, shell=True, cwd=str(self.project_root), capture_output=True, text=True)
                    if p.stdout: self.output_buffer.append(p.stdout)
                    if p.stderr: self.output_buffer.append(p.stderr)
                ffp = self.project_root / fp; ext = os.path.splitext(fp)[1].lower()
                cmd = f'python "{ffp}"' if ext == '.py' else f'node "{ffp}"' if ext == '.js' else None
                if not cmd: self.output_buffer.append(f"Тип не поддерживается: {ext}"); return
                self.output_buffer.append(f"> {cmd}")
                self.current_process = subprocess.Popen(cmd, shell=True, cwd=str(self.project_root), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='ignore')
                for line in self.current_process.stdout: self.output_buffer.append(line.rstrip())
                err = self.current_process.stderr.read()
                if err: self.output_buffer.extend(err.split('\n'))
                self.current_process.wait()
                self.output_buffer.append(f"\nПроцесс завершен с кодом: {self.current_process.returncode}")
            except Exception as e: self.output_buffer.append(f"Ошибка: {str(e)}")
        threading.Thread(target=run, daemon=True).start(); return {"success": True}
    def get_output(self): return '\n'.join(self.output_buffer[-100:])
    def stop_execution(self):
        if self.current_process and self.current_process.poll() is None: self.current_process.terminate(); return {"success": True}
        return {"success": False, "error": "Нет процесса"}
    def execute_command(self, cmd):
        try:
            if not self.project_root: return {"output": "", "error": "Проект не открыт"}
            r = subprocess.run(cmd, shell=True, cwd=str(self.project_root), capture_output=True, text=True, timeout=30)
            return {"output": r.stdout + r.stderr, "error": None}
        except subprocess.TimeoutExpired: return {"output": "", "error": "Превышено время (30с)"}
        except Exception as e: return {"output": "", "error": str(e)}

pm = ProjectManager(); fm = FileManager(); ex = Executor()

def cleanup():
    if ex.current_process and ex.current_process.poll() is None: ex.current_process.terminate()
atexit.register(cleanup)

@eel.expose
def get_language(lc='ru'): return load_language(lc)
@eel.expose
def create_new_project():
    import tkinter as tk; from tkinter import filedialog, simpledialog
    root = tk.Tk(); root.withdraw(); root.attributes('-topmost', True)
    pf = filedialog.askdirectory(title="Выберите папку для нового проекта")
    if not pf: root.destroy(); return {"success": False, "error": "Папка не выбрана"}
    pn = simpledialog.askstring("Новый проект", "Введите название:", parent=root); root.destroy()
    if not pn: return {"success": False, "error": "Имя не указано"}
    r = pm.create_project(pf, pn)
    if r.get('success'): fm.set_project_root(r['projectPath']); ex.set_project_root(r['projectPath'])
    return r
@eel.expose
def open_project(pp=None):
    r = pm.open_project(pp)
    if r.get('success'): fm.set_project_root(r['projectPath']); ex.set_project_root(r['projectPath'])
    return r
@eel.expose
def create_project_in_existing_folder():
    import tkinter as tk; from tkinter import filedialog
    root = tk.Tk(); root.withdraw(); root.attributes('-topmost', True)
    fp = filedialog.askdirectory(title="Выберите существующую папку"); root.destroy()
    if not fp: return {"success": False, "error": "Папка не выбрана"}
    r = pm.initialize_project_in_folder(fp)
    if r.get('success'): fm.set_project_root(r['projectPath']); ex.set_project_root(r['projectPath'])
    return r
@eel.expose
def get_recent_projects(): return load_recent_projects()
@eel.expose
def get_file_tree(): return fm.get_file_tree()
@eel.expose
def create_item(pp, inn, it): return fm.create_item(pp, inn, it)
@eel.expose
def delete_item(p): return fm.delete_item(p)
@eel.expose
def rename_item(op, nn): return fm.rename_item(op, nn)
@eel.expose
def move_item(sp, tp): return fm.move_item(sp, tp)
@eel.expose
def read_file(fp): return fm.read_file(fp)
@eel.expose
def save_file(fp, c): return fm.save_file(fp, c)
@eel.expose
def run_code(fp, pre=""): return ex.run_code(fp, pre)
@eel.expose
def get_output(): return ex.get_output()
@eel.expose
def stop_execution(): return ex.stop_execution()
@eel.expose
def get_project_config(): return pm.get_config()
@eel.expose
def save_project_config(c): return pm.save_config(c)
@eel.expose
def execute_command(cmd): return ex.execute_command(cmd)

if __name__ == '__main__':
    try: eel.start('load.html', size=(600, 500), mode='chrome', port=0)
    except:
        try: eel.start('load.html', size=(600, 500), mode='edge', port=0)
        except: eel.start('load.html', size=(600, 500), mode='default', port=8000)