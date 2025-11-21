# Resume Analyzer Python Service

This service extracts text from PDF resumes and analyzes them against job descriptions using Ollama.

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Ensure Ollama is running and the model is created:
```bash
ollama serve
ollama create resume-analyzer -f ../../../../Trial/Modelfile
```

## Usage

```bash
python resume_analyzer.py <pdf_path> "<job_description>"
```

The script outputs JSON to stdout on success, or error messages to stderr on failure.

## Exit Codes

- 0: Success
- 1: Error (invalid arguments, PDF extraction failed, analysis failed, JSON parsing failed)





















