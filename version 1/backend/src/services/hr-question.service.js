const fs = require('fs').promises;
const path = require('path');
const Logger = require('../utils/logger.utils');

/**
 * HR Question Service
 * Handles question selection for HR interviews (fixed and dynamic modes)
 */
class HRQuestionService {
  constructor() {
    this.questionsFilePath = path.join(__dirname, '..', 'data', 'hr-questions.json');
    this.questions = null;
  }

  /**
   * Load questions from JSON file
   * @returns {Promise<Array>} Array of questions
   */
  async loadQuestions() {
    if (this.questions) {
      return this.questions;
    }

    try {
      const data = await fs.readFile(this.questionsFilePath, 'utf-8');
      const jsonData = JSON.parse(data);
      this.questions = jsonData.questions || [];
      return this.questions;
    } catch (error) {
      Logger.error('Failed to load HR questions', { error: error.message });
      throw new Error('Failed to load HR questions dataset');
    }
  }

  /**
   * Check if a question is suitable for beginners (no work experience required)
   * @param {Object} question - Question object
   * @returns {boolean} True if suitable for beginners
   */
  isSuitableForBeginners(question) {
    if (!question || !question.question) return false;
    
    const questionText = question.question.toLowerCase();
    
    // Keywords that indicate the question requires work experience
    const experienceKeywords = [
      'many jobs',
      'multiple jobs',
      'job hopping',
      'why are you leaving',
      'why did you leave',
      'previous job',
      'previous role',
      'previous position',
      'previous employer',
      'resigned',
      'fired',
      'terminated',
      'work experience',
      'professional experience',
      'career history',
      'job history',
      'employment history'
    ];
    
    // Check if question contains any experience-related keywords
    for (const keyword of experienceKeywords) {
      if (questionText.includes(keyword)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get or create "Tell me about yourself" question
   * @returns {Object} Question object
   */
  getIntroductionQuestion() {
    return {
      id: 'hr_intro_001',
      category: 'Introduction',
      question: "Tell me about yourself.",
      followUps: [
        "What interests you most about this role?",
        "How does this role align with your career goals?"
      ],
      tips: [
        "Keep your answer concise and relevant (2-3 minutes)",
        "Focus on your background, skills, and what makes you unique",
        "Connect your experience to the role you're applying for",
        "Show enthusiasm and genuine interest"
      ],
      timeLimit: 90, // 1.5 minutes total (30s prep + 60s recording)
      rubric: {
        clarity: {
          weight: 25,
          description: "Clear communication and well-structured response"
        },
        relevance: {
          weight: 30,
          description: "Response relevance to the role and company"
        },
        confidence: {
          weight: 20,
          description: "Confidence and enthusiasm in delivery"
        },
        professionalism: {
          weight: 25,
          description: "Professional tone and appropriate content"
        }
      }
    };
  }

  /**
   * Get fixed set of questions in specific order
   * @returns {Array} Fixed questions array
   */
  getFixedQuestionSet() {
    const introQuestion = this.getIntroductionQuestion();
    
    // Fixed questions in exact order as specified
    const fixedQuestions = [
      introQuestion,
      {
        id: 'hr_fixed_001',
        category: 'Career Development',
        question: 'How could you have improved your career progress?',
        followUps: [],
        tips: [
          'Be honest but positive',
          'Focus on learning and growth opportunities',
          'Show self-awareness and willingness to improve'
        ],
        timeLimit: 90,
        rubric: {
          clarity: { weight: 25, description: 'Clear communication and well-structured response' },
          relevance: { weight: 30, description: 'Response relevance to career development' },
          confidence: { weight: 20, description: 'Confidence and self-awareness in delivery' },
          professionalism: { weight: 25, description: 'Professional tone and appropriate content' }
        }
      },
      {
        id: 'hr_fixed_002',
        category: 'Strengths',
        question: 'What are your greatest strengths?',
        followUps: [],
        tips: [
          'Choose strengths relevant to the role',
          'Provide specific examples',
          'Be confident but not arrogant'
        ],
        timeLimit: 90,
        rubric: {
          clarity: { weight: 25, description: 'Clear communication and well-structured response' },
          relevance: { weight: 30, description: 'Response relevance to the question and context' },
          confidence: { weight: 20, description: 'Confidence and enthusiasm in delivery' },
          professionalism: { weight: 25, description: 'Professional tone and appropriate content' }
        }
      },
      {
        id: 'hr_fixed_003',
        category: 'Weakness',
        question: 'What are your greatest weaknesses?',
        followUps: [],
        tips: [
          'Be honest but strategic',
          'Show self-awareness and improvement efforts',
          'Turn weaknesses into growth opportunities'
        ],
        timeLimit: 90,
        rubric: {
          clarity: { weight: 25, description: 'Clear communication and well-structured response' },
          relevance: { weight: 30, description: 'Response relevance to the question and context' },
          confidence: { weight: 20, description: 'Confidence and self-awareness in delivery' },
          professionalism: { weight: 25, description: 'Professional tone and appropriate content' }
        }
      },
      {
        id: 'hr_fixed_004',
        category: 'Creativity',
        question: 'Give me an example of your creativity',
        followUps: [],
        tips: [
          'Provide a specific, concrete example',
          'Explain the creative process and outcome',
          'Show how creativity benefits your work'
        ],
        timeLimit: 90,
        rubric: {
          clarity: { weight: 25, description: 'Clear communication and well-structured response' },
          relevance: { weight: 30, description: 'Response relevance with concrete examples' },
          confidence: { weight: 20, description: 'Confidence and enthusiasm in delivery' },
          professionalism: { weight: 25, description: 'Professional tone and appropriate content' }
        }
      },
      {
        id: 'hr_fixed_005',
        category: 'Entrepreneurship',
        question: 'Have you consider starting your own business?',
        followUps: [],
        tips: [
          'Be honest about your entrepreneurial interests',
          'Explain how it relates to your career goals',
          'Show commitment to the current role if applicable'
        ],
        timeLimit: 90,
        rubric: {
          clarity: { weight: 25, description: 'Clear communication and well-structured response' },
          relevance: { weight: 30, description: 'Response relevance to career goals' },
          confidence: { weight: 20, description: 'Confidence and honesty in delivery' },
          professionalism: { weight: 25, description: 'Professional tone and appropriate content' }
        }
      },
      {
        id: 'hr_fixed_006',
        category: 'Motivation',
        question: 'Why should the company hire you?',
        followUps: [],
        tips: [
          'Highlight unique value proposition',
          'Connect your skills to company needs',
          'Show enthusiasm and commitment'
        ],
        timeLimit: 90,
        rubric: {
          clarity: { weight: 25, description: 'Clear communication and well-structured response' },
          relevance: { weight: 30, description: 'Response relevance to the role and company' },
          confidence: { weight: 20, description: 'Confidence and enthusiasm in delivery' },
          professionalism: { weight: 25, description: 'Professional tone and appropriate content' }
        }
      }
    ];

    return fixedQuestions;
  }

  /**
   * Select fixed number of questions (now returns fixed set in specific order)
   * @param {number} count - Number of questions to select (ignored, always returns fixed set)
   * @param {Object} options - Selection options (ignored for fixed questions)
   * @returns {Promise<Array>} Selected questions in fixed order
   */
  async selectFixedQuestions(count = 5, options = {}) {
    // Always return the fixed question set in the specified order
    const fixedQuestions = this.getFixedQuestionSet();
    
    Logger.info('Selected fixed HR questions', {
      count: fixedQuestions.length,
      categories: [...new Set(fixedQuestions.map(q => q.category))],
      hasIntro: true,
      isFixedSet: true
    });

    return fixedQuestions;
  }

  /**
   * Select questions with category distribution
   * Ensures variety across different question types
   * @param {number} count - Total number of questions
   * @returns {Promise<Array>} Selected questions
   */
  async selectDistributedQuestions(count = 5) {
    await this.loadQuestions();

    // Always start with "Tell me about yourself"
    const introQuestion = this.getIntroductionQuestion();
    const selected = [introQuestion];
    const remainingCount = count - 1;

    // Filter out incomplete questions and beginner-inappropriate questions
    const validQuestions = this.questions.filter(q => {
      // Exclude the intro question (if it exists in the dataset)
      if (q.id === introQuestion.id || q.question.toLowerCase().includes('tell me about yourself')) {
        return false;
      }
      
      // Filter out incomplete questions
      if (!q.question || q.question.length < 20 || !q.question.includes('?')) {
        return false;
      }
      
      // Filter out questions not suitable for beginners
      if (!this.isSuitableForBeginners(q)) {
        return false;
      }
      
      return true;
    });

    // Group by category
    const byCategory = {};
    validQuestions.forEach(q => {
      if (!byCategory[q.category]) {
        byCategory[q.category] = [];
      }
      byCategory[q.category].push(q);
    });

    const categories = Object.keys(byCategory);
    const questionsPerCategory = Math.ceil(remainingCount / categories.length);

    // Select from each category
    for (const category of categories) {
      const categoryQuestions = byCategory[category];
      const shuffled = [...categoryQuestions].sort(() => Math.random() - 0.5);
      const toSelect = Math.min(questionsPerCategory, shuffled.length);
      
      for (let i = 0; i < toSelect && selected.length < count; i++) {
        selected.push(shuffled[i]);
      }
    }

    // If we need more, fill from any category
    if (selected.length < count) {
      const remaining = validQuestions.filter(q => !selected.includes(q));
      const shuffled = [...remaining].sort(() => Math.random() - 0.5);
      const needed = count - selected.length;
      
      for (let i = 0; i < needed && i < shuffled.length; i++) {
        selected.push(shuffled[i]);
      }
    }

    // Keep intro question first, shuffle the rest
    const restQuestions = selected.slice(1);
    restQuestions.sort(() => Math.random() - 0.5);
    const finalSelected = [introQuestion, ...restQuestions];

    Logger.info('Selected distributed HR questions', {
      count: finalSelected.length,
      categories: [...new Set(finalSelected.map(q => q.category))],
      hasIntro: true
    });

    return finalSelected;
  }

  /**
   * Get question by ID
   * @param {string} questionId - Question ID
   * @returns {Promise<Object|null>} Question object or null
   */
  async getQuestionById(questionId) {
    await this.loadQuestions();
    return this.questions.find(q => q.id === questionId) || null;
  }

  /**
   * Get all categories
   * @returns {Promise<Array<string>>} Array of category names
   */
  async getCategories() {
    await this.loadQuestions();
    const categories = [...new Set(this.questions.map(q => q.category))];
    return categories.sort();
  }

  /**
   * Get questions by category
   * @param {string} category - Category name
   * @returns {Promise<Array>} Questions in that category
   */
  async getQuestionsByCategory(category) {
    await this.loadQuestions();
    return this.questions.filter(q => q.category === category);
  }

  /**
   * Get statistics about available questions
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    await this.loadQuestions();
    
    const stats = {
      total: this.questions.length,
      byCategory: {},
      valid: 0,
      invalid: 0
    };

    this.questions.forEach(q => {
      // Count by category
      if (!stats.byCategory[q.category]) {
        stats.byCategory[q.category] = 0;
      }
      stats.byCategory[q.category]++;

      // Count valid/invalid
      if (q.question && q.question.length >= 20 && q.question.includes('?')) {
        stats.valid++;
      } else {
        stats.invalid++;
      }
    });

    return stats;
  }
}

module.exports = new HRQuestionService();






