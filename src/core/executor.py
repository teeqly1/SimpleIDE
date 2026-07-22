import subprocess
import threading
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class Executor:
    """Запуск и выполнение кода"""
    
    def __init__(self):
        self.output_buffer = []
        self.current_process = None
        self.project_root = None
    
    def set_project_root(self, path):
        """Установка корневой папки проекта"""
        self.project_root = Path(path).resolve()
    
    def run_code(self, file_path, pre_command=""):
        """
        Запуск кода в отдельном потоке
        
        Args:
            file_path (str): Путь к файлу для запуска
            pre_command (str): Команда перед запуском
        """
        if self.current_process and self.current_process.poll() is None:
            return {"success": False, "error": "Процесс уже выполняется"}
        
        self.output_buffer = []
        
        def run():
            try:
                # Выполнение предварительной команды
                if pre_command:
                    self.output_buffer.append(f"> {pre_command}")
                    pre_process = subprocess.run(
                        pre_command,
                        shell=True,
                        cwd=str(self.project_root),
                        capture_output=True,
                        text=True
                    )
                    self.output_buffer.append(pre_process.stdout)
                    if pre_process.stderr:
                        self.output_buffer.append(pre_process.stderr)
                
                # Определение команды запуска в зависимости от типа файла
                file_path_obj = Path(file_path)
                extension = file_path_obj.suffix.lower()
                
                if extension == '.py':
                    command = f'python "{file_path}"'
                elif extension == '.js':
                    command = f'node "{file_path}"'
                elif extension == '.html':
                    command = f'start "" "{file_path}"' if os.name == 'nt' else f'xdg-open "{file_path}"'
                else:
                    self.output_buffer.append(f"Неподдерживаемый тип файла: {extension}")
                    return
                
                self.output_buffer.append(f"> {command}")
                
                # Запуск процесса
                self.current_process = subprocess.Popen(
                    command,
                    shell=True,
                    cwd=str(self.project_root),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                # Чтение вывода в реальном времени
                for line in self.current_process.stdout:
                    self.output_buffer.append(line.rstrip())
                
                # Чтение ошибок
                stderr_output = self.current_process.stderr.read()
                if stderr_output:
                    self.output_buffer.extend(stderr_output.split('\n'))
                
                self.current_process.wait()
                self.output_buffer.append(f"\nПроцесс завершен с кодом: {self.current_process.returncode}")
                
            except Exception as e:
                logger.error(f"Ошибка выполнения: {str(e)}")
                self.output_buffer.append(f"Ошибка: {str(e)}")
        
        thread = threading.Thread(target=run)
        thread.daemon = True
        thread.start()
        
        return {"success": True, "message": "Запуск выполняется"}
    
    def get_output(self):
        """Получение накопленного вывода"""
        output = '\n'.join(self.output_buffer)
        return output
    
    def stop_execution(self):
        """Остановка выполнения"""
        if self.current_process and self.current_process.poll() is None:
            self.current_process.terminate()
            return {"success": True}
        return {"success": False, "error": "Нет выполняющегося процесса"}