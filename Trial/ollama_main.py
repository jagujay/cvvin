# ollama create resume-analyzer -f ./Modelfile
import fitz
import ollama


def extract_text_from_pdf(pdf_path):
    """Extracts text from a given PDF file."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
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
        print(f"Error communicating with Ollama: {e}")
        return None


# MAIN EXECUTION
if __name__ == "__main__":
    pdf_path = "ResumeLatex1.pdf"
    resume_content = extract_text_from_pdf(pdf_path)

    job_description = """
    We are looking for a Python Developer with 2-4 years of experience.
    Responsibilities include writing clean, efficient, and well-documented Python code,
    developing and maintaining back-end components, server-side logic, and APIs using Flask or Streamlit.
    The ideal candidate should have strong experience with SQL databases like MySQL and PostgreSQL.
    """

    if resume_content:
        result = analyse_resume_ollama(resume_content=resume_content, job_description=job_description)
        if result:
            print("Resume Analysis: \n")
            print(result)