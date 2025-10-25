# cloudcode_backend/services/ai_service.py
import json
import os
import google.generativeai as genai

class AIService:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set.")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-pro')

    def explain_code(self, code_snippet: str) -> str:
        prompt = f"""
        Explain the following code snippet in a clear and concise way.
        Use Markdown formatting for your response.
        - Start with a high-level summary.
        - Describe the purpose of key functions or classes.
        - Explain any complex or non-obvious logic.

        Code:
        ```        {code_snippet}
        ```
        """
        response = self.model.generate_content(prompt)
        return response.text

    def modernize_code(self, code_snippet: str, language: str) -> str:
        prompt = f"""
        Refactor the following code snippet to use modern syntax and best practices for {language}.
        Only return the modernized code itself, without any explanation or code fences.

        Original Code:
        ```
        {code_snippet}
        ```
        """
        response = self.model.generate_content(prompt)
        return response.text
    
    def generate_documentation(self, code_snippet: str, language: str) -> str:
        """
        Generates documentation (e.g., docstrings, comments) for a given code snippet.
        """
        prompt = f"""
        You are an expert programmer specializing in writing clear and concise documentation.
        Generate a professional docstring or header comment for the following {language} code.

        - If it's a function or class, create a complete docstring that explains its purpose, arguments, and return value (if any).
        - If it's a block of code, add comments to explain the logic.
        - The generated documentation should be in the correct format for the specified language (e.g., Python docstrings, JSDoc, etc.).
        - Return ONLY the generated documentation/comment block. Do not return the original code.

        Code Snippet:
        ```
        {code_snippet}
        ```
        """
        response = self.model.generate_content(prompt)
        # We can add cleaning logic here if needed, but for now, the prompt is specific.
        return response.text.strip()

    def scan_for_vulnerabilities(self, code_batch: str) -> dict:
        prompt = f"""
        Analyze the following batch of code files for security vulnerabilities.
        For each vulnerability found, provide a JSON object with the following keys:
        - "file_path": The path of the file where the vulnerability was found.
        - "line_number": The exact line number of the vulnerable code.
        - "line_of_code": The actual line of code that is vulnerable.
        - "vulnerability_type": A short, descriptive name for the vulnerability (e.g., "SQL Injection").
        - "severity": The severity level ('Critical', 'High', 'Medium', or 'Low').
        - "cwe": The relevant CWE identifier (e.g., "CWE-89").
        - "description": A detailed explanation of the vulnerability.
        - "suggested_solution": A code example or clear steps to fix the issue.

        Return a single JSON array containing these objects. If no vulnerabilities are found, return an empty array [].
        Do not include any text or explanation outside of the JSON array itself.

        Code Batch:
        ```
        {code_batch}
        ```
        """
        response = self.model.generate_content(prompt)
        # Clean the response to ensure it's valid JSON
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(cleaned_response)
        except json.JSONDecodeError:
            # Handle cases where the model might not return perfect JSON
            print("Warning: AI model did not return valid JSON for vulnerability scan.")
            return []


# Create a single, reusable instance of the service
ai_service = AIService()