import os
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ProjectManager:
    """Управление проектами IDE"""
    
    def __init__(self):
        self.current_project_path = None
        self.config = None
    
    def create_project(self, project_path, project_name):
        """
        Создание нового проекта (создает новую папку)
        
        Args:
            project_path (str): Путь к родительской папке
            project_name (str): Название проекта
            
        Returns:
            dict: Статус создания
        """
        try:
            # Создание основной папки проекта
            project_dir = os.path.join(project_path, project_name)
            os.makedirs(project_dir, exist_ok=True)
            
            # Создание файла конфигурации
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
            
            # Создание базовой структуры папок
            src_dir = os.path.join(project_dir, "src")
            os.makedirs(src_dir, exist_ok=True)
            
            # Создание README.md
            readme_path = os.path.join(project_dir, "README.md")
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(f"# {project_name}\n\nПроект создан в Simple IDE")
            
            return {"success": True, "projectPath": project_dir}
            
        except Exception as e:
            logger.error(f"Ошибка создания проекта: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def initialize_project_in_folder(self, folder_path):
        """
        Инициализация проекта в существующей папке (создает project.json)
        
        Args:
            folder_path (str): Путь к существующей папке
            
        Returns:
            dict: Статус инициализации
        """
        try:
            # Проверяем, не является ли папка уже проектом
            config_path = os.path.join(folder_path, "project.json")
            if os.path.exists(config_path):
                return self.open_project(folder_path)
            
            # Анализируем содержимое папки
            project_name = os.path.basename(folder_path)
            
            # Сканируем файлы в папке
            files = []
            for root, dirs, filenames in os.walk(folder_path):
                for filename in filenames:
                    if not filename.startswith('.'):
                        rel_path = os.path.relpath(os.path.join(root, filename), folder_path)
                        files.append(rel_path)
            
            # Создаем конфигурацию
            config = {
                "projectName": project_name,
                "version": "1.0.0",
                "createdAt": datetime.now().isoformat(),
                "startFile": None,
                "preLaunchCommand": "",
                "files": files
            }
            
            # Сохраняем project.json
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            self.current_project_path = folder_path
            self.config = config
            
            return {"success": True, "projectPath": folder_path, "config": config}
            
        except Exception as e:
            logger.error(f"Ошибка инициализации проекта: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def open_project(self, project_path):
        """
        Открытие существующего проекта (требует project.json)
        
        Args:
            project_path (str): Путь к папке проекта
            
        Returns:
            dict: Статус открытия
        """
        try:
            config_path = os.path.join(project_path, "project.json")
            
            if not os.path.exists(config_path):
                return {
                    "success": False, 
                    "error": "Файл project.json не найден. Это не проект IDE."
                }
            
            with open(config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
            
            self.current_project_path = project_path
            
            # Анализируем текущее состояние файлов
            current_files = []
            for root, dirs, filenames in os.walk(project_path):
                for filename in filenames:
                    if not filename.startswith('.') and filename != 'project.json':
                        rel_path = os.path.relpath(os.path.join(root, filename), project_path)
                        current_files.append(rel_path)
            
            # Обновляем список файлов в конфиге
            self.config['files'] = current_files
            
            return {
                "success": True, 
                "projectPath": project_path,
                "config": self.config
            }
            
        except Exception as e:
            logger.error(f"Ошибка открытия проекта: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_config(self):
        """Получение текущей конфигурации"""
        return self.config
    
    def save_config(self, config):
        """
        Сохранение конфигурации проекта
        
        Args:
            config (dict): Новая конфигурация
        """
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