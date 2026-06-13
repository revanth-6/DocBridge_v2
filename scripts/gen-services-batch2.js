const fs = require('fs');
const path = require('path');
const base = 'c:\\Users\\DELL\\Downloads\\Azure_Project\\docbridge\\services';

// ========== LAB REPORT SERVICE ==========
fs.writeFileSync(path.join(base, 'labreport-service', 'src', 'models', 'LabReport.js'), `const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LabReport = sequelize.define('LabReport', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  consultation_id: { type: DataTypes.UUID, allowNull: true },
  family_member_id: { type: DataTypes.UUID, allowNull: true },
  report_name: { type: DataTypes.STRING(300), allowNull: false },
  report_type: { type: DataTypes.STRING(100), allowNull: false },
  lab_name: { type: DataTypes.STRING(200), allowNull: true },
  report_date: { type: DataTypes.DATEONLY, allowNull: false },
  ordered_by_doctor: { type: DataTypes.STRING(200), allowNull: true },
  results: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  flagged_values: { type: DataTypes.JSONB, defaultValue: [] },
  overall_interpretation: { type: DataTypes.TEXT, allowNull: true },
  overall_interpretation_simplified: { type: DataTypes.TEXT, allowNull: true },
  ai_explanation: { type: DataTypes.TEXT, allowNull: true },
  file_url: { type: DataTypes.TEXT, allowNull: true },
  raw_text: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'final' },
}, { tableName: 'lab_reports', timestamps: true, underscored: true });

module.exports = LabReport;
`);

fs.writeFileSync(path.join(base, 'labreport-service', 'src', 'models', 'index.js'), `const LabReport = require('./LabReport');
module.exports = { LabReport };
`);

fs.writeFileSync(path.join(base, 'labreport-service', 'src', 'validators', 'labReportValidators.js'), `const { z } = require('zod');

const createLabReportSchema = z.object({
  consultationId: z.string().uuid().optional().nullable(),
  familyMemberId: z.string().uuid().optional().nullable(),
  reportName: z.string().min(1).max(300),
  reportType: z.string().min(1).max(100),
  labName: z.string().max(200).optional(),
  reportDate: z.string().min(1),
  orderedByDoctor: z.string().max(200).optional(),
  results: z.array(z.object({
    test_name: z.string(), value: z.any(), unit: z.string().optional(),
    reference_range: z.string().optional(), status: z.string().optional(),
  })).optional(),
  flaggedValues: z.array(z.any()).optional(),
  overallInterpretation: z.string().optional(),
  overallInterpretationSimplified: z.string().optional(),
  fileUrl: z.string().optional(),
  rawText: z.string().optional(),
  status: z.enum(['pending','preliminary','final','corrected']).optional(),
});
const updateLabReportSchema = createLabReportSchema.partial();
module.exports = { createLabReportSchema, updateLabReportSchema };
`);

fs.writeFileSync(path.join(base, 'labreport-service', 'src', 'services', 'labReportService.js'), `const { LabReport } = require('../models');
const { Op, fn, col } = require('sequelize');
const logger = require('../config/logger');

class LabReportService {
  async list(userId, query = {}) {
    const { page = 1, limit = 10, reportType, familyMemberId, search } = query;
    const where = { user_id: userId };
    if (reportType) where.report_type = reportType;
    if (familyMemberId) where.family_member_id = familyMemberId;
    if (search) {
      where[Op.or] = [
        { report_name: { [Op.iLike]: \`%\${search}%\` } },
        { lab_name: { [Op.iLike]: \`%\${search}%\` } },
      ];
    }
    const { count, rows } = await LabReport.findAndCountAll({
      where, order: [['report_date', 'DESC']], limit: parseInt(limit, 10), offset: (page - 1) * limit,
    });
    return { total: count, reports: rows, page: parseInt(page, 10), limit: parseInt(limit, 10) };
  }

  async getById(userId, id) {
    const r = await LabReport.findOne({ where: { id, user_id: userId } });
    if (!r) { const e = new Error('Lab report not found.'); e.statusCode = 404; throw e; }
    return r;
  }

  async create(userId, data) {
    return LabReport.create({
      user_id: userId, consultation_id: data.consultationId || null,
      family_member_id: data.familyMemberId || null,
      report_name: data.reportName, report_type: data.reportType,
      lab_name: data.labName, report_date: data.reportDate,
      ordered_by_doctor: data.orderedByDoctor, results: data.results || [],
      flagged_values: data.flaggedValues || [],
      overall_interpretation: data.overallInterpretation,
      overall_interpretation_simplified: data.overallInterpretationSimplified,
      file_url: data.fileUrl, raw_text: data.rawText,
      status: data.status || 'final',
    });
  }

  async update(userId, id, data) {
    const r = await this.getById(userId, id);
    const fields = {};
    if (data.reportName !== undefined) fields.report_name = data.reportName;
    if (data.reportType !== undefined) fields.report_type = data.reportType;
    if (data.labName !== undefined) fields.lab_name = data.labName;
    if (data.reportDate !== undefined) fields.report_date = data.reportDate;
    if (data.orderedByDoctor !== undefined) fields.ordered_by_doctor = data.orderedByDoctor;
    if (data.results !== undefined) fields.results = data.results;
    if (data.flaggedValues !== undefined) fields.flagged_values = data.flaggedValues;
    if (data.overallInterpretation !== undefined) fields.overall_interpretation = data.overallInterpretation;
    if (data.overallInterpretationSimplified !== undefined) fields.overall_interpretation_simplified = data.overallInterpretationSimplified;
    if (data.fileUrl !== undefined) fields.file_url = data.fileUrl;
    if (data.rawText !== undefined) fields.raw_text = data.rawText;
    if (data.status !== undefined) fields.status = data.status;
    if (data.consultationId !== undefined) fields.consultation_id = data.consultationId;
    if (data.familyMemberId !== undefined) fields.family_member_id = data.familyMemberId;
    await r.update(fields);
    return r;
  }

  async delete(userId, id) {
    const r = await this.getById(userId, id);
    await r.destroy();
    return { message: 'Lab report deleted.' };
  }

  async getFlagged(userId) {
    return LabReport.findAll({
      where: { user_id: userId, flagged_values: { [Op.ne]: '[]' } },
      order: [['report_date', 'DESC']],
    });
  }

  async aiExplain(userId, id) {
    const r = await this.getById(userId, id);
    const explanation = r.ai_explanation || 'AI explanation will be generated when the AI Companion service is configured.';
    if (!r.ai_explanation) await r.update({ ai_explanation: explanation });
    return { report: r, explanation };
  }

  async getTrends(userId, testName) {
    const reports = await LabReport.findAll({
      where: { user_id: userId },
      order: [['report_date', 'ASC']],
    });

    const trendData = [];
    for (const report of reports) {
      const results = report.results || [];
      for (const result of results) {
        if (result.test_name && result.test_name.toLowerCase().includes(testName.toLowerCase())) {
          trendData.push({
            date: report.report_date,
            value: result.value,
            unit: result.unit,
            reference_range: result.reference_range,
            status: result.status,
            report_name: report.report_name,
          });
        }
      }
    }
    return { testName, trends: trendData };
  }
}

module.exports = new LabReportService();
`);

fs.writeFileSync(path.join(base, 'labreport-service', 'src', 'controllers', 'labReportController.js'), `const labReportService = require('../services/labReportService');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseUtils');

async function list(req, res) { try { const r = await labReportService.list(req.user.userId, req.query); return paginatedResponse(res, r.reports, r.total, r.page, r.limit); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function getById(req, res) { try { return successResponse(res, await labReportService.getById(req.user.userId, req.params.id)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function create(req, res) { try { return successResponse(res, await labReportService.create(req.user.userId, req.validatedBody), 'Lab report added.', 201); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function update(req, res) { try { return successResponse(res, await labReportService.update(req.user.userId, req.params.id, req.validatedBody)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function remove(req, res) { try { return successResponse(res, await labReportService.delete(req.user.userId, req.params.id)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function getFlagged(req, res) { try { return successResponse(res, await labReportService.getFlagged(req.user.userId), 'Flagged reports.'); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function aiExplain(req, res) { try { return successResponse(res, await labReportService.aiExplain(req.user.userId, req.params.id)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function getTrends(req, res) { try { return successResponse(res, await labReportService.getTrends(req.user.userId, req.params.testName)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }

module.exports = { list, getById, create, update, remove, getFlagged, aiExplain, getTrends };
`);

fs.writeFileSync(path.join(base, 'labreport-service', 'src', 'routes', 'labReportRoutes.js'), `const express = require('express');
const router = express.Router();
const c = require('../controllers/labReportController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { createLabReportSchema, updateLabReportSchema } = require('../validators/labReportValidators');

router.use(authenticate);
router.get('/flagged', c.getFlagged);
router.get('/trends/:testName', c.getTrends);
router.get('/', c.list);
router.post('/', validate(createLabReportSchema), c.create);
router.get('/:id', c.getById);
router.put('/:id', validate(updateLabReportSchema), c.update);
router.delete('/:id', c.remove);
router.post('/:id/ai-explain', c.aiExplain);

module.exports = router;
`);
console.log('Lab report service files written');

// ========== SYMPTOM SERVICE ==========
fs.writeFileSync(path.join(base, 'symptom-service', 'src', 'models', 'Symptom.js'), `const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Symptom = sequelize.define('Symptom', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  family_member_id: { type: DataTypes.UUID, allowNull: true },
  symptom_name: { type: DataTypes.STRING(200), allowNull: false },
  severity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 10 } },
  onset_date: { type: DataTypes.DATEONLY, allowNull: false },
  onset_time: { type: DataTypes.TIME, allowNull: true },
  duration_hours: { type: DataTypes.INTEGER, allowNull: true },
  is_ongoing: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  resolved_date: { type: DataTypes.DATEONLY, allowNull: true },
  body_location: { type: DataTypes.STRING(100), allowNull: true },
  triggers: { type: DataTypes.TEXT, allowNull: true },
  relieved_by: { type: DataTypes.TEXT, allowNull: true },
  associated_symptoms: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  ai_insight: { type: DataTypes.TEXT, allowNull: true },
  related_consultation_id: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'symptoms', timestamps: true, underscored: true });

module.exports = Symptom;
`);

fs.writeFileSync(path.join(base, 'symptom-service', 'src', 'models', 'index.js'), `const Symptom = require('./Symptom');
module.exports = { Symptom };
`);

fs.writeFileSync(path.join(base, 'symptom-service', 'src', 'validators', 'symptomValidators.js'), `const { z } = require('zod');

const createSymptomSchema = z.object({
  familyMemberId: z.string().uuid().optional().nullable(),
  symptomName: z.string().min(1).max(200),
  severity: z.number().int().min(1).max(10),
  onsetDate: z.string().min(1),
  onsetTime: z.string().optional().nullable(),
  durationHours: z.number().int().optional(),
  isOngoing: z.boolean().optional(),
  resolvedDate: z.string().optional().nullable(),
  bodyLocation: z.string().max(100).optional(),
  triggers: z.string().optional(),
  relievedBy: z.string().optional(),
  associatedSymptoms: z.array(z.string()).optional(),
  notes: z.string().optional(),
  relatedConsultationId: z.string().uuid().optional().nullable(),
});
const updateSymptomSchema = createSymptomSchema.partial();
module.exports = { createSymptomSchema, updateSymptomSchema };
`);

fs.writeFileSync(path.join(base, 'symptom-service', 'src', 'services', 'symptomService.js'), `const { Symptom } = require('../models');
const { Op, fn, col } = require('sequelize');
const logger = require('../config/logger');

class SymptomService {
  async list(userId, query = {}) {
    const { page = 1, limit = 10, isOngoing, familyMemberId, search } = query;
    const where = { user_id: userId };
    if (isOngoing !== undefined) where.is_ongoing = isOngoing === 'true';
    if (familyMemberId) where.family_member_id = familyMemberId;
    if (search) where.symptom_name = { [Op.iLike]: \`%\${search}%\` };
    const { count, rows } = await Symptom.findAndCountAll({
      where, order: [['onset_date', 'DESC']], limit: parseInt(limit, 10), offset: (page - 1) * limit,
    });
    return { total: count, symptoms: rows, page: parseInt(page, 10), limit: parseInt(limit, 10) };
  }

  async getById(userId, id) {
    const s = await Symptom.findOne({ where: { id, user_id: userId } });
    if (!s) { const e = new Error('Symptom not found.'); e.statusCode = 404; throw e; }
    return s;
  }

  async create(userId, data) {
    return Symptom.create({
      user_id: userId, family_member_id: data.familyMemberId || null,
      symptom_name: data.symptomName, severity: data.severity,
      onset_date: data.onsetDate, onset_time: data.onsetTime || null,
      duration_hours: data.durationHours, is_ongoing: data.isOngoing !== undefined ? data.isOngoing : true,
      resolved_date: data.resolvedDate || null, body_location: data.bodyLocation,
      triggers: data.triggers, relieved_by: data.relievedBy,
      associated_symptoms: data.associatedSymptoms || [],
      notes: data.notes, related_consultation_id: data.relatedConsultationId || null,
    });
  }

  async update(userId, id, data) {
    const s = await this.getById(userId, id);
    const fields = {};
    if (data.symptomName !== undefined) fields.symptom_name = data.symptomName;
    if (data.severity !== undefined) fields.severity = data.severity;
    if (data.onsetDate !== undefined) fields.onset_date = data.onsetDate;
    if (data.onsetTime !== undefined) fields.onset_time = data.onsetTime;
    if (data.durationHours !== undefined) fields.duration_hours = data.durationHours;
    if (data.isOngoing !== undefined) fields.is_ongoing = data.isOngoing;
    if (data.resolvedDate !== undefined) fields.resolved_date = data.resolvedDate;
    if (data.bodyLocation !== undefined) fields.body_location = data.bodyLocation;
    if (data.triggers !== undefined) fields.triggers = data.triggers;
    if (data.relievedBy !== undefined) fields.relieved_by = data.relievedBy;
    if (data.associatedSymptoms !== undefined) fields.associated_symptoms = data.associatedSymptoms;
    if (data.notes !== undefined) fields.notes = data.notes;
    if (data.relatedConsultationId !== undefined) fields.related_consultation_id = data.relatedConsultationId;
    if (data.familyMemberId !== undefined) fields.family_member_id = data.familyMemberId;
    await s.update(fields);
    return s;
  }

  async delete(userId, id) {
    const s = await this.getById(userId, id);
    await s.destroy();
    return { message: 'Symptom deleted.' };
  }

  async getOngoing(userId) {
    return Symptom.findAll({ where: { user_id: userId, is_ongoing: true }, order: [['onset_date', 'DESC']] });
  }

  async getTrends(userId) {
    const symptoms = await Symptom.findAll({
      where: { user_id: userId },
      order: [['onset_date', 'ASC']],
      attributes: ['symptom_name', 'severity', 'onset_date', 'is_ongoing'],
    });

    const grouped = {};
    for (const s of symptoms) {
      const name = s.symptom_name;
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push({ date: s.onset_date, severity: s.severity, isOngoing: s.is_ongoing });
    }
    return grouped;
  }

  async aiInsight(userId, id) {
    const s = await this.getById(userId, id);
    const insight = s.ai_insight || 'AI insight will be generated when the AI Companion service is configured.';
    if (!s.ai_insight) await s.update({ ai_insight: insight });
    return { symptom: s, insight };
  }
}

module.exports = new SymptomService();
`);

fs.writeFileSync(path.join(base, 'symptom-service', 'src', 'controllers', 'symptomController.js'), `const symptomService = require('../services/symptomService');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseUtils');

async function list(req, res) { try { const r = await symptomService.list(req.user.userId, req.query); return paginatedResponse(res, r.symptoms, r.total, r.page, r.limit); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function getById(req, res) { try { return successResponse(res, await symptomService.getById(req.user.userId, req.params.id)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function create(req, res) { try { return successResponse(res, await symptomService.create(req.user.userId, req.validatedBody), 'Symptom logged.', 201); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function update(req, res) { try { return successResponse(res, await symptomService.update(req.user.userId, req.params.id, req.validatedBody)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function remove(req, res) { try { return successResponse(res, await symptomService.delete(req.user.userId, req.params.id)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function getOngoing(req, res) { try { return successResponse(res, await symptomService.getOngoing(req.user.userId)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function getTrends(req, res) { try { return successResponse(res, await symptomService.getTrends(req.user.userId)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function aiInsight(req, res) { try { return successResponse(res, await symptomService.aiInsight(req.user.userId, req.params.id)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }

module.exports = { list, getById, create, update, remove, getOngoing, getTrends, aiInsight };
`);

fs.writeFileSync(path.join(base, 'symptom-service', 'src', 'routes', 'symptomRoutes.js'), `const express = require('express');
const router = express.Router();
const c = require('../controllers/symptomController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { createSymptomSchema, updateSymptomSchema } = require('../validators/symptomValidators');

router.use(authenticate);
router.get('/ongoing', c.getOngoing);
router.get('/trends', c.getTrends);
router.get('/', c.list);
router.post('/', validate(createSymptomSchema), c.create);
router.get('/:id', c.getById);
router.put('/:id', validate(updateSymptomSchema), c.update);
router.delete('/:id', c.remove);
router.post('/:id/ai-insight', c.aiInsight);

module.exports = router;
`);
console.log('Symptom service files written');

// ========== FAMILY SERVICE ==========
fs.writeFileSync(path.join(base, 'family-service', 'src', 'models', 'FamilyMember.js'), `const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FamilyMember = sequelize.define('FamilyMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  primary_user_id: { type: DataTypes.UUID, allowNull: false },
  first_name: { type: DataTypes.STRING(100), allowNull: false },
  last_name: { type: DataTypes.STRING(100), allowNull: false },
  relationship: { type: DataTypes.STRING(50), allowNull: false },
  date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
  gender: { type: DataTypes.STRING(20), allowNull: true },
  blood_group: { type: DataTypes.STRING(10), allowNull: true },
  known_allergies: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true },
  chronic_conditions: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true },
  avatar_url: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'family_members', timestamps: true, underscored: true });

module.exports = FamilyMember;
`);

fs.writeFileSync(path.join(base, 'family-service', 'src', 'models', 'index.js'), `const FamilyMember = require('./FamilyMember');
module.exports = { FamilyMember };
`);

fs.writeFileSync(path.join(base, 'family-service', 'src', 'validators', 'familyValidators.js'), `const { z } = require('zod');

const createFamilyMemberSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  relationship: z.enum(['spouse','child','parent','sibling','grandparent','grandchild','other']),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(['male','female','other','prefer_not_to_say']).optional(),
  bloodGroup: z.string().max(10).optional(),
  knownAllergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
const updateFamilyMemberSchema = createFamilyMemberSchema.partial();
module.exports = { createFamilyMemberSchema, updateFamilyMemberSchema };
`);

fs.writeFileSync(path.join(base, 'family-service', 'src', 'services', 'familyService.js'), `const { FamilyMember } = require('../models');
const logger = require('../config/logger');

class FamilyService {
  async list(userId) {
    return FamilyMember.findAll({ where: { primary_user_id: userId, is_active: true }, order: [['created_at', 'ASC']] });
  }

  async getById(userId, id) {
    const fm = await FamilyMember.findOne({ where: { id, primary_user_id: userId } });
    if (!fm) { const e = new Error('Family member not found.'); e.statusCode = 404; throw e; }
    return fm;
  }

  async create(userId, data) {
    return FamilyMember.create({
      primary_user_id: userId, first_name: data.firstName, last_name: data.lastName,
      relationship: data.relationship, date_of_birth: data.dateOfBirth || null,
      gender: data.gender, blood_group: data.bloodGroup,
      known_allergies: data.knownAllergies || [], chronic_conditions: data.chronicConditions || [],
      notes: data.notes,
    });
  }

  async update(userId, id, data) {
    const fm = await this.getById(userId, id);
    const fields = {};
    if (data.firstName !== undefined) fields.first_name = data.firstName;
    if (data.lastName !== undefined) fields.last_name = data.lastName;
    if (data.relationship !== undefined) fields.relationship = data.relationship;
    if (data.dateOfBirth !== undefined) fields.date_of_birth = data.dateOfBirth;
    if (data.gender !== undefined) fields.gender = data.gender;
    if (data.bloodGroup !== undefined) fields.blood_group = data.bloodGroup;
    if (data.knownAllergies !== undefined) fields.known_allergies = data.knownAllergies;
    if (data.chronicConditions !== undefined) fields.chronic_conditions = data.chronicConditions;
    if (data.notes !== undefined) fields.notes = data.notes;
    await fm.update(fields);
    return fm;
  }

  async delete(userId, id) {
    const fm = await this.getById(userId, id);
    await fm.update({ is_active: false });
    return { message: 'Family member removed.' };
  }
}

module.exports = new FamilyService();
`);

fs.writeFileSync(path.join(base, 'family-service', 'src', 'controllers', 'familyController.js'), `const familyService = require('../services/familyService');
const { successResponse, errorResponse } = require('../utils/responseUtils');

async function list(req, res) { try { return successResponse(res, await familyService.list(req.user.userId), 'Family members retrieved.'); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function getById(req, res) { try { return successResponse(res, await familyService.getById(req.user.userId, req.params.id)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function create(req, res) { try { return successResponse(res, await familyService.create(req.user.userId, req.validatedBody), 'Family member added.', 201); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function update(req, res) { try { return successResponse(res, await familyService.update(req.user.userId, req.params.id, req.validatedBody)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function remove(req, res) { try { return successResponse(res, await familyService.delete(req.user.userId, req.params.id)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }

module.exports = { list, getById, create, update, remove };
`);

fs.writeFileSync(path.join(base, 'family-service', 'src', 'routes', 'familyRoutes.js'), `const express = require('express');
const router = express.Router();
const c = require('../controllers/familyController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { createFamilyMemberSchema, updateFamilyMemberSchema } = require('../validators/familyValidators');

router.use(authenticate);
router.get('/', c.list);
router.post('/', validate(createFamilyMemberSchema), c.create);
router.get('/:id', c.getById);
router.put('/:id', validate(updateFamilyMemberSchema), c.update);
router.delete('/:id', c.remove);

module.exports = router;
`);
console.log('Family service files written');

console.log('Batch 2 done');
