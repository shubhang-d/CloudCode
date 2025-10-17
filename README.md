# CloudCode: AI-Powered Code Refactoring & Analysis Assistant

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Status: In Development](https://img.shields.io/badge/status-in_development-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?logo=flask&logoColor=white)

An intelligent VS Code extension that analyzes, refactors, and improves your codebase using the power of Generative AI. CloudCode helps you reduce technical debt, enhance code maintainability, and modernize legacy projects.

---

## 🌟 Introduction

In modern software development, maintaining a clean, efficient, and well-documented codebase is a significant challenge. Technical debt accumulates, code becomes difficult to understand, and developer productivity suffers.

**CloudCode** is a tool designed to tackle these problems head-on. It acts as an AI assistant directly within your VS Code editor, providing deep analysis of your projects and offering intelligent refactoring suggestions. By leveraging a powerful Python backend, it can analyze entire Git repositories to give you a holistic view of your project's health.

<!-- A GIF demonstrating the analysis process would go here. For now, it's a placeholder. -->
<!-- ![CloudCode Demo](https://i.imgur.com/your-demo-image.gif) -->

## ✨ Key Features

*   **📊 Comprehensive Project Analysis:** Get a detailed metadata report on any Git repository, including language breakdown, file counts, and commit history.
*   **✅ Code Health Metrics:** Understand your project's activity with metrics like commit frequency, contributor count, and active branches.
*   **🛠️ AI-Powered Refactoring (Roadmap):** Automatically rewrite messy or legacy code into a clean, optimized, and documented form.
*   **🛡️ Security Vulnerability Detection (Roadmap):** Identify potential security flaws in your code before they reach production.
*   **🎨 Sidebar Integration:** All analysis results are displayed in a clean, intuitive tree view in the VS Code sidebar.

## 🏗️ Architecture

CloudCode is built with a decoupled frontend/backend architecture, allowing for powerful analysis without slowing down the editor.

*   **Frontend (VS Code Extension):**
    *   Written in **TypeScript** using the **VS Code Extension API**.
    *   Provides the user interface (Activity Bar icon, sidebar views, commands).
    *   Communicates with the backend via a REST API.

*   **Backend (Analysis Service):**
    *   A **Python** server built with the **Flask** framework.
    *   Receives a Git URL, clones the repository into a temporary directory.
    *   Uses command-line tools like **`git`** and **`cloc`** to perform the analysis.
    *   Returns a structured JSON object with all the project metadata.


## 🚀 Getting Started: Setup & Installation

Follow these steps to set up and run the CloudCode project on your local machine.

### Prerequisites

Make sure you have the following tools installed:

*   [**Node.js**](https://nodejs.org/) (v16.x or higher)
*   [**Python**](https://www.python.org/) (v3.8 or higher)
*   [**Git**](https://git-scm.com/)
*   [**cloc**](https://github.com/AlDanial/cloc) (A tool to count lines of code)
    *   **macOS:** `brew install cloc`
    *   **Ubuntu/Debian:** `sudo apt-get install cloc`
    *   **Windows:** `choco install cloc` or `scoop install cloc`

### 1. Backend Setup (The Analysis Server)

First, set up and run the Python backend which will perform the analysis.

```bash
# Navigate to the backend directory
cd cloudcode-backend

# Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install the required Python packages
pip install -r requirements.txt

# Run the Flask server
flask run
```

The backend is now running on http://127.0.0.1:5000. Keep this terminal open.

### 2. Frontend Setup (The VS Code Extension)
Now, in a new terminal, set up and launch the VS Code extension.

```bash
# Navigate to the frontend extension directory
cd cloudcode

# Install the npm dependencies
npm install

# Open the project in VS Code
code .
```

Once the project is open in VS Code, press F5 to start a debugging session. This will compile the TypeScript code and open a new [Extension Development Host] window with the CloudCode extension installed.

### 💻 How to Use
1. Make sure both the backend server and the extension (via F5) are running.
2. In the [Extension Development Host] window, click on the new CloudCode icon in the Activity Bar on the left.
3. Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P).
4. Type and select "CloudCode: Analyze a Public Git Repository".
5. Paste the URL of a public Git repository (e.g., https://github.com/expressjs/express.git).
6. A notification will appear showing the analysis progress. Once complete, the sidebar will update with all the detailed project metadata.


### 📝 API Documentation
The extension communicates with the backend via a single endpoint.
- Endpoint: /analyze
- Method: POST
- Request Body (JSON):
```JSON
{
  "repositoryUrl": "https://github.com/owner/repo.git"
}
```
- Success Response (200 OK):
A detailed JSON object containing all the project metadata. See cloudcode-backend/app.py for the full structure.


### 🤝 Contributing
Contributions are welcome! If you'd like to help improve CloudCode, please follow these steps:
1. Fork the repository.
2. Create a new feature branch (git checkout -b feature/your-awesome-feature).
3. Make your changes.
4. Commit your changes (git commit -m 'Add some awesome feature').
5. Push to the branch (git push origin feature/your-awesome-feature).
6. Open a Pull Request.

### 📄 License
This project is licensed under the MIT License. See the LICENSE file for details.