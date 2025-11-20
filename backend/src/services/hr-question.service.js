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
   * Select fixed number of questions (random selection)
   * @param {number} count - Number of questions to select
   * @param {Object} options - Selection options
   * @param {Array<string>} options.categories - Preferred categories
   * @param {Array<string>} options.excludeIds - Question IDs to exclude
   * @returns {Promise<Array>} Selected questions
   */
  async selectFixedQuestions(count = 5, options = {}) {
    const { categories = [], excludeIds = [] } = options;
    
    await this.loadQuestions();
    
    // Always start with "Tell me about yourself"
    const introQuestion = this.getIntroductionQuestion();
    const selected = [introQuestion];
    const remainingCount = count - 1;
    
    // Filter questions - exclude intro question, specified IDs, and beginner-inappropriate questions
    let availableQuestions = this.questions.filter(q => {
      // Exclude the intro question (if it exists in the dataset)
      if (q.id === introQuestion.id || q.question.toLowerCase().includes('tell me about yourself')) {
        return false;
      }
      
      // Exclude specified IDs
      if (excludeIds.includes(q.id)) {
        return false;
      }
      
      // Filter by category if specified
      if (categories.length > 0 && !categories.includes(q.category)) {
        return false;
      }
      
      // Filter out incomplete questions (very short or missing question mark)
      if (!q.question || q.question.length < 20 || !q.question.includes('?')) {
        return false;
      }
      
      // Filter out questions not suitable for beginners
      if (!this.isSuitableForBeginners(q)) {
        return false;
      }
      
      return true;
    });

    if (availableQuestions.length === 0) {
      Logger.warn('No suitable questions found after filtering, returning only intro question');
      return selected;
    }

    // Ensure we don't select more than available
    const selectCount = Math.min(remainingCount, availableQuestions.length);

    // Shuffle and select remaining questions
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const additionalQuestions = shuffled.slice(0, selectCount);
    
    // Add to selected (intro question is already first)
    selected.push(...additionalQuestions);

    Logger.info('Selected fixed HR questions', {
      count: selected.length,
      categories: [...new Set(selected.map(q => q.category))],
      hasIntro: true
    });

    return selected;
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






