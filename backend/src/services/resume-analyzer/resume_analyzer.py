#!/usr/bin/env python3
"""
Resume Analyzer Service
Extracts text from PDF and analyzes resume against job description using Ollama.
"""
import sys
import json
import fitz  # PyMuPDF
import ollama


def extract_text_from_pdf(pdf_path):
    """Extracts text from a given PDF file."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        print(f"ERROR: Error reading PDF: {e}", file=sys.stderr)
        return None


def analyse_resume_ollama(resume_content, job_description):
    """
    Analyzes a resume against a job description using the custom
    'resume-analyzer' Ollama model.
    """
    # The prompt is now just the dynamic data. The instructions are baked into the model.
    prompt = f"""
    --- RESUME ---
    {resume_content}
    --- JOB DESCRIPTION ---
    {job_description}
    """

    try:
        client = ollama.Client()
        # Use the custom model we created
        response = client.generate(model="resume-analyzer", prompt=prompt)
        return response['response']
    except Exception as e:
        print(f"ERROR: Error communicating with Ollama: {e}", file=sys.stderr)
        return None


def parse_json_response(response_text):
    """Parse JSON from Ollama response, handling potential markdown code blocks."""
    try:
        # Remove markdown code blocks if present
        text = response_text.strip()
        if text.startswith('```json'):
            text = text[7:]  # Remove ```json
        elif text.startswith('```'):
            text = text[3:]  # Remove ```
        if text.endswith('```'):
            text = text[:-3]  # Remove closing ```
        
        text = text.strip()
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse JSON response: {e}", file=sys.stderr)
        print(f"Response text: {response_text[:500]}...", file=sys.stderr)
        return None


# MAIN EXECUTION
if __name__ == "__main__":
    # Accept command-line arguments: pdf_path and job_description
    if len(sys.argv) < 3:
        print("ERROR: Usage: python resume_analyzer.py <pdf_path> <job_description>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    job_description = sys.argv[2]
    
    # Extract text from PDF
    resume_content = extract_text_from_pdf(pdf_path)
    
    if not resume_content:
        print("ERROR: Failed to extract text from PDF", file=sys.stderr)
        sys.exit(1)
    
    # Analyze resume
    result_text = analyse_resume_ollama(resume_content=resume_content, job_description=job_description)
    
    if not result_text:
        print("ERROR: Failed to analyze resume", file=sys.stderr)
        sys.exit(1)
    
    # Parse JSON response
    result_json = parse_json_response(result_text)
    
    if not result_json:
        print("ERROR: Failed to parse analysis result", file=sys.stderr)
        sys.exit(1)
    
    # Output JSON to stdout
    print(json.dumps(result_json, indent=2))





