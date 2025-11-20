const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let lines = [];
rl.on('line', line => lines.push(line));

rl.on('close', () => {
    const target = parseInt(lines[0]);
    const nums = lines[1].split(',').map(Number);
    
    /**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Write your solution here
    // Example: Use a hash map to find pairs
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
};
    
    const result = twoSum(nums, target);
    console.log(result.join(','));
});