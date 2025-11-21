#!/usr/bin/env python3
"""
HR Report Generator
Generates a comprehensive summary of HR interview performance using Ollama
"""

import json
import sys
import subprocess
import os

def call_ollama(prompt, model="llama3.2"):
    """Call Ollama API with the given prompt"""
    try:
        result = subprocess.run(
            ["ollama", "run", model, prompt],
            capture_output=True,
            text=True,
            timeout=120,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            print(f"Ollama error: {result.stderr}", file=sys.stderr)
            return None
    except subprocess.TimeoutExpired:
        print("Ollama call timed out", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Error calling Ollama: {str(e)}", file=sys.stderr)
        return None

def generate_comprehensive_summary(questions, responses, textAnalyses, rubricScores, proctoringFeedback):
    """Generate comprehensive summary of HR interview performance"""
    
    # Prepare Q&A pairs for analysis
    qa_pairs = []
    for q in questions:
        q_id = q.get('id', '')
        response_text = responses.get(q_id, '')
        text_analysis = textAnalyses.get(q_id, {})
        rubric = rubricScores.get(q_id, {})
        
        qa_pairs.append({
            'question': q.get('question', ''),
            'category': q.get('category', 'General'),
            'response': response_text if isinstance(response_text, str) else response_text.get('text', ''),
            'fluency_score': text_analysis.get('fluency', {}).get('score', 0) if isinstance(text_analysis.get('fluency'), dict) else 0,
            'content_score': text_analysis.get('content', {}).get('score', 0) if isinstance(text_analysis.get('content'), dict) else 0,
            'language_score': text_analysis.get('language', {}).get('score', 0) if isinstance(text_analysis.get('language'), dict) else 0,
            'clarity': rubric.get('clarity', 0),
            'relevance': rubric.get('relevance', 0),
            'confidence': rubric.get('confidence', 0),
            'professionalism': rubric.get('professionalism', 0),
            'analysis': text_analysis.get('summary') or text_analysis.get('feedback') or ''
        })
    
    # Create comprehensive prompt
    prompt = f"""You are an expert HR interviewer analyzing a candidate's interview performance. Based on the following questions and answers, generate a comprehensive summary.

Questions and Answers:
{json.dumps(qa_pairs, indent=2)}

Generate a detailed JSON response with the following structure:
{{
  "summary": "A comprehensive 3-4 paragraph summary analyzing overall performance, communication style, strengths, and areas needing improvement",
  "overallScore": <average score 0-100>,
  "strengths": [
    {{
      "strength": "<specific strength>",
      "evidence": "<example from answers supporting this strength>"
    }}
  ],
  "weaknesses": [
    {{
      "weakness": "<specific area for improvement>",
      "evidence": "<example from answers showing this weakness>",
      "impact": "<how this affects interview performance>"
    }}
  ],
  "answerQualityAnalysis": {{
    "overallAssessment": "Overall assessment of answer quality across all questions",
    "communicationStyle": "Analysis of communication style, clarity, and articulation",
    "contentRelevance": "How well answers addressed the questions asked",
    "examples": [
      {{
        "question": "<question text>",
        "strength": "<what was good about the answer>",
        "improvement": "<what could be improved>"
      }}
    ]
  }},
  "recommendations": [
    {{
      "category": "<category like Communication, Content, Confidence, etc>",
      "recommendation": "<specific actionable recommendation>",
      "priority": "<high/medium/low>",
      "reason": "<why this recommendation is important>"
    }}
  ],
  "whatToAvoid": [
    {{
      "issue": "<specific thing to avoid>",
      "example": "<example of this issue from the interview>",
      "alternative": "<what to do instead>"
    }}
  ],
  "keyTakeaways": [
    "<key takeaway 1>",
    "<key takeaway 2>",
    "<key takeaway 3>"
  ]
}}

Be specific, constructive, and provide actionable feedback. Focus on how well answers related to questions, communication effectiveness, and professional presentation."""

    try:
        response = call_ollama(prompt)
        if response:
            # Try to extract JSON from response
            # Ollama might return markdown code blocks
            if "```json" in response:
                json_start = response.find("```json") + 7
                json_end = response.find("```", json_start)
                response = response[json_start:json_end].strip()
            elif "```" in response:
                json_start = response.find("```") + 3
                json_end = response.find("```", json_start)
                response = response[json_start:json_end].strip()
            
            result = json.loads(response)
            return result
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON: {str(e)}", file=sys.stderr)
        print(f"Response was: {response[:500]}", file=sys.stderr)
    except Exception as e:
        print(f"Error generating summary: {str(e)}", file=sys.stderr)
    
    # Fallback response
    return generate_fallback_summary(qa_pairs)

def generate_fallback_summary(qa_pairs):
    """Generate a basic summary when AI analysis fails"""
    total_questions = len(qa_pairs)
    avg_fluency = sum(q.get('fluency_score', 0) for q in qa_pairs) / total_questions if total_questions > 0 else 0
    avg_content = sum(q.get('content_score', 0) for q in qa_pairs) / total_questions if total_questions > 0 else 0
    avg_clarity = sum(q.get('clarity', 0) for q in qa_pairs) / total_questions if total_questions > 0 else 0
    
    overall_score = (avg_fluency + avg_content + avg_clarity) / 3
    
    return {
        "summary": f"Interview completed with {total_questions} questions. Average performance scores: Fluency {avg_fluency:.1f}%, Content {avg_content:.1f}%, Clarity {avg_clarity:.1f}%.",
        "overallScore": int(overall_score),
        "strengths": [
            {
                "strength": "Completed all interview questions",
                "evidence": f"Answered {total_questions} questions during the interview"
            }
        ],
        "weaknesses": [
            {
                "weakness": "Detailed analysis pending",
                "evidence": "AI analysis unavailable, using basic scoring",
                "impact": "Limited feedback available"
            }
        ],
        "answerQualityAnalysis": {
            "overallAssessment": "Basic analysis completed. Detailed AI analysis was unavailable.",
            "communicationStyle": "Assessment pending detailed analysis",
            "contentRelevance": "Assessment pending detailed analysis",
            "examples": []
        },
        "recommendations": [
            {
                "category": "General",
                "recommendation": "Review your responses and practice more",
                "priority": "medium",
                "reason": "Improve overall interview performance"
            }
        ],
        "whatToAvoid": [
            {
                "issue": "Vague or incomplete answers",
                "example": "Ensure all answers are complete and specific",
                "alternative": "Provide specific examples and detailed responses"
            }
        ],
        "keyTakeaways": [
            "Complete all interview questions",
            "Focus on clear communication",
            "Provide specific examples in answers"
        ]
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input data provided"}), file=sys.stderr)
        sys.exit(1)
    
    try:
        input_data = json.loads(sys.argv[1])
        
        questions = input_data.get('questions', [])
        responses = input_data.get('responses', {})
        textAnalyses = input_data.get('textAnalyses', {})
        rubricScores = input_data.get('rubricScores', {})
        proctoringFeedback = input_data.get('proctoringFeedback', {})
        
        result = generate_comprehensive_summary(
            questions,
            responses,
            textAnalyses,
            rubricScores,
            proctoringFeedback
        )
        
        # Add proctoring feedback
        result['proctoringFeedback'] = proctoringFeedback
        
        print(json.dumps(result, indent=2))
        
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Error: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

