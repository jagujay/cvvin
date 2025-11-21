/**
 * Code Wrapper Utilities
 * Converts LeetCode-style function code to stdin/stdout based execution
 */

export const wrapCodeForExecution = (code: string, language: string): string => {
  switch (language) {
    case 'python':
      return wrapPythonCode(code);
    case 'javascript':
      return wrapJavaScriptCode(code);
    case 'java':
      return wrapJavaCode(code);
    case 'cpp':
    case 'c':
      return wrapCppCode(code);
    default:
      return code;
  }
};

const wrapPythonCode = (code: string): string => {
  // Check if it's already a complete script
  if (code.includes('sys.stdin') || code.includes('input()')) {
    return code;
  }

  // Extract function from LeetCode-style code
  const functionMatch = code.match(/def\s+(\w+)\s*\([^)]*\)\s*:/);
  if (!functionMatch) {
    return `import sys\n\n${code}\n\n# Main execution\nif __name__ == "__main__":\n    target = int(sys.stdin.readline())\n    nums = [int(n) for n in sys.stdin.readline().split(',')]\n    solution = Solution()\n    result = solution.twoSum(nums, target)\n    print(','.join(map(str, result)))`;
  }

  // If it's a Solution class method
  if (code.includes('class Solution')) {
    return `import sys\n\n${code}\n\n# Main execution\nif __name__ == "__main__":\n    target = int(sys.stdin.readline())\n    nums = [int(n) for n in sys.stdin.readline().split(',')]\n    solution = Solution()\n    result = solution.twoSum(nums, target)\n    print(','.join(map(str, result)))`;
  }

  return code;
};

const wrapJavaScriptCode = (code: string): string => {
  // Check if it's already a complete script
  if (code.includes('process.stdin') || code.includes('readline')) {
    return code;
  }

  // Extract function from LeetCode-style code
  const functionMatch = code.match(/(?:var|const|function)\s+(\w+)\s*=\s*function|function\s+(\w+)\s*\(/);
  
  let functionName = 'twoSum';
  if (functionMatch) {
    functionName = functionMatch[1] || functionMatch[2] || 'twoSum';
  }

  return `const readline = require('readline');\n\nconst rl = readline.createInterface({\n  input: process.stdin,\n  output: process.stdout,\n  terminal: false\n});\n\nlet lines = [];\nrl.on('line', line => lines.push(line));\n\nrl.on('close', () => {\n    const target = parseInt(lines[0]);\n    const nums = lines[1].split(',').map(Number);\n    \n    ${code}\n    \n    const result = ${functionName}(nums, target);\n    console.log(result.join(','));\n});`;
};

const wrapJavaCode = (code: string): string => {
  // Check if it's already a complete class with main
  if (code.includes('public static void main')) {
    return code;
  }

  // Extract method from Solution class
  if (code.includes('class Solution')) {
    return `import java.util.Scanner;\n\n${code}\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int target = sc.nextInt();\n        sc.nextLine(); // consume newline\n        String[] numsStr = sc.nextLine().split(",");\n        int[] nums = new int[numsStr.length];\n        for (int i = 0; i < numsStr.length; i++) {\n            nums[i] = Integer.parseInt(numsStr[i].trim());\n        }\n        Solution solution = new Solution();\n        int[] result = solution.twoSum(nums, target);\n        System.out.println(result[0] + "," + result[1]);\n    }\n}`;
  }

  return code;
};

const wrapCppCode = (code: string): string => {
  // Check if it's already a complete program
  if (code.includes('int main()')) {
    return code;
  }

  // Extract method from Solution class
  if (code.includes('class Solution')) {
    return `#include <iostream>\n#include <vector>\n#include <string>\n#include <sstream>\n\n${code}\n\nint main() {\n    int target;\n    std::cin >> target;\n    std::cin.ignore(); // consume newline\n    \n    std::string line;\n    std::getline(std::cin, line);\n    std::stringstream ss(line);\n    std::vector<int> nums;\n    std::string num;\n    \n    while (std::getline(ss, num, ',')) {\n        nums.push_back(std::stoi(num));\n    }\n    \n    Solution solution;\n    std::vector<int> result = solution.twoSum(nums, target);\n    std::cout << result[0] << "," << result[1] << std::endl;\n    \n    return 0;\n}`;
  }

  return code;
};





















