# run.py
import os
from backend import create_app

# Get the configuration name from an environment variable (e.g., 'development', 'production')
# Default to 'development' if not set
config_name = os.getenv('FLASK_ENV', 'development')
app = create_app(config_name)

if __name__ == '__main__':
    app.run()