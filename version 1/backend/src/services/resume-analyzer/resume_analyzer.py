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
    'resume-analyzer-enhanced' Ollama model.
    """
    # Detailed prompt with instructions for comprehensive analysis
    prompt = f"""Analyze the following resume against the job description and provide a comprehensive JSON response.

RESUME:
    {resume_content}

JOB DESCRIPTION:
    {job_description}

Please provide a detailed analysis in the following JSON format:
{{
  "overallScore": <number 0-100>,
  "summary": "<brief summary of the match>",
  "skillAnalysis": {{
    "matchedSkills": [
      {{
        "name": "<skill name>",
        "proficiency": "<beginner|intermediate|advanced|expert>",
        "yearsExperience": <number>,
        "strength": "<high|medium|low>",
        "evidence": "<where this skill appears in resume>"
      }}
    ],
    "missingSkills": [
      {{
        "name": "<skill name>",
        "importance": "<high|medium|low>",
        "recommendation": "<how to acquire this skill>"
      }}
    ],
    "extraSkills": [
      {{
        "name": "<skill name>",
        "value": "<how this skill adds value even if not in JD>",
        "relevance": "<high|medium|low>"
      }}
    ],
    "requiredSkills": ["<list of skills from job description>"]
  }},
  "experienceAnalysis": {{
    "requiredYears": <number or "not specified">,
    "resumeYears": <number>,
    "match": <boolean>
  }},
  "strengths": [
    {{
      "category": "<category name>",
      "evidence": "<specific evidence from resume>",
      "impact": "<high|medium|low>"
    }}
  ],
  "suggestions": [
    {{
      "title": "<recommendation title>",
      "description": "<detailed recommendation suitable for a newbie - explain clearly and simply>",
      "priority": "<high|medium|low>",
      "timeEstimate": "<estimated time to implement>",
      "difficulty": "<beginner|intermediate|advanced>"
    }}
  ],
  "atsCompliance": {{
    "score": <number 0-100>,
    "issues": [
      "<specific ATS compatibility issues>"
    ],
    "suggestions": [
      "<specific suggestions to improve ATS compatibility>"
    ]
  }}
}}

IMPORTANT:
- Focus on providing beginner-friendly recommendations in the suggestions section
- Be specific about where skills appear in the resume
- For extraSkills, explain how skills not in the job description can still be valuable
- ATS score should consider formatting, keywords, structure, and compatibility
- All recommendations should be actionable and clear for someone new to job searching
    """

    try:
        client = ollama.Client()
        # Use the custom enhanced model
        # Try resume-analyzer-enhanced first, fallback to resume-analyzer if not found
        try:
            response = client.generate(model="resume-analyzer-enhanced", prompt=prompt)
            return response['response']
        except Exception as model_error:
            # Fallback to resume-analyzer if enhanced version not found
            print(f"WARNING: resume-analyzer-enhanced not found, trying resume-analyzer: {model_error}", file=sys.stderr)
            try:
                response = client.generate(model="resume-analyzer", prompt=prompt)
                return response['response']
            except Exception as fallback_error:
                print(f"ERROR: Both models failed. Enhanced: {model_error}, Fallback: {fallback_error}", file=sys.stderr)
                raise fallback_error
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
