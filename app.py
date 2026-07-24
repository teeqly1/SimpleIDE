import sys
import os
import json
import shutil
import subprocess
import threading
import atexit
import http.server
import socketserver
import shlex
from datetime import datetime
from pathlib import Path

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
import send2trash

BASE_DIR = Path(__file__).resolve().parent
CONFIG_DIR = Path.home() / '.simple_ide'
LANGUAGES_DIR = BASE_DIR / 'others' / 'languages'

CONFIG_DIR.mkdir(parents=True, exist_ok=True)

localhost_server = None

SAFE_COMMANDS = {
    'python': ['python'],
    'pip': ['pip', 'install', 'list', 'freeze', 'show'],
    'node': ['node'],
    'npm': ['npm', 'install', 'run', 'test'],
    'git': ['git', 'status', 'add', 'commit', 'push', 'pull', 'log', 'diff'],
    'dir': ['dir'],
    'ls': ['ls', '-la', '-l'],
    'echo': ['echo'],
    'pwd': ['pwd', 'cd'],
}

class Config:
    def __init__(self):
        self.settings_file = CONFIG_DIR / 'settings.json'
        self.recent_file = CONFIG_DIR / 'recent_projects.json'
        self.session_file = CONFIG_DIR / 'session.json'
        
        self.settings = self._load(self.settings_file, {"language":"ru","theme":"monokai","font_size":14,"bg_image":None,"learn":True,"localhost_port":1313})
        self.recent_projects = self._load(self.recent_file, [])
        self.session = self._load(self.session_file, {"last_project":None,"open_tabs":[],"active_tab":None})
    
    def _load(self, path, default):
        try:
            if path.exists(): return json.loads(path.read_text(encoding='utf-8'))
        except: pass
        return default
    
    def _save(self, path, data):
        try:
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
            return True
        except: return False
    
    def save_settings(self, **kwargs):
        self.settings.update(kwargs)
        return self._save(self.settings_file, self.settings)
    
    def add_recent(self, path, name):
        self.recent_projects = [p for p in self.recent_projects if p['path'] != path]
        self.recent_projects.insert(0, {'path': path, 'name': name, 'date': datetime.now().isoformat()})
        self.recent_projects = self.recent_projects[:10]
        return self._save(self.recent_file, self.recent_projects)
    
    def save_session(self, **kwargs):
        if kwargs: self.session.update(kwargs)
        return self._save(self.session_file, self.session)

config = Config()

def get_default_translations(lc):
    if lc == 'ru':
        return {"app":{"name":"Simple IDE","description":"Легкая среда разработки"},"welcome":{"create_project":"Создать проект","open_project":"Открыть проект","init_project":"Инициализировать проект","recent_projects":"Последние проекты","no_recent":"Нет недавних проектов","settings":"Настройки","create_project_desc":"Создать новую папку с проектом","open_project_desc":"Открыть существующий проект (project.json)","init_project_desc":"Создать project.json в существующей папке","settings_desc":"Настроить IDE"},"settings":{"language":"Язык интерфейса:","save":"Сохранить","cancel":"Отмена"},"errors":{"error":"Ошибка"}}
    return {"app":{"name":"Simple IDE","description":"Lightweight Development Environment"},"welcome":{"create_project":"Create Project","open_project":"Open Project","init_project":"Initialize Project","recent_projects":"Recent Projects","no_recent":"No recent projects","settings":"Settings","create_project_desc":"Create a new folder with project","open_project_desc":"Open existing project (project.json)","init_project_desc":"Create project.json in existing folder","settings_desc":"Configure IDE"},"settings":{"language":"Interface language:","save":"Save","cancel":"Cancel"},"errors":{"error":"Error"}}

def load_language(lc='ru'):
    try:
        lf = LANGUAGES_DIR / f'{lc}.json'
        if lf.exists(): return json.loads(lf.read_text(encoding='utf-8'))
        return get_default_translations(lc)
    except: return get_default_translations(lc)

eel.init(str(BASE_DIR / 'src' / 'ui' / 'web'))

class ProjectManager:
    def __init__(self): self.current_project_path = None; self.config_data = None
    
    def create(self, pp, pn):
        try:
            pd = Path(pp) / pn; pd.mkdir(parents=True, exist_ok=True)
            cfg = {"projectName":pn,"version":"1.0.0","createdAt":datetime.now().isoformat(),"startFile":None,"preLaunchCommand":"","files":[]}
            (pd / "project.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding='utf-8')
            self.current_project_path = str(pd); self.config_data = cfg
            (pd / "src").mkdir(exist_ok=True)
            (pd / "README.md").write_text(f"# {pn}\n\nCreated in Simple IDE", encoding='utf-8')
            config.add_recent(str(pd), pn); config.save_session(last_project=str(pd))
            return {"success":True,"projectPath":str(pd)}
        except Exception as e: return {"success":False,"error":str(e)}
    
    def init_folder(self, fp):
        try:
            fp = Path(fp); cp = fp / "project.json"
            if cp.exists():
                self.config_data = json.loads(cp.read_text(encoding='utf-8'))
                self.current_project_path = str(fp)
                config.add_recent(str(fp), self.config_data.get('projectName', fp.name))
                config.save_session(last_project=str(fp))
                return {"success":True,"projectPath":str(fp),"config":self.config_data}
            pn = fp.name; files = []
            SYSTEM_FILES = {'.DS_Store','thumbs.db','desktop.ini','.git','.svn'}
            for root, dirs, filenames in os.walk(fp):
                dirs[:] = [d for d in dirs if d not in SYSTEM_FILES and not d.startswith('.')]
                for fn in filenames:
                    if fn not in SYSTEM_FILES and not fn.startswith('.'):
                        files.append(str(Path(root, fn).relative_to(fp)).replace('\\', '/'))
            cfg = {"projectName":pn,"version":"1.0.0","createdAt":datetime.now().isoformat(),"startFile":None,"preLaunchCommand":"","files":files}
            cp.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding='utf-8')
            self.current_project_path = str(fp); self.config_data = cfg
            config.add_recent(str(fp), pn); config.save_session(last_project=str(fp))
            return {"success":True,"projectPath":str(fp),"config":cfg}
        except Exception as e: return {"success":False,"error":str(e)}
    
    def open(self, pp=None):
        try:
            if pp is None:
                import tkinter as tk; from tkinter import filedialog
                root = tk.Tk(); root.withdraw(); root.attributes('-topmost', True)
                pp = filedialog.askdirectory(title="Select project folder"); root.destroy()
                if not pp: return {"success":False,"error":"Folder not selected"}
            pp = Path(pp); cp = pp / "project.json"
            if not cp.exists(): return {"success":False,"error":"project.json not found"}
            self.config_data = json.loads(cp.read_text(encoding='utf-8'))
            self.current_project_path = str(pp)
            config.add_recent(str(pp), self.config_data.get('projectName', pp.name))
            config.save_session(last_project=str(pp))
            return {"success":True,"projectPath":str(pp),"config":self.config_data}
        except Exception as e: return {"success":False,"error":str(e)}
    
    def get_config(self): return self.config_data
    def save_config(self, c):
        try:
            if self.current_project_path:
                (Path(self.current_project_path) / "project.json").write_text(json.dumps(c, indent=2, ensure_ascii=False), encoding='utf-8')
                self.config_data = c; return {"success":True}
            return {"success":False}
        except Exception as e: return {"success":False,"error":str(e)}

class FileManager:
    def __init__(self): self.project_root = None
    def set_root(self, p):
        root = Path(p).resolve()
        if not root.exists(): raise ValueError("Project root does not exist")
        self.project_root = root
    
    def _safe(self, rp):
        if self.project_root is None: raise ValueError("No project root set")
        if not rp: return self.project_root
        rp = str(rp).replace('%2e','.').replace('%2f','/').replace('%5c','\\')
        if '..' in rp: raise ValueError("Path traversal blocked")
        if any(c in rp for c in ['\x00','\n','\r']): raise ValueError("Invalid characters")
        fp = (self.project_root / rp).resolve()
        root = self.project_root.resolve()
        if not str(fp).startswith(str(root) + os.sep) and str(fp) != str(root):
            raise ValueError(f"Access denied: {fp}")
        return fp
    
    def tree(self):
        if not self.project_root: return []
        def scan(p, rel=""):
            items = []
            try:
                for e in sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
                    if e.name == 'project.json' or (e.name.startswith('.') and e.name != '.gitignore'): continue
                    ip = str(Path(rel) / e.name).replace('\\', '/')
                    if e.is_dir(): items.append({"name":e.name,"path":ip,"type":"directory","children":scan(e, ip)})
                    else: items.append({"name":e.name,"path":ip,"type":"file","extension":e.suffix})
            except PermissionError: pass
            return items
        return scan(self.project_root)
    
    def create(self, pp, inn, it):
        try:
            fp = self._safe(str(Path(pp) / inn)) if pp else self.project_root / inn
            if it == 'directory': fp.mkdir(parents=True, exist_ok=True)
            else: fp.parent.mkdir(parents=True, exist_ok=True); fp.touch()
            return {"success":True}
        except Exception as e: return {"success":False,"error":str(e)}
    
    def delete(self, rp):
        try:
            fp = self._safe(rp)
            if not str(fp).startswith(str(self.project_root)): return {"success":False,"error":"Access denied"}
            send2trash.send2trash(str(fp))
            return {"success":True}
        except Exception as e: return {"success":False,"error":str(e)}
    
    def rename(self, op, nn):
        try:
            if not nn or nn.strip() == '': return {"success":False,"error":"Empty name"}
            if any(c in nn for c in ['..','/','\\',':','*','?','"','<','>','|']): return {"success":False,"error":"Invalid name"}
            if len(nn) > 255: return {"success":False,"error":"Name too long"}
            old = self._safe(op); new = old.parent / nn
            if new.exists(): return {"success":False,"error":"File exists"}
            old.rename(new)
            return {"success":True}
        except Exception as e: return {"success":False,"error":str(e)}
    
    def move(self, sp, tp):
        try:
            src = self._safe(sp); dst = self._safe(tp)
            if not str(src).startswith(str(self.project_root)): return {"success":False,"error":"Access denied"}
            shutil.move(str(src), str(dst))
            return {"success":True}
        except Exception as e: return {"success":False,"error":str(e)}
    
    def read(self, rp):
        try:
            fp = self._safe(rp)
            if fp.stat().st_size > 10*1024*1024: return {"success":False,"error":"File too large"}
            for enc in ['utf-8','cp1251','latin-1']:
                try: return {"success":True,"content":fp.read_text(encoding=enc)}
                except: continue
            return {"success":False,"error":"Cannot read file"}
        except Exception as e: return {"success":False,"error":str(e)}
    
    def save(self, rp, c):
        try:
            fp = self._safe(rp); fp.parent.mkdir(parents=True, exist_ok=True)
            fp.write_text(c, encoding='utf-8')
            return {"success":True}
        except Exception as e: return {"success":False,"error":str(e)}

class Executor:
    def __init__(self): self.buf = []; self.proc = None; self.root = None
    def set_root(self, p):
        root = Path(p).resolve()
        if not root.exists(): raise ValueError("Project root does not exist")
        self.root = root
    
    def run(self, fp, pre=""):
        if self.proc and self.proc.poll() is None: return {"success":False,"error":"Already running"}
        self.buf = []
        def _run():
            try:
                if pre:
                    self.buf.append(f"> {pre}")
                    p = subprocess.run(pre.split(), cwd=str(self.root), capture_output=True, text=True)
                    if p.stdout: self.buf.append(p.stdout)
                    if p.stderr: self.buf.append(p.stderr)
                target = self.root / fp
                if not target.exists(): self.buf.append(f"File not found: {fp}"); return
                ext = target.suffix.lower()
                if ext == '.py': cmd = ['python', str(target)]
                elif ext == '.js': cmd = ['node', str(target)]
                else: self.buf.append(f"Unsupported: {ext}"); return
                self.buf.append(f"> {' '.join(cmd)}")
                self.proc = subprocess.Popen(cmd, cwd=str(self.root), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='ignore')
                for line in self.proc.stdout: self.buf.append(line.rstrip())
                err = self.proc.stderr.read()
                if err: self.buf.extend(err.split('\n'))
                self.proc.wait()
                self.buf.append(f"\nExit code: {self.proc.returncode}")
            except Exception as e: self.buf.append(f"Error: {str(e)}")
        threading.Thread(target=_run, daemon=True).start()
        return {"success":True}
    
    def output(self): return '\n'.join(self.buf[-100:])
    def stop(self):
        if self.proc and self.proc.poll() is None: self.proc.terminate(); return {"success":True}
        return {"success":False}
    
    def cmd(self, cmd):
        try:
            if not self.root: return {"output":"","error":"No project"}
            r = subprocess.run(cmd.split(), cwd=str(self.root), capture_output=True, text=True, timeout=30)
            return {"output":r.stdout+r.stderr,"error":None}
        except subprocess.TimeoutExpired: return {"output":"","error":"Timeout"}
        except Exception as e: return {"output":"","error":str(e)}

pm = ProjectManager(); fm = FileManager(); ex = Executor()

def cleanup():
    global localhost_server
    if ex.proc and ex.proc.poll() is None: ex.proc.terminate()
    if localhost_server: localhost_server.shutdown(); localhost_server = None
atexit.register(cleanup)

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
    if not pf: root.destroy(); return {"success":False,"error":"No folder"}
    pn = simpledialog.askstring("New Project", "Project name:", parent=root); root.destroy()
    if not pn: return {"success":False,"error":"No name"}
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
    if not fp: return {"success":False,"error":"No folder"}
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
def execute_command(cmd):
    if not cmd or not cmd.strip(): return {"output":"","error":"Empty command"}
    try: parts = shlex.split(cmd)
    except ValueError: return {"output":"","error":"Invalid command syntax"}
    if not parts: return {"output":"","error":"Empty command"}
    cmd_name = parts[0].lower()
    if cmd_name not in SAFE_COMMANDS: return {"output":"","error":f"Not allowed: {cmd_name}"}
    if any(op in parts for op in ['&&','||',';','|','`','$(']): return {"output":"","error":"Chaining not allowed"}
    return ex.cmd(' '.join(parts))

@eel.expose
def start_localhost(port=1313):
    global localhost_server
    try:
        if localhost_server: return {"success":True}
        if not pm.current_project_path: return {"success":False,"error":"No project"}
        os.chdir(pm.current_project_path)
        localhost_server = socketserver.TCPServer(("", int(port)), http.server.SimpleHTTPRequestHandler)
        threading.Thread(target=localhost_server.serve_forever, daemon=True).start()
        return {"success":True,"port":int(port)}
    except Exception as e: return {"success":False,"error":str(e)}

@eel.expose
def stop_localhost():
    global localhost_server
    if localhost_server: localhost_server.shutdown(); localhost_server = None; return {"success":True}
    return {"success":False}

if __name__ == '__main__':
    config._save(config.settings_file, config.settings)
    config._save(config.recent_file, config.recent_projects)
    config._save(config.session_file, config.session)
    try: eel.start('load.html', size=(600,500), mode='chrome', port=0, cmdline_args=['--no-proxy-server'])
    except:
        try: eel.start('load.html', size=(600,500), mode='edge', port=0)
        except: eel.start('load.html', size=(600,500), mode='default', port=8000)