import sys
import os

# Патч для pkg_resources перед импортом eel
try:
    import pkg_resources
except ImportError:
    import types
    pkg_resources = types.ModuleType('pkg_resources')
    
    def require(*args, **kwargs):
        pass
    
    def get_distribution(*args, **kwargs):
        class Distribution:
            version = '0.0.0'
        return Distribution()
    
    def resource_filename(package, resource):
        import importlib
        try:
            mod = importlib.import_module(package)
            return os.path.join(os.path.dirname(mod.__file__), resource)
        except:
            return os.path.join(os.path.dirname(__file__), resource)
    
    def resource_string(package, resource):
        filename = resource_filename(package, resource)
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    
    pkg_resources.require = require
    pkg_resources.get_distribution = get_distribution
    pkg_resources.resource_filename = resource_filename
    pkg_resources.resource_string = resource_string
    sys.modules['pkg_resources'] = pkg_resources

import eel
import os
import sys
import json
from datetime import datetime
import shutil
import subprocess
import threading
from pathlib import Path

# Файл для хранения последних проектов
RECENT_PROJECTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'recent_projects.json')

def load_recent_projects():
    """Загрузка списка последних проектов"""
    try:
        if os.path.exists(RECENT_PROJECTS_FILE):
            with open(RECENT_PROJECTS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except:
        pass
    return []

def save_recent_projects(projects):
    """Сохранение списка последних проектов"""
    try:
        with open(RECENT_PROJECTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(projects, f, ensure_ascii=False, indent=2)
    except:
        pass

def add_to_recent(project_path, project_name):
    """Добавление проекта в список последних"""
    recent = load_recent_projects()
    recent = [p for p in recent if p['path'] != project_path]
    recent.insert(0, {
        'path': project_path,
        'name': project_name,
        'date': datetime.now().isoformat()
    })
    recent = recent[:10]
    save_recent_projects(recent)
    return recent

def load_language(lang_code='ru'):
    """Загрузка языкового файла"""
    try:
        # Получаем абсолютный путь к папке с языками
        base_dir = os.path.dirname(os.path.abspath(__file__))
        lang_file = os.path.join(base_dir, 'others', 'languages', f'{lang_code}.json')
        
        print(f"Загрузка языка: {lang_file}")
        print(f"Файл существует: {os.path.exists(lang_file)}")
        
        if os.path.exists(lang_file):
            with open(lang_file, 'r', encoding='utf-8') as f:
                translations = json.load(f)
                print(f"Язык {lang_code} загружен успешно")
                return translations
        else:
            print(f"Файл языка не найден: {lang_file}")
            # Проверяем содержимое папки
            lang_dir = os.path.join(base_dir, 'others', 'languages')
            if os.path.exists(lang_dir):
                print(f"Содержимое папки languages: {os.listdir(lang_dir)}")
            else:
                print(f"Папка languages не существует: {lang_dir}")
                # Проверяем родительские папки
                others_dir = os.path.join(base_dir, 'others')
                print(f"Папка others существует: {os.path.exists(others_dir)}")
                if os.path.exists(others_dir):
                    print(f"Содержимое папки others: {os.listdir(others_dir)}")
            
    except Exception as e:
        print(f"Ошибка загрузки языка {lang_code}: {e}")
    
    # Возвращаем заглушку для русского языка
    if lang_code == 'ru':
        return {
            "app": {
                "name": "Simple IDE",
                "description": "Легкая среда разработки"
            },
            "welcome": {
                "create_project": "Создать проект",
                "create_project_desc": "Создать новую папку с проектом",
                "open_project": "Открыть проект",
                "open_project_desc": "Открыть существующий проект (project.json)",
                "init_project": "Инициализировать проект",
                "init_project_desc": "Создать project.json в существующей папке",
                "recent_projects": "Последние проекты",
                "no_recent": "Нет недавних проектов",
                "settings": "Настройки",
                "settings_desc": "Выбрать язык интерфейса"
            },
            "settings": {
                "language": "Язык интерфейса:",
                "save": "Сохранить",
                "cancel": "Отмена"
            }
        }
    elif lang_code == 'en':
        return {
            "app": {
                "name": "Simple IDE",
                "description": "Lightweight Development Environment"
            },
            "welcome": {
                "create_project": "Create Project",
                "create_project_desc": "Create a new folder with project",
                "open_project": "Open Project",
                "open_project_desc": "Open existing project (project.json)",
                "init_project": "Initialize Project",
                "init_project_desc": "Create project.json in existing folder",
                "recent_projects": "Recent Projects",
                "no_recent": "No recent projects",
                "settings": "Settings",
                "settings_desc": "Select interface language"
            },
            "settings": {
                "language": "Interface language:",
                "save": "Save",
                "cancel": "Cancel"
            }
        }
    
    return {}

# Инициализация Eel с указанием папки веб-интерфейса
eel.init('src/ui/web')

# ===== Управление проектами =====
class ProjectManager:
    def __init__(self):
        self.current_project_path = None
        self.config = None
    
    def create_project(self, project_path, project_name):
        try:
            project_dir = os.path.join(project_path, project_name)
            os.makedirs(project_dir, exist_ok=True)
            
            config = {
                "projectName": project_name,
                "version": "1.0.0",
                "createdAt": datetime.now().isoformat(),
                "startFile": None,
                "preLaunchCommand": "",
                "files": []
            }
            
            config_path = os.path.join(project_dir, "project.json")
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            self.current_project_path = project_dir
            self.config = config
            
            os.makedirs(os.path.join(project_dir, "src"), exist_ok=True)
            
            readme_path = os.path.join(project_dir, "README.md")
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(f"# {project_name}\n\nПроект создан в Simple IDE")
            
            add_to_recent(project_dir, project_name)
            
            return {"success": True, "projectPath": project_dir}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def initialize_project_in_folder(self, folder_path):
        try:
            config_path = os.path.join(folder_path, "project.json")
            if os.path.exists(config_path):
                with open(config_path, 'r', encoding='utf-8') as f:
                    self.config = json.load(f)
                self.current_project_path = folder_path
                add_to_recent(folder_path, self.config.get('projectName', os.path.basename(folder_path)))
                return {"success": True, "projectPath": folder_path, "config": self.config}
            
            project_name = os.path.basename(folder_path)
            
            files = []
            for root, dirs, filenames in os.walk(folder_path):
                for filename in filenames:
                    if not filename.startswith('.'):
                        rel_path = os.path.relpath(os.path.join(root, filename), folder_path)
                        rel_path = rel_path.replace('\\', '/')
                        files.append(rel_path)
            
            config = {
                "projectName": project_name,
                "version": "1.0.0",
                "createdAt": datetime.now().isoformat(),
                "startFile": None,
                "preLaunchCommand": "",
                "files": files
            }
            
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            self.current_project_path = folder_path
            self.config = config
            
            add_to_recent(folder_path, project_name)
            
            return {"success": True, "projectPath": folder_path, "config": config}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def open_project(self, project_path=None):
        try:
            if project_path is None:
                import tkinter as tk
                from tkinter import filedialog
                root = tk.Tk()
                root.withdraw()
                root.attributes('-topmost', True)
                project_path = filedialog.askdirectory(title="Выберите папку проекта с project.json")
                root.destroy()
                if not project_path:
                    return {"success": False, "error": "Папка не выбрана"}
            
            config_path = os.path.join(project_path, "project.json")
            
            if not os.path.exists(config_path):
                return {"success": False, "error": "В выбранной папке нет project.json. Используйте 'Инициализировать проект'"}
            
            with open(config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
            
            self.current_project_path = project_path
            
            current_files = []
            for root, dirs, filenames in os.walk(project_path):
                for filename in filenames:
                    if not filename.startswith('.') and filename != 'project.json':
                        rel_path = os.path.relpath(os.path.join(root, filename), project_path)
                        rel_path = rel_path.replace('\\', '/')
                        current_files.append(rel_path)
            
            self.config['files'] = current_files
            
            add_to_recent(project_path, self.config.get('projectName', os.path.basename(project_path)))
            
            return {"success": True, "projectPath": project_path, "config": self.config}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_config(self):
        return self.config
    
    def save_config(self, config):
        try:
            if self.current_project_path:
                config_path = os.path.join(self.current_project_path, "project.json")
                with open(config_path, 'w', encoding='utf-8') as f:
                    json.dump(config, f, indent=2, ensure_ascii=False)
                self.config = config
                return {"success": True}
            return {"success": False, "error": "Проект не открыт"}
        except Exception as e:
            return {"success": False, "error": str(e)}

# ===== Управление файлами =====
class FileManager:
    def __init__(self):
        self.project_root = None
    
    def set_project_root(self, path):
        self.project_root = Path(path).resolve()
    
    def _safe_path(self, relative_path):
        if not self.project_root:
            raise ValueError("Корневая папка проекта не установлена")
        if not relative_path:
            return self.project_root
        full_path = (self.project_root / relative_path).resolve()
        if not str(full_path).startswith(str(self.project_root)):
            raise ValueError("Попытка доступа за пределы проекта")
        return full_path
    
    def get_file_tree(self):
        if not self.project_root:
            return []
        
        def scan_directory(path, relative_path=""):
            items = []
            try:
                entries = sorted(os.scandir(path), key=lambda x: (not x.is_dir(), x.name.lower()))
                for entry in entries:
                    if entry.name == 'project.json':
                        continue
                    if entry.name.startswith('.') and entry.name != '.gitignore':
                        continue
                    
                    item_path = os.path.join(relative_path, entry.name).replace('\\', '/')
                    
                    if entry.is_dir():
                        children = scan_directory(entry.path, item_path)
                        item = {
                            "name": entry.name,
                            "path": item_path,
                            "type": "directory",
                            "children": children
                        }
                    else:
                        item = {
                            "name": entry.name,
                            "path": item_path,
                            "type": "file",
                            "extension": os.path.splitext(entry.name)[1]
                        }
                    items.append(item)
            except PermissionError:
                pass
            return items
        
        return scan_directory(self.project_root)
    
    def create_item(self, parent_path, item_name, item_type):
        try:
            if parent_path:
                full_path = self._safe_path(os.path.join(parent_path, item_name))
            else:
                full_path = self.project_root / item_name
            
            if item_type == 'directory':
                full_path.mkdir(parents=True, exist_ok=True)
            else:
                full_path.parent.mkdir(parents=True, exist_ok=True)
                full_path.touch()
            
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def delete_item(self, relative_path):
        try:
            full_path = self._safe_path(relative_path)
            if full_path.is_dir():
                shutil.rmtree(full_path)
            else:
                full_path.unlink()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def rename_item(self, old_path, new_name):
        try:
            old_full = self._safe_path(old_path)
            new_full = old_full.parent / new_name
            old_full.rename(new_full)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def move_item(self, source_path, target_path):
        try:
            source_full = self._safe_path(source_path)
            target_full = self._safe_path(target_path)
            shutil.move(str(source_full), str(target_full))
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def read_file(self, relative_path):
        try:
            full_path = self._safe_path(relative_path)
            if full_path.stat().st_size > 10 * 1024 * 1024:
                return {"success": False, "error": "Файл слишком большой"}
            
            content = None
            for encoding in ['utf-8', 'cp1251', 'latin-1']:
                try:
                    with open(full_path, 'r', encoding=encoding) as f:
                        content = f.read()
                    break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                return {"success": False, "error": "Не удалось прочитать файл"}
            
            return {"success": True, "content": content}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def save_file(self, relative_path, content):
        try:
            full_path = self._safe_path(relative_path)
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

# ===== Исполнение кода =====
class Executor:
    def __init__(self):
        self.output_buffer = []
        self.current_process = None
        self.project_root = None
    
    def set_project_root(self, path):
        self.project_root = Path(path).resolve()
    
    def run_code(self, file_path, pre_command=""):
        if self.current_process and self.current_process.poll() is None:
            return {"success": False, "error": "Процесс уже выполняется"}
        
        self.output_buffer = []
        
        def run():
            try:
                if pre_command:
                    self.output_buffer.append(f"> {pre_command}")
                    pre_process = subprocess.run(
                        pre_command, shell=True, cwd=str(self.project_root),
                        capture_output=True, text=True, encoding='utf-8', errors='ignore'
                    )
                    if pre_process.stdout:
                        self.output_buffer.append(pre_process.stdout)
                    if pre_process.stderr:
                        self.output_buffer.append(pre_process.stderr)
                
                full_path = self.project_root / file_path
                extension = os.path.splitext(file_path)[1].lower()
                
                if extension == '.py':
                    command = f'python "{full_path}"'
                elif extension == '.js':
                    command = f'node "{full_path}"'
                else:
                    self.output_buffer.append(f"Неподдерживаемый тип файла: {extension}")
                    return
                
                self.output_buffer.append(f"> {command}")
                
                self.current_process = subprocess.Popen(
                    command, shell=True, cwd=str(self.project_root),
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    text=True, encoding='utf-8', errors='ignore'
                )
                
                for line in self.current_process.stdout:
                    self.output_buffer.append(line.rstrip())
                
                stderr_output = self.current_process.stderr.read()
                if stderr_output:
                    self.output_buffer.extend(stderr_output.split('\n'))
                
                self.current_process.wait()
                self.output_buffer.append(f"\nПроцесс завершен с кодом: {self.current_process.returncode}")
            except Exception as e:
                self.output_buffer.append(f"Ошибка: {str(e)}")
        
        thread = threading.Thread(target=run, daemon=True)
        thread.start()
        return {"success": True, "message": "Запуск выполняется"}
    
    def get_output(self):
        return '\n'.join(self.output_buffer[-100:])
    
    def stop_execution(self):
        if self.current_process and self.current_process.poll() is None:
            self.current_process.terminate()
            return {"success": True}
        return {"success": False, "error": "Нет выполняющегося процесса"}

# Создание экземпляров
project_manager = ProjectManager()
file_manager = FileManager()
executor = Executor()

# ===== API для фронтенда =====

@eel.expose
def get_language(lang_code='ru'):
    """Получение языкового файла"""
    return load_language(lang_code)

@eel.expose
def create_new_project():
    import tkinter as tk
    from tkinter import filedialog, simpledialog
    
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    
    parent_folder = filedialog.askdirectory(title="Выберите папку для нового проекта")
    if not parent_folder:
        root.destroy()
        return {"success": False, "error": "Папка не выбрана"}
    
    project_name = simpledialog.askstring("Новый проект", "Введите название проекта:", parent=root)
    root.destroy()
    
    if not project_name:
        return {"success": False, "error": "Имя проекта не указано"}
    
    result = project_manager.create_project(parent_folder, project_name)
    if result.get('success'):
        file_manager.set_project_root(result['projectPath'])
        executor.set_project_root(result['projectPath'])
    
    return result

@eel.expose
def open_project(project_path=None):
    result = project_manager.open_project(project_path)
    if result.get('success'):
        file_manager.set_project_root(result['projectPath'])
        executor.set_project_root(result['projectPath'])
    return result

@eel.expose
def create_project_in_existing_folder():
    import tkinter as tk
    from tkinter import filedialog
    
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    
    folder_path = filedialog.askdirectory(title="Выберите существующую папку")
    root.destroy()
    
    if not folder_path:
        return {"success": False, "error": "Папка не выбрана"}
    
    result = project_manager.initialize_project_in_folder(folder_path)
    if result.get('success'):
        file_manager.set_project_root(result['projectPath'])
        executor.set_project_root(result['projectPath'])
    
    return result

@eel.expose
def get_recent_projects():
    return load_recent_projects()

@eel.expose
def get_file_tree():
    return file_manager.get_file_tree()

@eel.expose
def create_item(parent_path, item_name, item_type):
    return file_manager.create_item(parent_path, item_name, item_type)

@eel.expose
def delete_item(path):
    return file_manager.delete_item(path)

@eel.expose
def rename_item(old_path, new_name):
    return file_manager.rename_item(old_path, new_name)

@eel.expose
def move_item(source_path, target_path):
    return file_manager.move_item(source_path, target_path)

@eel.expose
def read_file(file_path):
    return file_manager.read_file(file_path)

@eel.expose
def save_file(file_path, content):
    return file_manager.save_file(file_path, content)

@eel.expose
def run_code(file_path, pre_command=""):
    return executor.run_code(file_path, pre_command)

@eel.expose
def get_output():
    return executor.get_output()

@eel.expose
def stop_execution():
    return executor.stop_execution()

@eel.expose
def get_project_config():
    return project_manager.get_config()

@eel.expose
def save_project_config(config):
    return project_manager.save_config(config)

# Запуск приложения
if __name__ == '__main__':
    eel.start('index.html', 
              size=(1400, 900),
              mode='chrome',
              port=0,
              cmdline_args=['--incognito'])