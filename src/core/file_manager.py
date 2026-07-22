import os
import shutil
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class FileManager:
    """Управление файлами проекта"""
    
    def __init__(self):
        self.project_root = None
    
    def set_project_root(self, path):
        """Установка корневой папки проекта"""
        self.project_root = Path(path).resolve()
    
    def _safe_path(self, relative_path):
        """
        Безопасное получение абсолютного пути
        
        Args:
            relative_path (str): Относительный путь
            
        Returns:
            Path: Абсолютный путь в пределах проекта
        """
        if not self.project_root:
            raise ValueError("Корневая папка проекта не установлена")
        
        # Нормализация пути и проверка выхода за пределы проекта
        full_path = (self.project_root / relative_path).resolve()
        
        if not str(full_path).startswith(str(self.project_root)):
            raise ValueError("Попытка доступа за пределы проекта")
        
        return full_path
    
    def get_file_tree(self):
        """
        Получение дерева файлов проекта
        
        Returns:
            list: Древовидная структура файлов
        """
        if not self.project_root:
            return []
        
        def scan_directory(path, relative_path=""):
            items = []
            try:
                for entry in sorted(os.scandir(path), key=lambda x: (not x.is_dir(), x.name.lower())):
                    # Пропускаем project.json из дерева
                    if entry.name == 'project.json':
                        continue
                    
                    # Пропускаем скрытые файлы и папки, кроме .gitignore
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
        """
        Создание файла или папки
        
        Args:
            parent_path (str): Путь к родительской папке
            item_name (str): Имя элемента
            item_type (str): Тип ('file' или 'directory')
        """
        try:
            if parent_path:
                full_path = self._safe_path(os.path.join(parent_path, item_name))
            else:
                full_path = self.project_root / item_name
            
            if item_type == 'directory':
                full_path.mkdir(parents=True, exist_ok=True)
            else:
                full_path.touch()
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Ошибка создания: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def delete_item(self, relative_path):
        """
        Удаление файла или папки
        
        Args:
            relative_path (str): Относительный путь к элементу
        """
        try:
            full_path = self._safe_path(relative_path)
            
            if full_path.is_dir():
                shutil.rmtree(full_path)
            else:
                full_path.unlink()
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Ошибка удаления: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def rename_item(self, old_path, new_name):
        """
        Переименование файла или папки
        
        Args:
            old_path (str): Старый относительный путь
            new_name (str): Новое имя
        """
        try:
            old_full = self._safe_path(old_path)
            new_full = old_full.parent / new_name
            
            old_full.rename(new_full)
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Ошибка переименования: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def move_item(self, source_path, target_path):
        """
        Перемещение файла или папки
        
        Args:
            source_path (str): Исходный путь
            target_path (str): Целевой путь
        """
        try:
            source_full = self._safe_path(source_path)
            target_full = self._safe_path(target_path)
            
            shutil.move(str(source_full), str(target_full))
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Ошибка перемещения: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def read_file(self, relative_path):
        """
        Чтение содержимого файла
        
        Args:
            relative_path (str): Относительный путь к файлу
        """
        try:
            full_path = self._safe_path(relative_path)
            
            # Проверка размера файла (максимум 10MB)
            if full_path.stat().st_size > 10 * 1024 * 1024:
                return {"success": False, "error": "Файл слишком большой"}
            
            # Пробуем разные кодировки
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
            logger.error(f"Ошибка чтения: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def save_file(self, relative_path, content):
        """
        Сохранение содержимого файла
        
        Args:
            relative_path (str): Относительный путь к файлу
            content (str): Новое содержимое
        """
        try:
            full_path = self._safe_path(relative_path)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Ошибка сохранения: {str(e)}")
            return {"success": False, "error": str(e)}