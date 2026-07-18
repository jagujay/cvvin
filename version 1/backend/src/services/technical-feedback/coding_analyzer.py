#!/usr/bin/env python3
"""
Coding Analyzer Service
Analyzes coding challenge results using Ollama.
"""
import sys
import json
import ollama


def analyze_coding_ollama(problem_data, solution_data, test_results):
    """
    Analyzes coding challenge results using the custom 'coding-analyzer' Ollama model.
    
    Args:
        problem_data: Problem object with id, title, description, difficulty, concepts, timeLimit
        solution_data: Solution object with code, language, timeTaken
        test_results: Test results with passed, total, cases array
    
    Returns:
        Analysis result as JSON string
    """
    # Prepare the prompt with all data including code for detailed analysis
    prompt = f"""Analyze the following coding challenge performance and provide comprehensive feedback in JSON format.

CODING CHALLENGE DATA:
Problem: {json.dumps(problem_data, indent=2)}
User's Code Solution: {json.dumps(solution_data, indent=2)}
Test Results: {json.dumps(test_results, indent=2)}

Please provide a detailed analysis in the following JSON format:
{{
  "problemAnalysis": {{
    "problemId": "<id>",
    "problemTitle": "<title>",
    "difficulty": "<difficulty>",
    "concepts": ["<concept1>", "<concept2>"],
    "expectedTime": <number>,
    "complexity": "<expected complexity>"
  }},
  "solutionStatus": {{
    "isSolved": <boolean>,
    "isFullySolved": <boolean>,
    "testCasesPassed": <number>,
    "testCasesTotal": <number>,
    "testCasesPassedPercentage": <number>,
    "status": "<Accepted|Partial|Wrong Answer|Error>"
  }},
  "codeQuality": {{
    "readability": "<excellent|good|fair|poor>",
    "structure": "<excellent|good|fair|poor>",
    "naming": "<excellent|good|fair|poor>",
    "comments": <boolean>,
    "errorHandling": "<excellent|good|fair|poor>",
    "edgeCaseHandling": "<excellent|good|fair|poor>",
    "overallQuality": "<excellent|good|fair|poor>",
    "qualityScore": <number 0-100>,
    "timeComplexity": "<O(n)>",
    "spaceComplexity": "<O(n)>"
  }},
  "errorAnalysis": {{
    "failedTestCases": [
      {{
        "testCase": "<test case details>",
        "expectedOutput": "<expected>",
        "actualOutput": "<actual>",
        "errorType": "<logic|syntax|edge_case|timeout|runtime>",
        "errorReason": "<why the test case failed>",
        "codeLocation": "<where in code the issue is>",
        "whatToDo": "<specific fix for this error>",
        "whatNotToDo": "<what mistake to avoid>",
        "correctApproach": "<how to solve this correctly>"
      }}
    ],
    "codeIssues": [
      {{
        "issue": "<specific issue>",
        "severity": "<high|medium|low>",
        "location": "<line/function>",
        "impact": "<how this affects the solution>",
        "fix": "<how to fix this>"
      }}
    ],
    "commonMistakes": ["<mistake1>", "<mistake2>"],
    "errorPatterns": "<patterns observed in errors>"
  }},
  "timeAnalysis": {{
    "timeTaken": <number>,
    "timeLimit": <number>,
    "timeRemaining": <number>,
    "timeEfficiency": "<excellent|good|fair|poor>",
    "assessment": "<assessment of time management>"
  }},
  "testCaseBreakdown": [
    {{
      "testCase": "<test case>",
      "passed": <boolean>,
      "input": "<input>",
      "expected": "<expected>",
      "actual": "<actual>",
      "error": "<error if any>"
    }}
  ],
  "reviewComponent": {{
    "codingQuestion": "<problem description>",
    "userSubmittedCode": "<full code>",
    "testCaseBreakdown": [<test cases>]
  }},
  "recommendations": {{
    "howToImprove": [
      {{
        "title": "<recommendation title>",
        "description": "<detailed recommendation>",
        "priority": "<high|medium|low>",
        "actionable": "<specific action items>",
        "codeExample": "<example code if applicable>"
      }}
    ],
    "whatNotToDo": [
      {{
        "mistake": "<common coding mistake>",
        "whyAvoid": "<why to avoid this>",
        "betterApproach": "<what to do instead>",
        "example": "<example of mistake>"
      }}
    ],
    "whatToDoFromErrors": [
      {{
        "errorType": "<type of error>",
        "correctApproach": "<how to handle correctly>",
        "practiceSuggestions": ["<suggestion1>", "<suggestion2>"],
        "codeFix": "<corrected code snippet>"
      }}
    ]
  }},
  "suggestions": [
    {{
      "suggestion": "<specific recommendation>",
      "category": "<category>",
      "priority": "<high|medium|low>"
    }}
  ],
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "overallScore": <number 0-100>,
  "summary": "<comprehensive summary of performance>"
}}

IMPORTANT:
- Analyze the actual code provided and identify specific issues
- For each failed test case, explain why it failed and how to fix it
- Provide specific "what to do" and "what not to do" for each error
- Include code examples and fixes where applicable
- Focus on actionable recommendations for improvement
- Analyze code quality, complexity, and best practices
"""

    try:
        client = ollama.Client()
        # Use the custom model we created
        try:
            response = client.generate(model="coding-analyzer", prompt=prompt)
            if response and 'response' in response:
                return response['response']
            else:
                print(f"ERROR: Invalid response from Ollama: {response}", file=sys.stderr)
                return None
        except Exception as model_error:
            error_str = str(model_error).lower()
            # If model doesn't exist, try with base model
            if "model" in error_str and ("not found" in error_str or "does not exist" in error_str):
                print(f"WARNING: coding-analyzer model not found. Error: {model_error}", file=sys.stderr)
                print(f"INFO: To create the model, run: ollama create coding-analyzer -f Trial/Modelfile-Coding-Analysis", file=sys.stderr)
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
    
    # Fix unclosed strings (basic attempt)
    # This is a simple fix - may not handle all cases
    quote_count = text.count('"') - text.count('\\"')
    if quote_count % 2 != 0:
        # Odd number of quotes - try to close the last string
        last_quote = text.rfind('"')
        if last_quote > 0 and text[last_quote-1] != '\\':
            # Check if we're in a string context
            before = text[:last_quote]
            escaped_quotes = before.count('\\"')
            if (before.count('"') - escaped_quotes) % 2 == 1:
                # We're in a string, try to close it
                text = text[:last_quote+1] + '"' + text[last_quote+1:]
    
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
                # Find the first { and try to extract a complete object
                start_idx = text.find('{')
                if start_idx != -1:
                    # Try to find a complete JSON object
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
                
                # If all else fails, return a basic structure
                print(f"WARNING: Failed to parse JSON response: {e}", file=sys.stderr)
                print(f"Response text (first 1000 chars): {response_text[:1000]}", file=sys.stderr)
                
                # Return a fallback structure (this will be used)
                return {
                    "problemAnalysis": {
                        "problemId": "unknown",
                        "problemTitle": "Unknown",
                        "difficulty": "Unknown",
                        "concepts": [],
                        "expectedTime": 0,
                        "complexity": "Unknown"
                    },
                    "solutionStatus": {
                        "isSolved": False,
                        "isFullySolved": False,
                        "testCasesPassed": 0,
                        "testCasesTotal": 0,
                        "testCasesPassedPercentage": 0,
                        "status": "Error"
                    },
                    "timeAnalysis": {
                        "timeTaken": 0,
                        "timeLimit": 0,
                        "timeRemaining": 0,
                        "timeEfficiency": "unknown",
                        "assessment": "Unable to analyze due to parsing error"
                    },
                    "codeQuality": {
                        "readability": "unknown",
                        "structure": "unknown",
                        "naming": "unknown",
                        "comments": False,
                        "errorHandling": "unknown",
                        "edgeCaseHandling": "unknown",
                        "overallQuality": "unknown",
                        "qualityScore": 0
                    },
                    "errorAnalysis": {
                        "failedTestCases": [],
                        "codeIssues": [],
                        "commonMistakes": [],
                        "errorPatterns": ""
                    },
                    "recommendations": {
                        "howToImprove": [],
                        "whatNotToDo": [],
                        "whatToDoFromErrors": []
                    },
                    "overallScore": 0,
                    "summary": "Analysis failed due to JSON parsing error. Please try again."
                }
    except Exception as e:
        print(f"ERROR: Unexpected error parsing JSON: {e}", file=sys.stderr)
        # Return fallback structure even on unexpected errors
        return {
            "problemAnalysis": {
                "problemId": "unknown",
                "problemTitle": "Unknown",
                "difficulty": "Unknown",
                "concepts": [],
                "expectedTime": 0,
                "complexity": "Unknown"
            },
            "solutionStatus": {
                "isSolved": False,
                "isFullySolved": False,
                "testCasesPassed": 0,
                "testCasesTotal": 0,
                "testCasesPassedPercentage": 0,
                "status": "Error"
            },
            "timeAnalysis": {
                "timeTaken": 0,
                "timeLimit": 0,
                "timeRemaining": 0,
                "timeEfficiency": "unknown",
                "assessment": "Unable to analyze due to parsing error"
            },
            "codeQuality": {
                "readability": "unknown",
                "structure": "unknown",
                "naming": "unknown",
                "comments": False,
                "errorHandling": "unknown",
                "edgeCaseHandling": "unknown",
                "overallQuality": "unknown",
                "qualityScore": 0
            },
            "errorAnalysis": {
                "failedTestCases": [],
                "codeIssues": [],
                "commonMistakes": [],
                "errorPatterns": ""
            },
            "recommendations": {
                "howToImprove": [],
                "whatNotToDo": [],
                "whatToDoFromErrors": []
            },
            "overallScore": 0,
            "summary": "Analysis failed due to unexpected error. Please try again."
        }


# MAIN EXECUTION
if __name__ == "__main__":
    # Accept JSON data from stdin
    if len(sys.argv) < 2:
        print("ERROR: Usage: python coding_analyzer.py <json_data>", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Parse input JSON
        input_data = json.loads(sys.argv[1])
        problem = input_data.get('problem', {})
        solution = input_data.get('solution', {})
        test_results = input_data.get('testResults', {})
        
        if not problem:
            print("ERROR: No problem data provided", file=sys.stderr)
            sys.exit(1)
        
        if not solution:
            print("ERROR: No solution data provided", file=sys.stderr)
            sys.exit(1)
        
        # Analyze coding results
        result_text = analyze_coding_ollama(problem, solution, test_results)
        
        # Extract actual test results for fallback
        test_passed = test_results.get('passed', 0)
        test_total = test_results.get('total', 0)
        test_cases = test_results.get('cases', [])
        score = int((test_passed / test_total * 100)) if test_total > 0 else 0
        
        if not result_text:
            print("WARNING: Ollama analysis failed, generating basic response from test results", file=sys.stderr)
            # Generate a basic response based on test results
            
            result_json = {
                "problemAnalysis": {
                    "problemId": problem.get('id', 'unknown'),
                    "problemTitle": problem.get('title', 'Unknown'),
                    "difficulty": problem.get('difficulty', 'Unknown'),
                    "concepts": problem.get('concepts', []),
                    "expectedTime": problem.get('timeLimit', 0),
                    "complexity": "Analysis unavailable"
                },
                "solutionStatus": {
                    "isSolved": test_passed > 0,
                    "isFullySolved": test_passed == test_total and test_total > 0,
                    "testCasesPassed": test_passed,
                    "testCasesTotal": test_total,
                    "testCasesPassedPercentage": score,
                    "status": "Accepted" if test_passed == test_total and test_total > 0 else ("Partial" if test_passed > 0 else "Wrong Answer")
                },
                "reviewComponent": {
                    "codingQuestion": problem.get('description', ''),
                    "userSubmittedCode": solution.get('code', ''),
                    "testCaseBreakdown": test_cases if test_cases else []
                },
                "timeAnalysis": {
                    "timeTaken": solution.get('timeTaken', 0),
                    "timeLimit": problem.get('timeLimit', 0),
                    "timeRemaining": max(0, problem.get('timeLimit', 0) - solution.get('timeTaken', 0)),
                    "timeEfficiency": "unknown",
                    "assessment": "Analysis unavailable - Ollama service not responding"
                },
                "codeQuality": {
                    "readability": "unknown",
                    "structure": "unknown",
                    "naming": "unknown",
                    "comments": False,
                    "errorHandling": "unknown",
                    "edgeCaseHandling": "unknown",
                    "overallQuality": "unknown",
                    "qualityScore": 0
                },
                "errorAnalysis": {
                    "failedTestCases": [],
                    "codeIssues": [],
                    "commonMistakes": [],
                    "errorPatterns": ""
                },
                "recommendations": {
                    "howToImprove": [],
                    "whatNotToDo": [],
                    "whatToDoFromErrors": []
                },
                "overallScore": score,
                "summary": f"Basic analysis: {test_passed}/{test_total} test cases passed. Detailed analysis unavailable."
            }
        else:
            # Parse JSON response
            result_json = parse_json_response(result_text)
            
            # If parsing failed but we have test results, enhance the fallback with actual data
            if not result_json or result_json.get('overallScore', 0) == 0 and result_json.get('summary', '').startswith('Analysis failed'):
                print("WARNING: JSON parsing failed, using test results to generate analysis", file=sys.stderr)
                # Use actual test results to create a meaningful response
                result_json = {
                    "problemAnalysis": {
                        "problemId": problem.get('id', 'unknown'),
                        "problemTitle": problem.get('title', 'Unknown'),
                        "difficulty": problem.get('difficulty', 'Unknown'),
                        "concepts": problem.get('concepts', []),
                        "expectedTime": problem.get('timeLimit', 0),
                        "complexity": "Analysis unavailable"
                    },
                    "solutionStatus": {
                        "isSolved": test_passed > 0,
                        "isFullySolved": test_passed == test_total and test_total > 0,
                        "testCasesPassed": test_passed,
                        "testCasesTotal": test_total,
                        "testCasesPassedPercentage": score,
                        "status": "Accepted" if test_passed == test_total and test_total > 0 else ("Partial" if test_passed > 0 else "Wrong Answer")
                    },
                    "timeAnalysis": {
                        "timeTaken": solution.get('timeTaken', 0),
                        "timeLimit": problem.get('timeLimit', 0),
                        "timeRemaining": max(0, problem.get('timeLimit', 0) - solution.get('timeTaken', 0)),
                        "timeEfficiency": "unknown",
                        "assessment": f"Completed in {solution.get('timeTaken', 0)} seconds. Analysis unavailable - Ollama service not responding."
                    },
                    "codeQuality": {
                        "readability": "unknown",
                        "structure": "unknown",
                        "naming": "unknown",
                        "comments": False,
                        "errorHandling": "unknown",
                        "edgeCaseHandling": "unknown",
                        "overallQuality": "unknown",
                        "qualityScore": 0
                    },
                    "errorAnalysis": {
                        "failedTestCases": [],
                        "codeIssues": [],
                        "commonMistakes": [],
                        "errorPatterns": ""
                    },
                    "recommendations": {
                        "howToImprove": [],
                        "whatNotToDo": [],
                        "whatToDoFromErrors": []
                    },
                    "reviewComponent": {
                        "codingQuestion": problem.get('description', ''),
                        "userSubmittedCode": solution.get('code', ''),
                        "testCaseBreakdown": test_cases if test_cases else []
                    },
                    "suggestions": [
                        "Review the test cases that failed",
                        "Check edge cases and boundary conditions",
                        "Verify algorithm correctness"
                    ],
                    "overallScore": score,
                    "summary": f"Basic analysis: {test_passed}/{test_total} test cases passed ({score}%). Detailed LLM analysis unavailable."
                }
            
            # Always ensure we have the actual test case breakdown
            if 'reviewComponent' not in result_json or not result_json.get('reviewComponent', {}).get('testCaseBreakdown'):
                if 'reviewComponent' not in result_json:
                    result_json['reviewComponent'] = {}
                result_json['reviewComponent']['testCaseBreakdown'] = test_cases if test_cases else []
                result_json['reviewComponent']['codingQuestion'] = problem.get('description', '')
                result_json['reviewComponent']['userSubmittedCode'] = solution.get('code', '')
            
            if not result_json:
                print("WARNING: Failed to parse analysis result, using fallback", file=sys.stderr)
                # Generate basic fallback structure
                test_passed = test_results.get('passed', 0)
                test_total = test_results.get('total', 0)
                score = int((test_passed / test_total * 100)) if test_total > 0 else 0
                
                result_json = {
                    "problemAnalysis": {
                        "problemId": problem.get('id', 'unknown'),
                        "problemTitle": problem.get('title', 'Unknown'),
                        "difficulty": problem.get('difficulty', 'Unknown'),
                        "concepts": problem.get('concepts', []),
                        "expectedTime": problem.get('timeLimit', 0),
                        "complexity": "Analysis unavailable"
                    },
                    "solutionStatus": {
                        "isSolved": test_passed > 0,
                        "isFullySolved": test_passed == test_total and test_total > 0,
                        "testCasesPassed": test_passed,
                        "testCasesTotal": test_total,
                        "testCasesPassedPercentage": score,
                        "status": "Accepted" if test_passed == test_total else "Partial"
                    },
                    "timeAnalysis": {
                        "timeTaken": solution.get('timeTaken', 0),
                        "timeLimit": problem.get('timeLimit', 0),
                        "timeRemaining": max(0, problem.get('timeLimit', 0) - solution.get('timeTaken', 0)),
                        "timeEfficiency": "unknown",
                        "assessment": "Analysis unavailable - JSON parsing failed"
                    },
                    "codeQuality": {
                        "readability": "unknown",
                        "structure": "unknown",
                        "naming": "unknown",
                        "comments": False,
                        "errorHandling": "unknown",
                        "edgeCaseHandling": "unknown",
                        "overallQuality": "unknown",
                        "qualityScore": 0
                    },
                    "errorAnalysis": {
                        "failedTestCases": [],
                        "codeIssues": [],
                        "commonMistakes": [],
                        "errorPatterns": ""
                    },
                    "recommendations": {
                        "howToImprove": [],
                        "whatNotToDo": [],
                        "whatToDoFromErrors": []
                    },
                    "overallScore": score,
                    "summary": f"Basic analysis: {test_passed}/{test_total} test cases passed. Detailed LLM analysis unavailable due to parsing error."
                }
        
        # Output JSON to stdout
        print(json.dumps(result_json, indent=2))
        
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

