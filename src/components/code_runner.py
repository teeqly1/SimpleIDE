"""
Компонент для запуска кода с поддержкой различных языков
"""
import os
from pathlib import Path

class CodeRunner:
    """Расширенный запуск кода"""
    
    @staticmethod
    def get_runner_for_file(file_path):
        """
        Определение способа запуска в зависимости от расширения файла
        
        Args:
            file_path (str): Путь к файлу
            
        Returns:
            dict: Информация о запуске
        """
        extension = Path(file_path).suffix.lower()
        
        runners = {
            '.py': {
                'command': 'python',
                'args': ['{file}'],
                'description': 'Python'
            },
            '.js': {
                'command': 'node',
                'args': ['{file}'],
                'description': 'JavaScript'
            },
            '.java': {
                'command': 'javac',
                'args': ['{file}'],
                'description': 'Java (компиляция)'
            },
            '.cpp': {
                'command': 'g++',
                'args': ['{file}', '-o', '{name}'],
                'description': 'C++ (компиляция)'
            }
        }
        
        return runners.get(extension, {
            'command': None,
            'args': [],
            'description': 'Неподдерживаемый тип'
        })