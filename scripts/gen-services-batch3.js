const fs = require('fs');
const path = require('path');
const base = 'c:\\Users\\DELL\\Downloads\\Azure_Project\\docbridge\\services';

// ========== AI COMPANION SERVICE ==========
const aiBase = path.join(base, 'ai-companion-service', 'src');

// Azure OpenAI config
fs.writeFileSync(path.join(aiBase, 'config', 'azureOpenai.js'), `const env = require('./environment');
const logger = require('./logger');

async function callAzureOpenAI(messages, options = {}) {
  const endpoint = env.AZURE_OPENAI_ENDPOINT;
  const apiKey = env.AZURE_OPENAI_KEY;
  const deploymentName = env.AZURE_OPENAI_DEPLOYMENT_NAME;
  const apiVersion = env.AZURE_OPENAI_API_VERSION;

  if (!endpoint || !apiKey) {
    logger.warn('Azure OpenAI credentials not configured. Returning fallback response.');
    return {
      content: 'I apologize, but I am not able to provide AI-powered responses right now because the AI service has not been configured yet. Please ask your administrator to set up the Azure OpenAI credentials.',
      tokensUsed: 0,
      model: 'fallback',
    };
  }

  const url = \`\${endpoint.replace(/\\/$/, '')}/openai/deployments/\${deploymentName}/chat/completions?api-version=\${apiVersion}\`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(\`Azure OpenAI API error: \${response.status} \${errorBody}\`);
      throw new Error(\`Azure OpenAI API returned status \${response.status}\`);
    }

    const data = await response.json();
    const choice = data.choices && data.choices[0];

    return {
      content: choice ? choice.message.content : 'No response generated.',
      tokensUsed: data.usage ? data.usage.total_tokens : 0,
      model: deploymentName,
    };
  } catch (error) {
    logger.error('Azure OpenAI call failed:', { message: error.message });
    return {
      content: 'I am sorry, I encountered an issue connecting to the AI service. Please try again in a moment.',
      tokensUsed: 0,
      model: 'error',
    };
  }
}

module.exports = { callAzureOpenAI };
`);

// ChatHistory model
fs.writeFileSync(path.join(aiBase, 'models', 'ChatHistory.js'), `const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatHistory = sequelize.define('ChatHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  session_id: { type: DataTypes.UUID, allowNull: false, defaultValue: DataTypes.UUIDV4 },
  role: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [['user', 'assistant', 'system']] } },
  content: { type: DataTypes.TEXT, allowNull: false },
  context_snapshot: { type: DataTypes.JSONB, allowNull: true },
  tokens_used: { type: DataTypes.INTEGER, allowNull: true },
  model_used: { type: DataTypes.STRING(50), defaultValue: 'gpt-4' },
  feedback: { type: DataTypes.STRING(20), allowNull: true },
  is_flagged: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'chat_history', timestamps: true, updatedAt: false, underscored: true });

module.exports = ChatHistory;
`);

fs.writeFileSync(path.join(aiBase, 'models', 'index.js'), `const ChatHistory = require('./ChatHistory');
module.exports = { ChatHistory };
`);

// Prompt Engine Service
fs.writeFileSync(path.join(aiBase, 'services', 'promptEngineService.js'), `const SYSTEM_PROMPT = \`You are DocBridge AI, a caring and knowledgeable health companion. Your role is to help patients understand their health better AFTER they have visited their doctor.

CRITICAL RULES:
1. NEVER diagnose conditions. You explain what the doctor has already diagnosed.
2. NEVER recommend starting, stopping, or changing medications. Only explain what was prescribed.
3. ALWAYS use simple, everyday language. Avoid medical jargon.
4. ALWAYS include a medical disclaimer reminding users to consult their doctor.
5. Be empathetic, warm, and encouraging. Patients may be anxious.
6. When explaining medicines, include: what it does in simple terms, common side effects to watch for, food interactions, and when to call the doctor.
7. When explaining lab results, compare values to normal ranges in simple terms.
8. When analyzing symptoms, look for patterns but never diagnose.
9. Use analogies and metaphors to explain complex concepts (e.g., "think of blood pressure like water pressure in a hose").
10. If asked about something outside your scope, gently redirect to their doctor.\`;

function buildChatPrompt(userMessage, context = {}) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

  if (context.healthSnapshot) {
    messages.push({
      role: 'system',
      content: \`Patient Health Context:\\n\${JSON.stringify(context.healthSnapshot, null, 2)}\\n\\nUse this context to provide personalized, relevant responses. Reference specific medications, conditions, and lab results when relevant.\`,
    });
  }

  if (context.chatHistory && context.chatHistory.length > 0) {
    for (const msg of context.chatHistory.slice(-10)) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: userMessage });
  return messages;
}

function buildMedicineExplainPrompt(medicineData) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: \`Please explain this medicine in simple, everyday language that anyone can understand:

Medicine: \${medicineData.medicineName}
Generic Name: \${medicineData.genericName || 'Not specified'}
Dosage: \${medicineData.dosage}
Frequency: \${medicineData.frequency}
Purpose: \${medicineData.purpose || 'Not specified'}
Instructions: \${medicineData.instructions || 'Not specified'}

Please cover:
1. What this medicine does (in simple terms)
2. Why the doctor prescribed it
3. Important things to know while taking it
4. Common side effects to watch for
5. Foods or drinks to avoid
6. When to contact the doctor about this medicine\` },
  ];
}

function buildLabReportExplainPrompt(reportData) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: \`Please explain these lab results in simple language:

Report: \${reportData.reportName}
Type: \${reportData.reportType}
Date: \${reportData.reportDate}

Results:
\${JSON.stringify(reportData.results, null, 2)}

Flagged Values:
\${JSON.stringify(reportData.flaggedValues || [], null, 2)}

Doctor's Interpretation: \${reportData.overallInterpretation || 'Not provided'}

Please explain:
1. What each test measures (in simple terms)
2. Whether results are normal, high, or low — and what that means
3. Any values that need attention and why
4. What the patient should do next
5. Questions to ask the doctor at the next visit\` },
  ];
}

function buildSymptomInsightPrompt(symptomData, context = {}) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: \`Please provide insights about this symptom based on the patient's health context:

Symptom: \${symptomData.symptomName}
Severity: \${symptomData.severity}/10
Location: \${symptomData.bodyLocation || 'Not specified'}
Duration: \${symptomData.durationHours ? symptomData.durationHours + ' hours' : 'Ongoing'}
Triggers: \${symptomData.triggers || 'Not specified'}
Relieved by: \${symptomData.relievedBy || 'Not specified'}

Current Medications: \${context.medications ? context.medications.map(m => m.medicine_name).join(', ') : 'None listed'}

Please provide:
1. Possible connections to current medications (side effects?)
2. Patterns to watch for
3. Self-care tips
4. When this symptom warrants calling the doctor
5. Questions to ask the doctor about this symptom\` },
  ];
}

function buildGenerateQuestionsPrompt(context = {}) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: \`Based on the following health context, generate 5-8 smart questions this patient should ask their doctor at their next visit:

Current Conditions: \${context.conditions ? context.conditions.join(', ') : 'Not specified'}
Current Medications: \${context.medications ? context.medications.map(m => \`\${m.medicine_name} \${m.dosage}\`).join(', ') : 'None'}
Recent Symptoms: \${context.symptoms ? context.symptoms.map(s => \`\${s.symptom_name} (severity \${s.severity}/10)\`).join(', ') : 'None'}
Recent Lab Results: \${context.labHighlights || 'None'}

Generate questions that:
1. Help the patient understand their condition better
2. Clarify medication concerns
3. Address symptom patterns
4. Discuss lifestyle changes
5. Plan for future health monitoring\` },
  ];
}

const SUGGESTED_QUESTIONS = [
  "What does my latest blood test mean?",
  "Can you explain my blood pressure medicine in simple terms?",
  "What foods should I avoid with my current medications?",
  "I have been feeling dizzy — could it be from my medicine?",
  "What questions should I ask my doctor at my next visit?",
  "Help me understand my cholesterol numbers",
  "What side effects should I watch for with my prescriptions?",
  "Can you explain what my diagnosis means in simple terms?",
];

module.exports = {
  buildChatPrompt, buildMedicineExplainPrompt, buildLabReportExplainPrompt,
  buildSymptomInsightPrompt, buildGenerateQuestionsPrompt, SUGGESTED_QUESTIONS,
};
`);

// Context Builder Service with caching
fs.writeFileSync(path.join(aiBase, 'services', 'contextBuilderService.js'), `const NodeCache = require('node-cache');
const { sequelize } = require('../config/database');
const logger = require('../config/logger');

const cache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

async function buildUserContext(userId) {
  const cacheKey = \`context_\${userId}\`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug(\`Using cached health context for user \${userId}\`);
    return cached;
  }

  logger.debug(\`Building fresh health context for user \${userId}\`);

  try {
    const [consultations] = await sequelize.query(
      \`SELECT doctor_name, doctor_specialty, consultation_date, diagnosis, diagnosis_simplified, status
       FROM consultations WHERE user_id = :userId ORDER BY consultation_date DESC LIMIT 5\`,
      { replacements: { userId }, type: sequelize.QueryTypes.SELECT ? undefined : undefined, raw: true }
    );

    const [medications] = await sequelize.query(
      \`SELECT medicine_name, generic_name, dosage, frequency, purpose, purpose_simplified, is_active, side_effect_warnings
       FROM prescriptions WHERE user_id = :userId AND is_active = true ORDER BY start_date DESC\`,
      { replacements: { userId }, raw: true }
    );

    const [symptoms] = await sequelize.query(
      \`SELECT symptom_name, severity, onset_date, is_ongoing, body_location, triggers
       FROM symptoms WHERE user_id = :userId AND is_ongoing = true ORDER BY onset_date DESC LIMIT 10\`,
      { replacements: { userId }, raw: true }
    );

    const [labReports] = await sequelize.query(
      \`SELECT report_name, report_type, report_date, flagged_values, overall_interpretation_simplified
       FROM lab_reports WHERE user_id = :userId ORDER BY report_date DESC LIMIT 3\`,
      { replacements: { userId }, raw: true }
    );

    const [userInfo] = await sequelize.query(
      \`SELECT first_name, last_name, date_of_birth, gender, blood_group, known_allergies, chronic_conditions
       FROM users WHERE id = :userId\`,
      { replacements: { userId }, raw: true }
    );

    const context = {
      user: Array.isArray(userInfo) ? userInfo[0] : userInfo,
      recentConsultations: Array.isArray(consultations) ? consultations : [],
      activeMedications: Array.isArray(medications) ? medications : [],
      ongoingSymptoms: Array.isArray(symptoms) ? symptoms : [],
      recentLabReports: Array.isArray(labReports) ? labReports : [],
    };

    cache.set(cacheKey, context);
    return context;
  } catch (error) {
    logger.error('Error building user context:', { message: error.message });
    return { user: {}, recentConsultations: [], activeMedications: [], ongoingSymptoms: [], recentLabReports: [] };
  }
}

function invalidateCache(userId) {
  cache.del(\`context_\${userId}\`);
}

module.exports = { buildUserContext, invalidateCache };
`);

// AI Companion Service
fs.writeFileSync(path.join(aiBase, 'services', 'aiCompanionService.js'), `const { ChatHistory } = require('../models');
const { callAzureOpenAI } = require('../config/azureOpenai');
const { buildUserContext } = require('./contextBuilderService');
const promptEngine = require('./promptEngineService');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

class AICompanionService {
  async chat(userId, message, sessionId = null) {
    const activeSessionId = sessionId || uuidv4();

    // Save user message
    await ChatHistory.create({
      user_id: userId, session_id: activeSessionId,
      role: 'user', content: message,
    });

    // Build context
    const healthContext = await buildUserContext(userId);
    const chatHistory = await ChatHistory.findAll({
      where: { user_id: userId, session_id: activeSessionId },
      order: [['created_at', 'ASC']], limit: 20,
      attributes: ['role', 'content'],
    });

    const messages = promptEngine.buildChatPrompt(message, {
      healthSnapshot: healthContext,
      chatHistory: chatHistory.map(m => ({ role: m.role, content: m.content })),
    });

    const aiResponse = await callAzureOpenAI(messages);

    // Add medical disclaimer
    const disclaimer = '\\n\\n---\\n⚕️ *This is general health information, not medical advice. Always consult your doctor before making any health decisions.*';
    const fullResponse = aiResponse.content + disclaimer;

    // Save assistant response
    const savedMessage = await ChatHistory.create({
      user_id: userId, session_id: activeSessionId,
      role: 'assistant', content: fullResponse,
      context_snapshot: healthContext,
      tokens_used: aiResponse.tokensUsed,
      model_used: aiResponse.model,
    });

    return {
      sessionId: activeSessionId,
      message: { id: savedMessage.id, role: 'assistant', content: fullResponse, createdAt: savedMessage.created_at },
      tokensUsed: aiResponse.tokensUsed,
    };
  }

  async getHistory(userId, query = {}) {
    const { page = 1, limit = 20 } = query;
    const sessions = await ChatHistory.findAll({
      where: { user_id: userId },
      attributes: ['session_id', [ChatHistory.sequelize.fn('MIN', ChatHistory.sequelize.col('created_at')), 'started_at'],
        [ChatHistory.sequelize.fn('MAX', ChatHistory.sequelize.col('created_at')), 'last_message_at'],
        [ChatHistory.sequelize.fn('COUNT', ChatHistory.sequelize.col('id')), 'message_count']],
      group: ['session_id'],
      order: [[ChatHistory.sequelize.fn('MAX', ChatHistory.sequelize.col('created_at')), 'DESC']],
      limit: parseInt(limit, 10), offset: (page - 1) * limit, raw: true,
    });
    return sessions;
  }

  async getSessionHistory(userId, sessionId) {
    return ChatHistory.findAll({
      where: { user_id: userId, session_id: sessionId },
      order: [['created_at', 'ASC']],
    });
  }

  async deleteSession(userId, sessionId) {
    await ChatHistory.destroy({ where: { user_id: userId, session_id: sessionId } });
    return { message: 'Chat session deleted.' };
  }

  async explainMedicine(userId, medicineData) {
    const messages = promptEngine.buildMedicineExplainPrompt(medicineData);
    const response = await callAzureOpenAI(messages, { maxTokens: 1500 });
    return { explanation: response.content, tokensUsed: response.tokensUsed };
  }

  async explainLabReport(userId, reportData) {
    const messages = promptEngine.buildLabReportExplainPrompt(reportData);
    const response = await callAzureOpenAI(messages, { maxTokens: 1500 });
    return { explanation: response.content, tokensUsed: response.tokensUsed };
  }

  async explainSymptom(userId, symptomData) {
    const context = await buildUserContext(userId);
    const messages = promptEngine.buildSymptomInsightPrompt(symptomData, {
      medications: context.activeMedications,
    });
    const response = await callAzureOpenAI(messages, { maxTokens: 1200 });
    return { insight: response.content, tokensUsed: response.tokensUsed };
  }

  async generateQuestions(userId) {
    const context = await buildUserContext(userId);
    const messages = promptEngine.buildGenerateQuestionsPrompt({
      conditions: context.user?.chronic_conditions || [],
      medications: context.activeMedications,
      symptoms: context.ongoingSymptoms,
      labHighlights: context.recentLabReports.map(r => r.report_name).join(', '),
    });
    const response = await callAzureOpenAI(messages, { maxTokens: 1000 });
    return { questions: response.content, tokensUsed: response.tokensUsed };
  }

  getSuggestedQuestions() {
    return promptEngine.SUGGESTED_QUESTIONS;
  }
}

module.exports = new AICompanionService();
`);

// AI Companion validators
fs.writeFileSync(path.join(aiBase, 'validators', 'aiCompanionValidators.js'), `const { z } = require('zod');

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000),
  sessionId: z.string().uuid().optional().nullable(),
});

const explainMedicineSchema = z.object({
  medicineName: z.string().min(1),
  genericName: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  purpose: z.string().optional(),
  instructions: z.string().optional(),
});

const explainLabReportSchema = z.object({
  reportName: z.string().min(1),
  reportType: z.string().min(1),
  reportDate: z.string().optional(),
  results: z.array(z.any()).optional(),
  flaggedValues: z.array(z.any()).optional(),
  overallInterpretation: z.string().optional(),
});

const explainSymptomSchema = z.object({
  symptomName: z.string().min(1),
  severity: z.number().int().min(1).max(10),
  bodyLocation: z.string().optional(),
  durationHours: z.number().optional(),
  triggers: z.string().optional(),
  relievedBy: z.string().optional(),
});

module.exports = { chatSchema, explainMedicineSchema, explainLabReportSchema, explainSymptomSchema };
`);

// AI Companion Controller
fs.writeFileSync(path.join(aiBase, 'controllers', 'aiCompanionController.js'), `const aiService = require('../services/aiCompanionService');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');

async function chat(req, res) {
  try {
    const { message, sessionId } = req.validatedBody;
    const result = await aiService.chat(req.user.userId, message, sessionId);
    return successResponse(res, result, 'Response generated.');
  } catch (e) { logger.error('Chat error:', { message: e.message }); return errorResponse(res, e.message, e.statusCode || 500); }
}

async function getHistory(req, res) {
  try {
    const data = await aiService.getHistory(req.user.userId, req.query);
    return successResponse(res, data, 'Chat history retrieved.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}

async function getSessionHistory(req, res) {
  try {
    const data = await aiService.getSessionHistory(req.user.userId, req.params.sessionId);
    return successResponse(res, data, 'Session history retrieved.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}

async function deleteSession(req, res) {
  try {
    const data = await aiService.deleteSession(req.user.userId, req.params.sessionId);
    return successResponse(res, data);
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}

async function explainMedicine(req, res) {
  try {
    const data = await aiService.explainMedicine(req.user.userId, req.validatedBody);
    return successResponse(res, data, 'Medicine explanation generated.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}

async function explainLabReport(req, res) {
  try {
    const data = await aiService.explainLabReport(req.user.userId, req.validatedBody);
    return successResponse(res, data, 'Lab report explanation generated.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}

async function explainSymptom(req, res) {
  try {
    const data = await aiService.explainSymptom(req.user.userId, req.validatedBody);
    return successResponse(res, data, 'Symptom insight generated.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}

async function generateQuestions(req, res) {
  try {
    const data = await aiService.generateQuestions(req.user.userId);
    return successResponse(res, data, 'Questions generated.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}

async function getSuggestedQuestions(req, res) {
  try {
    const data = aiService.getSuggestedQuestions();
    return successResponse(res, data, 'Suggested questions.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}

module.exports = { chat, getHistory, getSessionHistory, deleteSession, explainMedicine, explainLabReport, explainSymptom, generateQuestions, getSuggestedQuestions };
`);

// AI Companion Routes
fs.writeFileSync(path.join(aiBase, 'routes', 'aiCompanionRoutes.js'), `const express = require('express');
const router = express.Router();
const c = require('../controllers/aiCompanionController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { chatSchema, explainMedicineSchema, explainLabReportSchema, explainSymptomSchema } = require('../validators/aiCompanionValidators');

router.use(authenticate);
router.post('/chat', validate(chatSchema), c.chat);
router.get('/history', c.getHistory);
router.get('/history/:sessionId', c.getSessionHistory);
router.delete('/history/:sessionId', c.deleteSession);
router.post('/explain/medicine', validate(explainMedicineSchema), c.explainMedicine);
router.post('/explain/lab-report', validate(explainLabReportSchema), c.explainLabReport);
router.post('/explain/symptom', validate(explainSymptomSchema), c.explainSymptom);
router.post('/generate-questions', c.generateQuestions);
router.get('/suggested-questions', c.getSuggestedQuestions);

module.exports = router;
`);

// Update AI companion .env.example
fs.writeFileSync(path.join(base, 'ai-companion-service', '.env.example'), `PORT=3007
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=docbridge_db
DB_USER=docbridge_user
DB_PASSWORD=DocBridge@2024Secure
DB_SSL=false

JWT_ACCESS_SECRET=replace_with_strong_secret_min_32_chars_access
LOG_LEVEL=debug

AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your_azure_openai_key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
`);

console.log('AI Companion service files written');

// ========== HEALTH SUMMARY SERVICE ==========
const hsBase = path.join(base, 'health-summary-service', 'src');

fs.writeFileSync(path.join(hsBase, 'models', 'index.js'), `// Health Summary service uses raw queries across all tables
// No dedicated models — it aggregates from other service tables
module.exports = {};
`);

fs.writeFileSync(path.join(hsBase, 'services', 'healthSummaryService.js'), `const { sequelize } = require('../config/database');
const logger = require('../config/logger');

class HealthSummaryService {
  async getDashboard(userId) {
    try {
      const [[userRow]] = await sequelize.query(
        \`SELECT first_name, last_name, blood_group, known_allergies, chronic_conditions, height_cm, weight_kg
         FROM users WHERE id = :userId\`,
        { replacements: { userId } }
      );

      const [[consultationStats]] = await sequelize.query(
        \`SELECT COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled
         FROM consultations WHERE user_id = :userId\`,
        { replacements: { userId } }
      );

      const [activeMeds] = await sequelize.query(
        \`SELECT id, medicine_name, dosage, frequency, start_date, end_date, prescribing_doctor
         FROM prescriptions WHERE user_id = :userId AND is_active = true ORDER BY start_date DESC\`,
        { replacements: { userId } }
      );

      const [ongoingSymptoms] = await sequelize.query(
        \`SELECT id, symptom_name, severity, onset_date, body_location
         FROM symptoms WHERE user_id = :userId AND is_ongoing = true ORDER BY severity DESC\`,
        { replacements: { userId } }
      );

      const [upcomingFollowups] = await sequelize.query(
        \`SELECT id, title, reminder_date, reminder_type
         FROM followup_reminders WHERE user_id = :userId AND is_active = true AND is_completed = false AND reminder_date >= CURRENT_DATE
         ORDER BY reminder_date ASC LIMIT 5\`,
        { replacements: { userId } }
      );

      const [recentLabReports] = await sequelize.query(
        \`SELECT id, report_name, report_type, report_date, status, flagged_values
         FROM lab_reports WHERE user_id = :userId ORDER BY report_date DESC LIMIT 3\`,
        { replacements: { userId } }
      );

      const [[medReminderCount]] = await sequelize.query(
        \`SELECT COUNT(*) as active_reminders FROM medicine_reminders WHERE user_id = :userId AND is_active = true\`,
        { replacements: { userId } }
      );

      // Health score calculation (simple heuristic)
      let healthScore = 80;
      if (ongoingSymptoms.length > 3) healthScore -= 10;
      if (ongoingSymptoms.some(s => s.severity >= 7)) healthScore -= 10;
      const flaggedReports = recentLabReports.filter(r => {
        const flagged = r.flagged_values;
        return Array.isArray(flagged) ? flagged.length > 0 : (flagged && flagged !== '[]');
      });
      if (flaggedReports.length > 0) healthScore -= 5;
      if (activeMeds.length === 0 && ongoingSymptoms.length === 0) healthScore = Math.min(healthScore + 5, 100);
      healthScore = Math.max(healthScore, 20);

      return {
        user: userRow || {},
        healthScore,
        consultations: consultationStats || { total: 0, completed: 0, scheduled: 0 },
        activeMedications: activeMeds,
        activeMedicationCount: activeMeds.length,
        ongoingSymptoms,
        ongoingSymptomCount: ongoingSymptoms.length,
        upcomingFollowups,
        recentLabReports,
        activeReminderCount: parseInt(medReminderCount?.active_reminders || 0, 10),
      };
    } catch (error) {
      logger.error('Dashboard aggregation error:', { message: error.message });
      throw error;
    }
  }

  async getTimeline(userId, query = {}) {
    const { page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    try {
      const [events] = await sequelize.query(\`
        SELECT * FROM (
          SELECT id, 'consultation' as type, consultation_date as event_date, doctor_name as title,
                 COALESCE(diagnosis_simplified, diagnosis, chief_complaint) as description,
                 status, created_at
          FROM consultations WHERE user_id = :userId

          UNION ALL

          SELECT id, 'prescription' as type, start_date as event_date, medicine_name as title,
                 COALESCE(purpose_simplified, purpose) as description,
                 CASE WHEN is_active THEN 'active' ELSE 'completed' END as status, created_at
          FROM prescriptions WHERE user_id = :userId

          UNION ALL

          SELECT id, 'lab_report' as type, report_date as event_date, report_name as title,
                 COALESCE(overall_interpretation_simplified, overall_interpretation) as description,
                 status, created_at
          FROM lab_reports WHERE user_id = :userId

          UNION ALL

          SELECT id, 'symptom' as type, onset_date as event_date, symptom_name as title,
                 notes as description,
                 CASE WHEN is_ongoing THEN 'ongoing' ELSE 'resolved' END as status, created_at
          FROM symptoms WHERE user_id = :userId
        ) timeline
        ORDER BY event_date DESC, created_at DESC
        LIMIT :limit OFFSET :offset
      \`, { replacements: { userId, limit: parseInt(limit, 10), offset } });

      const [[countResult]] = await sequelize.query(\`
        SELECT (
          (SELECT COUNT(*) FROM consultations WHERE user_id = :userId) +
          (SELECT COUNT(*) FROM prescriptions WHERE user_id = :userId) +
          (SELECT COUNT(*) FROM lab_reports WHERE user_id = :userId) +
          (SELECT COUNT(*) FROM symptoms WHERE user_id = :userId)
        ) as total
      \`, { replacements: { userId } });

      return {
        events: events || [],
        total: parseInt(countResult?.total || 0, 10),
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      };
    } catch (error) {
      logger.error('Timeline aggregation error:', { message: error.message });
      throw error;
    }
  }
}

module.exports = new HealthSummaryService();
`);

fs.writeFileSync(path.join(hsBase, 'controllers', 'healthSummaryController.js'), `const healthSummaryService = require('../services/healthSummaryService');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseUtils');

async function getDashboard(req, res) {
  try {
    const data = await healthSummaryService.getDashboard(req.user.userId);
    return successResponse(res, data, 'Dashboard data retrieved.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}

async function getTimeline(req, res) {
  try {
    const data = await healthSummaryService.getTimeline(req.user.userId, req.query);
    return paginatedResponse(res, data.events, data.total, data.page, data.limit, 'Timeline retrieved.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}

module.exports = { getDashboard, getTimeline };
`);

fs.writeFileSync(path.join(hsBase, 'routes', 'healthSummaryRoutes.js'), `const express = require('express');
const router = express.Router();
const c = require('../controllers/healthSummaryController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);
router.get('/dashboard', c.getDashboard);
router.get('/timeline', c.getTimeline);

module.exports = router;
`);

console.log('Health Summary service files written');
console.log('ALL BACKEND SERVICES COMPLETE');
