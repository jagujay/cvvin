#!/usr/bin/env python3
"""
MCQ Analyzer Service
Analyzes MCQ test results using Ollama.
"""
import sys
import json
import ollama


def analyze_mcq_ollama(questions_data, answers_data, time_data):
    """
    Analyzes MCQ results using the custom 'mcq-analyzer' Ollama model.
    
    Args:
        questions_data: List of question objects with id, question, options, correctAnswer, category, difficulty
        answers_data: Dictionary mapping question_id to selected answer index
        time_data: Dictionary mapping question_id to time taken in seconds
    
    Returns:
        Analysis result as JSON string
    """
    # Prepare the prompt with all data including user answers for detailed analysis
    prompt = f"""Analyze the following MCQ test performance and provide comprehensive feedback in JSON format.

MCQ TEST DATA:
Questions: {json.dumps(questions_data, indent=2)}
User Answers: {json.dumps(answers_data, indent=2)}
Time Taken (seconds): {json.dumps(time_data, indent=2)}

Please provide a detailed analysis in the following JSON format:
{{
  "overallScore": <number 0-100>,
  "correctAnswers": <number>,
  "totalQuestions": <number>,
  "totalTimeTaken": <number>,
  "averageTimePerQuestion": <number>,
  "performanceByCategory": {{
    "<category>": {{
      "score": <number>,
      "correct": <number>,
      "total": <number>
    }}
  }},
  "performanceByDifficulty": {{
    "<difficulty>": {{
      "score": <number>,
      "correct": <number>,
      "total": <number>
    }}
  }},
  "timeAnalysis": {{
    "fastCorrect": [<question_ids>],
    "slowCorrect": [<question_ids>],
    "fastIncorrect": [<question_ids>],
    "slowIncorrect": [<question_ids>],
    "pacingAssessment": "<assessment text>",
    "timeManagementSuggestions": ["<suggestion1>", "<suggestion2>"]
  }},
  "conceptAnalysis": {{
    "strongConcepts": ["<concept1>", "<concept2>"],
    "weakConcepts": ["<concept1>", "<concept2>"],
    "knowledgeGaps": ["<gap1>", "<gap2>"]
  }},
  "errorAnalysis": {{
    "incorrectAnswers": [
      {{
        "questionId": "<id>",
        "question": "<question text>",
        "userAnswer": "<user's answer>",
        "correctAnswer": "<correct answer>",
        "errorType": "<conceptual|calculation|misunderstanding|careless>",
        "errorReason": "<why the error occurred>",
        "correctConcept": "<the correct concept/approach>",
        "whatToDo": "<specific action to fix this error>",
        "whatNotToDo": "<what mistake to avoid>"
      }}
    ],
    "commonMistakes": ["<mistake1>", "<mistake2>"],
    "errorPatterns": "<patterns observed in errors>"
  }},
  "suggestions": [
    {{
      "suggestion": "<specific recommendation>",
      "category": "<category>",
      "priority": "<high|medium|low>",
      "reason": "<why this recommendation>"
    }}
  ],
  "reviewTable": [
    {{
      "questionId": "<id>",
      "question": "<question text>",
      "options": ["<option1>", "<option2>", ...],
      "userAnswerIndex": <number>,
      "userAnswerText": "<selected option>",
      "correctAnswerIndex": <number>,
      "correctAnswerText": "<correct option>",
      "isCorrect": <boolean>,
      "timeTaken": <number>,
      "explanation": "<why this is correct/incorrect>"
    }}
  ],
  "recommendations": {{
    "howToImprove": [
      {{
        "title": "<recommendation title>",
        "description": "<detailed recommendation>",
        "priority": "<high|medium|low>",
        "actionable": "<specific action items>"
      }}
    ],
    "whatNotToDo": [
      {{
        "mistake": "<common mistake>",
        "whyAvoid": "<why to avoid this>",
        "betterApproach": "<what to do instead>"
      }}
    ],
    "whatToDoFromErrors": [
      {{
        "errorType": "<type of error>",
        "correctApproach": "<how to handle correctly>",
        "practiceSuggestions": ["<suggestion1>", "<suggestion2>"]
      }}
    ]
  }},
  "summary": "<comprehensive summary of performance>"
}}

IMPORTANT:
- Analyze each incorrect answer and explain why it's wrong
- Provide specific "what to do" and "what not to do" for each error
- Include all user answers and questions in the analysis
- Focus on actionable recommendations for improvement
- Identify patterns in errors and suggest targeted practice
"""

    try:
        client = ollama.Client()
        # Use the custom model we created
        try:
            response = client.generate(model="mcq-analyzer", prompt=prompt)
            if response and 'response' in response:
                return response['response']
            else:
                print(f"ERROR: Invalid response from Ollama: {response}", file=sys.stderr)
                return None
        except Exception as model_error:
            error_str = str(model_error).lower()
            # If model doesn't exist, try with base model
            if "model" in error_str and ("not found" in error_str or "does not exist" in error_str):
                print(f"WARNING: mcq-analyzer model not found. Error: {model_error}", file=sys.stderr)
                print(f"INFO: To create the model, run: ollama create mcq-analyzer -f Trial/Modelfile-MCQ-Analysis", file=sys.stderr)
                try:
                    # Try with base model as fallback
                    print(f"INFO: Attempting fallback to llama3.2", file=sys.stderr)
                    response = client.generate(model="llama3.2", prompt=prompt + "\n\nIMPORTANT: Return ONLY valid JSON in the format specified in the system prompt.")
                    if response and 'response' in response:
                        return response['response']
                except Exception as fallback_error:
                    print(f"ERROR: Fallback to llama3.2 also failed: {fallback_error}", file=sys.stderr)
            else:
                print(f"ERROR: Unexpected error from Ollama: {model_error}", file=sys.stderr)
            raise model_error
    except ConnectionError as e:
        print(f"ERROR: Cannot connect to Ollama service. Is Ollama running?", file=sys.stderr)
        print(f"ERROR: Start Ollama with: ollama serve", file=sys.stderr)
        print(f"ERROR: Connection error details: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"ERROR: Error communicating with Ollama: {e}", file=sys.stderr)
        print(f"ERROR: Error type: {type(e).__name__}", file=sys.stderr)
        return None


def extract_json_from_text(text):
    """Extract JSON object from text, handling markdown and other formatting."""
    text = text.strip()
    
    # Remove markdown code blocks
    if '```json' in text:
        start = text.find('```json') + 7
        end = text.find('```', start)
        if end != -1:
            text = text[start:end].strip()
    elif '```' in text:
        start = text.find('```') + 3
        end = text.find('```', start)
        if end != -1:
            text = text[start:end].strip()
    
    # Find JSON object boundaries
    if text.startswith('{'):
        # Find the matching closing brace
        brace_count = 0
        end_pos = -1
        for i, char in enumerate(text):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_pos = i + 1
                    break
        if end_pos > 0:
            text = text[:end_pos]
    
    return text.strip()


def repair_json(text):
    """Attempt to repair common JSON issues."""
    import re
    
    # Remove trailing commas before } or ]
    text = re.sub(r',(\s*[}\]])', r'\1', text)
    
    return text


def parse_json_response(response_text):
    """Parse JSON from Ollama response, handling potential markdown code blocks and errors."""
    try:
        # Extract JSON from text
        text = extract_json_from_text(response_text)
        
        # Try to parse directly first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try repairing common issues
            repaired = repair_json(text)
            try:
                return json.loads(repaired)
            except json.JSONDecodeError as e:
                # Last resort: try to extract a valid JSON object
                start_idx = text.find('{')
                if start_idx != -1:
                    brace_count = 0
                    end_idx = -1
                    for i in range(start_idx, len(text)):
                        if text[i] == '{':
                            brace_count += 1
                        elif text[i] == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                end_idx = i + 1
                                break
                    
                    if end_idx > start_idx:
                        partial_json = text[start_idx:end_idx]
                        try:
                            return json.loads(partial_json)
                        except:
                            pass
                
                print(f"ERROR: Failed to parse JSON response: {e}", file=sys.stderr)
                print(f"Response text (first 1000 chars): {response_text[:1000]}", file=sys.stderr)
                
                # Return a fallback structure
                return {
                    "overallScore": 0,
                    "correctAnswers": 0,
                    "totalQuestions": 0,
                    "totalTimeTaken": 0,
                    "averageTimePerQuestion": 0,
                    "performanceByCategory": {},
                    "performanceByDifficulty": {},
                    "timeAnalysis": {},
                    "conceptAnalysis": {
                        "strongConcepts": [],
                        "weakConcepts": [],
                        "knowledgeGaps": []
                    },
                    "errorAnalysis": {
                        "incorrectAnswers": [],
                        "commonMistakes": [],
                        "errorPatterns": ""
                    },
                    "suggestions": [],
                    "reviewTable": [],
                    "recommendations": {
                        "howToImprove": [],
                        "whatNotToDo": [],
                        "whatToDoFromErrors": []
                    },
                    "summary": "Analysis failed due to JSON parsing error. Please try again."
                }
    except Exception as e:
        print(f"ERROR: Unexpected error parsing JSON: {e}", file=sys.stderr)
        # Return fallback structure even on unexpected errors
        return {
            "overallScore": 0,
            "correctAnswers": 0,
            "totalQuestions": 0,
            "totalTimeTaken": 0,
            "averageTimePerQuestion": 0,
            "performanceByCategory": {},
            "performanceByDifficulty": {},
            "timeAnalysis": {},
            "conceptAnalysis": {
                "strongConcepts": [],
                "weakConcepts": [],
                "knowledgeGaps": []
            },
            "errorAnalysis": {
                "incorrectAnswers": [],
                "commonMistakes": [],
                "errorPatterns": ""
            },
            "suggestions": [],
            "reviewTable": [],
            "recommendations": {
                "howToImprove": [],
                "whatNotToDo": [],
                "whatToDoFromErrors": []
            },
            "summary": "Analysis failed due to unexpected error. Please try again."
        }


# MAIN EXECUTION
if __name__ == "__main__":
    # Accept JSON data from stdin
    if len(sys.argv) < 2:
        print("ERROR: Usage: python mcq_analyzer.py <json_data>", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Parse input JSON
        input_data = json.loads(sys.argv[1])
        questions = input_data.get('questions', [])
        answers = input_data.get('answers', {})
        time_taken = input_data.get('timeTaken', {})
        
        if not questions:
            print("ERROR: No questions provided", file=sys.stderr)
            sys.exit(1)
        
        # Calculate basic stats from actual data
        total_questions = len(questions)
        total_time = sum(time_taken.values()) if time_taken else 0
        correct_count = 0
        review_table = []
        missing_correct_answers = []
        unanswered_questions = []
        
        for q in questions:
            q_id = q.get('id', '')
            user_answer = answers.get(q_id, -1)
            correct_answer = q.get('correctAnswer', None)
            
            # Validation: Check if correctAnswer exists
            if correct_answer is None:
                missing_correct_answers.append(q_id)
                print(f"WARNING: Question {q_id} missing 'correctAnswer' field", file=sys.stderr)
                correct_answer = -1  # Use -1 as fallback
            
            # Check if question was answered
            if user_answer == -1 or user_answer is None:
                unanswered_questions.append(q_id)
            
            # Only mark as correct if both answers are valid and match
            is_correct = False
            if user_answer != -1 and correct_answer != -1 and user_answer == correct_answer:
                is_correct = True
                correct_count += 1
            
            # Get user answer text and correct answer text
            options = q.get('options', [])
            user_answer_text = options[user_answer] if user_answer >= 0 and user_answer < len(options) else "Not answered"
            correct_answer_text = options[correct_answer] if correct_answer >= 0 and correct_answer < len(options) else "Unknown"
            
            review_table.append({
                "questionId": q_id,
                "question": q.get('question', ''),
                "options": options,
                "userAnswerIndex": user_answer,
                "userAnswerText": user_answer_text,
                "correctAnswerIndex": correct_answer,
                "correctAnswerText": correct_answer_text,
                "isCorrect": is_correct,
                "timeTaken": time_taken.get(q_id, 0) if time_taken else 0,
                "explanation": q.get('explanation', 'No explanation available.')
            })
        
        # Log validation issues
        if missing_correct_answers:
            print(f"ERROR: {len(missing_correct_answers)} questions missing correctAnswer: {missing_correct_answers}", file=sys.stderr)
        if unanswered_questions:
            print(f"INFO: {len(unanswered_questions)} questions not answered: {unanswered_questions}", file=sys.stderr)
        
        basic_score = int((correct_count / total_questions * 100)) if total_questions > 0 else 0
        
        # Analyze MCQ results
        result_text = analyze_mcq_ollama(questions, answers, time_taken)
        
        if not result_text:
            print("WARNING: Ollama analysis failed, generating basic response from actual data", file=sys.stderr)
            # Generate basic response from actual data
            result_json = {
                "overallScore": basic_score,
                "correctAnswers": correct_count,
                "totalQuestions": total_questions,
                "totalTimeTaken": total_time,
                "averageTimePerQuestion": int(total_time / total_questions) if total_questions > 0 else 0,
                "performanceByCategory": {},
                "performanceByDifficulty": {},
                "timeAnalysis": {
                    "fastCorrect": [],
                    "slowCorrect": [],
                    "fastIncorrect": [],
                    "slowIncorrect": [],
                    "pacingAssessment": "Analysis unavailable",
                    "timeManagementSuggestions": []
                },
                "conceptAnalysis": {
                    "strongConcepts": [],
                    "weakConcepts": [],
                    "knowledgeGaps": []
                },
                "suggestions": [
                    "Review questions you answered incorrectly",
                    "Practice more questions in weak areas",
                    "Improve time management"
                ],
                "reviewTable": review_table,
                "summary": f"Basic analysis: {correct_count}/{total_questions} correct ({basic_score}%). Detailed LLM analysis unavailable."
            }
        else:
            # Parse JSON response
            result_json = parse_json_response(result_text)
            
            # If parsing failed, use actual data
            if not result_json or result_json.get('overallScore', 0) == 0 and result_json.get('summary', '').startswith('Analysis failed'):
                print("WARNING: JSON parsing failed, using actual test data", file=sys.stderr)
                result_json = {
                    "overallScore": basic_score,
                    "correctAnswers": correct_count,
                    "totalQuestions": total_questions,
                    "totalTimeTaken": total_time,
                    "averageTimePerQuestion": int(total_time / total_questions) if total_questions > 0 else 0,
                    "performanceByCategory": {},
                    "performanceByDifficulty": {},
                    "timeAnalysis": {
                        "fastCorrect": [],
                        "slowCorrect": [],
                        "fastIncorrect": [],
                        "slowIncorrect": [],
                        "pacingAssessment": "Analysis unavailable",
                        "timeManagementSuggestions": []
                    },
                    "conceptAnalysis": {
                        "strongConcepts": [],
                        "weakConcepts": [],
                        "knowledgeGaps": []
                    },
                    "suggestions": [
                        "Review questions you answered incorrectly",
                        "Practice more questions in weak areas",
                        "Improve time management"
                    ],
                    "reviewTable": review_table,
                    "summary": f"Basic analysis: {correct_count}/{total_questions} correct ({basic_score}%). Detailed LLM analysis unavailable."
                }
            
            # Always ensure we have the actual review table
            if not result_json.get('reviewTable') or len(result_json.get('reviewTable', [])) == 0:
                result_json['reviewTable'] = review_table
            if result_json.get('correctAnswers', 0) == 0 and correct_count > 0:
                result_json['correctAnswers'] = correct_count
            if result_json.get('totalQuestions', 0) == 0 and total_questions > 0:
                result_json['totalQuestions'] = total_questions
            if result_json.get('overallScore', 0) == 0 and basic_score > 0:
                result_json['overallScore'] = basic_score
        
        # Output JSON to stdout
        print(json.dumps(result_json, indent=2))
        
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

