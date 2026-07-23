import os
import json
from datetime import datetime

class Config:
    def __init__(self):
        self.config_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'config')
        self.config_file = os.path.join(self.config_dir, 'settings.json')
        self.recent_file = os.path.join(self.config_dir, 'recent_projects.json')
        self.session_file = os.path.join(self.config_dir, 'session.json')
        
        os.makedirs(self.config_dir, exist_ok=True)
        
        self.settings = self.load_settings()
        self.recent_projects = self.load_recent_projects()
        self.session = self.load_session()
    
    def load_settings(self):
        default = {
            "language": "ru",
            "theme": "monokai",
            "font_size": 14,
            "bg_image": None,
            "window_width": 1400,
            "window_height": 900
        }
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                default.update(data)
        except: pass
        return default
    
    def save_settings(self, **kwargs):
        self.settings.update(kwargs)
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.settings, f, indent=2, ensure_ascii=False)
            return True
        except: return False
    
    def load_recent_projects(self):
        try:
            if os.path.exists(self.recent_file):
                with open(self.recent_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except: pass
        return []
    
    def add_recent_project(self, path, name):
        self.recent_projects = [p for p in self.recent_projects if p['path'] != path]
        self.recent_projects.insert(0, {
            'path': path,
            'name': name,
            'date': datetime.now().isoformat()
        })
        self.recent_projects = self.recent_projects[:10]
        self.save_recent_projects()
    
    def save_recent_projects(self):
        try:
            with open(self.recent_file, 'w', encoding='utf-8') as f:
                json.dump(self.recent_projects, f, indent=2, ensure_ascii=False)
        except: pass
    
    def load_session(self):
        default = {
            "last_project": None,
            "open_tabs": [],
            "active_tab": None,
            "explorer_expanded": []
        }
        try:
            if os.path.exists(self.session_file):
                with open(self.session_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                default.update(data)
        except: pass
        return default
    
    def save_session(self, **kwargs):
        self.session.update(kwargs)
        try:
            with open(self.session_file, 'w', encoding='utf-8') as f:
                json.dump(self.session, f, indent=2, ensure_ascii=False)
            return True
        except: return False

# Глобальный экземпляр конфига
config = Config()