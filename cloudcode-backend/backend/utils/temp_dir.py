# cloudcode_backend/utils/temp_dir.py
import tempfile
import shutil
from contextlib import contextmanager

@contextmanager
def temporary_dir():
    """
    A context manager to create and automatically clean up a temporary directory.
    Yields:
        str: The path to the temporary directory.
    """
    temp_dir = tempfile.mkdtemp()
    try:
        yield temp_dir
    finally:
        shutil.rmtree(temp_dir)