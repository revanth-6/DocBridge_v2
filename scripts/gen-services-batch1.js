const fs = require('fs');
const path = require('path');
const base = 'c:\\Users\\DELL\\Downloads\\Azure_Project\\docbridge\\services';

// ========== PRESCRIPTION SERVICE ==========
const prescriptionValidators = `const { z } = require('zod');

const createPrescriptionSchema = z.object({
  consultationId: z.string().uuid().optional().nullable(),
  familyMemberId: z.string().uuid().optional().nullable(),
  medicineName: z.string().min(1, 'Medicine name is required').max(200),
  genericName: z.string().max(200).optional(),
  dosage: z.string().min(1, 'Dosage is required').max(100),
  frequency: z.string().min(1, 'Frequency is required').max(100),
  durationDays: z.number().int().positive().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().nullable(),
  instructions: z.string().optional(),
  purpose: z.string().optional(),
  purposeSimplified: z.string().optional(),
  isActive: z.boolean().optional(),
  refillNeeded: z.boolean().optional(),
  refillDate: z.string().optional().nullable(),
  prescribingDoctor: z.string().max(200).optional(),
  pharmacyNotes: z.string().optional(),
  sideEffectWarnings: z.array(z.string()).optional(),
  foodInteractions: z.array(z.string()).optional(),
});

const updatePrescriptionSchema = createPrescriptionSchema.partial();

const createSideEffectSchema = z.object({
  effectDescription: z.string().min(1, 'Description is required'),
  severity: z.enum(['mild', 'moderate', 'severe']),
  onsetDate: z.string().min(1, 'Onset date is required'),
  resolvedDate: z.string().optional().nullable(),
  isResolved: z.boolean().optional(),
  actionTaken: z.string().optional(),
  doctorNotified: z.boolean().optional(),
});

const updateSideEffectSchema = createSideEffectSchema.partial();

module.exports = { createPrescriptionSchema, updatePrescriptionSchema, createSideEffectSchema, updateSideEffectSchema };
`;

const prescriptionService = `const { Prescription, SideEffectLog } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

class PrescriptionService {
  async list(userId, query = {}) {
    const { page = 1, limit = 10, isActive, familyMemberId, search } = query;
    const offset = (page - 1) * limit;
    const where = { user_id: userId };
    if (isActive !== undefined) where.is_active = isActive === 'true';
    if (familyMemberId) where.family_member_id = familyMemberId;
    if (search) {
      where[Op.or] = [
        { medicine_name: { [Op.iLike]: \`%\${search}%\` } },
        { generic_name: { [Op.iLike]: \`%\${search}%\` } },
        { prescribing_doctor: { [Op.iLike]: \`%\${search}%\` } },
      ];
    }
    const { count, rows } = await Prescription.findAndCountAll({
      where, order: [['start_date', 'DESC']], limit: parseInt(limit, 10), offset,
      include: [{ model: SideEffectLog, as: 'sideEffects' }],
    });
    return { total: count, prescriptions: rows, page: parseInt(page, 10), limit: parseInt(limit, 10) };
  }

  async getActive(userId) {
    return Prescription.findAll({
      where: { user_id: userId, is_active: true },
      order: [['start_date', 'DESC']],
      include: [{ model: SideEffectLog, as: 'sideEffects' }],
    });
  }

  async getById(userId, id) {
    const p = await Prescription.findOne({
      where: { id, user_id: userId },
      include: [{ model: SideEffectLog, as: 'sideEffects' }],
    });
    if (!p) { const e = new Error('Prescription not found.'); e.statusCode = 404; throw e; }
    return p;
  }

  async create(userId, data) {
    const p = await Prescription.create({
      user_id: userId,
      consultation_id: data.consultationId || null,
      family_member_id: data.familyMemberId || null,
      medicine_name: data.medicineName,
      generic_name: data.genericName,
      dosage: data.dosage,
      frequency: data.frequency,
      duration_days: data.durationDays,
      start_date: data.startDate,
      end_date: data.endDate || null,
      instructions: data.instructions,
      purpose: data.purpose,
      purpose_simplified: data.purposeSimplified,
      is_active: data.isActive !== undefined ? data.isActive : true,
      refill_needed: data.refillNeeded || false,
      refill_date: data.refillDate || null,
      prescribing_doctor: data.prescribingDoctor,
      pharmacy_notes: data.pharmacyNotes,
      side_effect_warnings: data.sideEffectWarnings || [],
      food_interactions: data.foodInteractions || [],
    });
    logger.info(\`Prescription created: \${p.id}\`);
    return p;
  }

  async update(userId, id, data) {
    const p = await this.getById(userId, id);
    const fields = {};
    if (data.medicineName !== undefined) fields.medicine_name = data.medicineName;
    if (data.genericName !== undefined) fields.generic_name = data.genericName;
    if (data.dosage !== undefined) fields.dosage = data.dosage;
    if (data.frequency !== undefined) fields.frequency = data.frequency;
    if (data.durationDays !== undefined) fields.duration_days = data.durationDays;
    if (data.startDate !== undefined) fields.start_date = data.startDate;
    if (data.endDate !== undefined) fields.end_date = data.endDate;
    if (data.instructions !== undefined) fields.instructions = data.instructions;
    if (data.purpose !== undefined) fields.purpose = data.purpose;
    if (data.purposeSimplified !== undefined) fields.purpose_simplified = data.purposeSimplified;
    if (data.isActive !== undefined) fields.is_active = data.isActive;
    if (data.refillNeeded !== undefined) fields.refill_needed = data.refillNeeded;
    if (data.refillDate !== undefined) fields.refill_date = data.refillDate;
    if (data.prescribingDoctor !== undefined) fields.prescribing_doctor = data.prescribingDoctor;
    if (data.pharmacyNotes !== undefined) fields.pharmacy_notes = data.pharmacyNotes;
    if (data.sideEffectWarnings !== undefined) fields.side_effect_warnings = data.sideEffectWarnings;
    if (data.foodInteractions !== undefined) fields.food_interactions = data.foodInteractions;
    if (data.consultationId !== undefined) fields.consultation_id = data.consultationId;
    if (data.familyMemberId !== undefined) fields.family_member_id = data.familyMemberId;
    await p.update(fields);
    return p;
  }

  async delete(userId, id) {
    const p = await this.getById(userId, id);
    await p.destroy();
    return { message: 'Prescription deleted.' };
  }

  async aiExplain(userId, id) {
    const p = await this.getById(userId, id);
    const explanation = p.ai_explanation || 'AI explanation will be generated when the AI Companion service is configured.';
    if (!p.ai_explanation) await p.update({ ai_explanation: explanation });
    return { prescription: p, explanation };
  }

  async getSideEffects(userId, prescriptionId) {
    await this.getById(userId, prescriptionId);
    return SideEffectLog.findAll({ where: { user_id: userId, prescription_id: prescriptionId }, order: [['onset_date', 'DESC']] });
  }

  async createSideEffect(userId, prescriptionId, data) {
    await this.getById(userId, prescriptionId);
    return SideEffectLog.create({
      user_id: userId, prescription_id: prescriptionId,
      effect_description: data.effectDescription, severity: data.severity,
      onset_date: data.onsetDate, resolved_date: data.resolvedDate || null,
      is_resolved: data.isResolved || false, action_taken: data.actionTaken,
      doctor_notified: data.doctorNotified || false,
    });
  }

  async updateSideEffect(userId, prescriptionId, sideEffectId, data) {
    await this.getById(userId, prescriptionId);
    const se = await SideEffectLog.findOne({ where: { id: sideEffectId, user_id: userId, prescription_id: prescriptionId } });
    if (!se) { const e = new Error('Side effect not found.'); e.statusCode = 404; throw e; }
    const fields = {};
    if (data.effectDescription !== undefined) fields.effect_description = data.effectDescription;
    if (data.severity !== undefined) fields.severity = data.severity;
    if (data.onsetDate !== undefined) fields.onset_date = data.onsetDate;
    if (data.resolvedDate !== undefined) fields.resolved_date = data.resolvedDate;
    if (data.isResolved !== undefined) fields.is_resolved = data.isResolved;
    if (data.actionTaken !== undefined) fields.action_taken = data.actionTaken;
    if (data.doctorNotified !== undefined) fields.doctor_notified = data.doctorNotified;
    await se.update(fields);
    return se;
  }

  async deleteSideEffect(userId, prescriptionId, sideEffectId) {
    await this.getById(userId, prescriptionId);
    const se = await SideEffectLog.findOne({ where: { id: sideEffectId, user_id: userId, prescription_id: prescriptionId } });
    if (!se) { const e = new Error('Side effect not found.'); e.statusCode = 404; throw e; }
    await se.destroy();
    return { message: 'Side effect log deleted.' };
  }
}

module.exports = new PrescriptionService();
`;

const prescriptionController = `const prescriptionService = require('../services/prescriptionService');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');

async function list(req, res) {
  try {
    const r = await prescriptionService.list(req.user.userId, req.query);
    return paginatedResponse(res, r.prescriptions, r.total, r.page, r.limit, 'Prescriptions retrieved.');
  } catch (e) { logger.error('List prescriptions error:', { message: e.message }); return errorResponse(res, e.message, e.statusCode || 500); }
}
async function getActive(req, res) {
  try {
    const data = await prescriptionService.getActive(req.user.userId);
    return successResponse(res, data, 'Active prescriptions retrieved.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}
async function getById(req, res) {
  try {
    const data = await prescriptionService.getById(req.user.userId, req.params.id);
    return successResponse(res, data, 'Prescription retrieved.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}
async function create(req, res) {
  try {
    const data = await prescriptionService.create(req.user.userId, req.validatedBody);
    return successResponse(res, data, 'Prescription added.', 201);
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}
async function update(req, res) {
  try {
    const data = await prescriptionService.update(req.user.userId, req.params.id, req.validatedBody);
    return successResponse(res, data, 'Prescription updated.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}
async function remove(req, res) {
  try {
    const data = await prescriptionService.delete(req.user.userId, req.params.id);
    return successResponse(res, data, 'Prescription deleted.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}
async function aiExplain(req, res) {
  try {
    const data = await prescriptionService.aiExplain(req.user.userId, req.params.id);
    return successResponse(res, data, 'AI explanation generated.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}
async function getSideEffects(req, res) {
  try {
    const data = await prescriptionService.getSideEffects(req.user.userId, req.params.id);
    return successResponse(res, data, 'Side effects retrieved.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}
async function createSideEffect(req, res) {
  try {
    const data = await prescriptionService.createSideEffect(req.user.userId, req.params.id, req.validatedBody);
    return successResponse(res, data, 'Side effect logged.', 201);
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}
async function updateSideEffect(req, res) {
  try {
    const data = await prescriptionService.updateSideEffect(req.user.userId, req.params.id, req.params.sideEffectId, req.validatedBody);
    return successResponse(res, data, 'Side effect updated.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}
async function deleteSideEffect(req, res) {
  try {
    const data = await prescriptionService.deleteSideEffect(req.user.userId, req.params.id, req.params.sideEffectId);
    return successResponse(res, data, 'Side effect deleted.');
  } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); }
}

module.exports = { list, getActive, getById, create, update, remove, aiExplain, getSideEffects, createSideEffect, updateSideEffect, deleteSideEffect };
`;

const prescriptionRoutes = `const express = require('express');
const router = express.Router();
const c = require('../controllers/prescriptionController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { createPrescriptionSchema, updatePrescriptionSchema, createSideEffectSchema, updateSideEffectSchema } = require('../validators/prescriptionValidators');

router.use(authenticate);
router.get('/active', c.getActive);
router.get('/', c.list);
router.post('/', validate(createPrescriptionSchema), c.create);
router.get('/:id', c.getById);
router.put('/:id', validate(updatePrescriptionSchema), c.update);
router.delete('/:id', c.remove);
router.post('/:id/ai-explain', c.aiExplain);
router.get('/:id/side-effects', c.getSideEffects);
router.post('/:id/side-effects', validate(createSideEffectSchema), c.createSideEffect);
router.put('/:id/side-effects/:sideEffectId', validate(updateSideEffectSchema), c.updateSideEffect);
router.delete('/:id/side-effects/:sideEffectId', c.deleteSideEffect);

module.exports = router;
`;

// Write prescription files
fs.writeFileSync(path.join(base, 'prescription-service', 'src', 'validators', 'prescriptionValidators.js'), prescriptionValidators);
fs.writeFileSync(path.join(base, 'prescription-service', 'src', 'services', 'prescriptionService.js'), prescriptionService);
fs.writeFileSync(path.join(base, 'prescription-service', 'src', 'controllers', 'prescriptionController.js'), prescriptionController);
fs.writeFileSync(path.join(base, 'prescription-service', 'src', 'routes', 'prescriptionRoutes.js'), prescriptionRoutes);
console.log('Prescription service files written');

// ========== REMINDER SERVICE ==========
const reminderModels = {
  'MedicineReminder.js': `const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MedicineReminder = sequelize.define('MedicineReminder', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  prescription_id: { type: DataTypes.UUID, allowNull: true },
  family_member_id: { type: DataTypes.UUID, allowNull: true },
  medicine_name: { type: DataTypes.STRING(200), allowNull: false },
  dosage: { type: DataTypes.STRING(100), allowNull: false },
  reminder_times: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false },
  days_of_week: { type: DataTypes.ARRAY(DataTypes.INTEGER), defaultValue: [1,2,3,4,5,6,7] },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  notification_method: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'in_app' },
  last_triggered_at: { type: DataTypes.DATE, allowNull: true },
  snooze_minutes: { type: DataTypes.INTEGER, defaultValue: 10 },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'medicine_reminders', timestamps: true, underscored: true });

module.exports = MedicineReminder;
`,
  'FollowupReminder.js': `const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FollowupReminder = sequelize.define('FollowupReminder', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  consultation_id: { type: DataTypes.UUID, allowNull: true },
  family_member_id: { type: DataTypes.UUID, allowNull: true },
  title: { type: DataTypes.STRING(300), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  reminder_date: { type: DataTypes.DATEONLY, allowNull: false },
  reminder_time: { type: DataTypes.TIME, allowNull: true },
  reminder_type: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'followup' },
  is_completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  notification_method: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'in_app' },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'followup_reminders', timestamps: true, underscored: true });

module.exports = FollowupReminder;
`,
  'index.js': `const MedicineReminder = require('./MedicineReminder');
const FollowupReminder = require('./FollowupReminder');
module.exports = { MedicineReminder, FollowupReminder };
`
};

for (const [file, content] of Object.entries(reminderModels)) {
  fs.writeFileSync(path.join(base, 'reminder-service', 'src', 'models', file), content);
}

const schedulerService = `const cron = require('node-cron');
const { MedicineReminder, FollowupReminder } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

function initializeScheduler() {
  logger.info('Initializing reminder scheduler — checking every minute');

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM
      const currentDay = now.getDay() || 7; // 1=Mon, 7=Sun
      const today = now.toISOString().split('T')[0];

      // Check medicine reminders
      const medicineReminders = await MedicineReminder.findAll({
        where: {
          is_active: true,
          start_date: { [Op.lte]: today },
          [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: today } }],
        },
      });

      for (const reminder of medicineReminders) {
        const daysMatch = reminder.days_of_week && reminder.days_of_week.includes(currentDay);
        const timeMatch = reminder.reminder_times && reminder.reminder_times.some(t => t.slice(0, 5) === currentTime);

        if (daysMatch && timeMatch) {
          logger.info(\`Medicine reminder triggered: \${reminder.id} — \${reminder.medicine_name} \${reminder.dosage}\`);
          await reminder.update({ last_triggered_at: now });
        }
      }

      // Check followup reminders due today
      const followupReminders = await FollowupReminder.findAll({
        where: {
          is_active: true,
          is_completed: false,
          reminder_date: today,
        },
      });

      for (const reminder of followupReminders) {
        if (reminder.reminder_time) {
          const reminderTime = reminder.reminder_time.slice(0, 5);
          if (reminderTime === currentTime) {
            logger.info(\`Follow-up reminder triggered: \${reminder.id} — \${reminder.title}\`);
          }
        }
      }
    } catch (error) {
      logger.error('Scheduler error:', { message: error.message });
    }
  });
}

module.exports = { initializeScheduler };
`;

fs.writeFileSync(path.join(base, 'reminder-service', 'src', 'services', 'schedulerService.js'), schedulerService);

const reminderService = `const { MedicineReminder, FollowupReminder } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

class ReminderService {
  // Medicine Reminders
  async listMedicineReminders(userId, query = {}) {
    const { page = 1, limit = 10, isActive } = query;
    const where = { user_id: userId };
    if (isActive !== undefined) where.is_active = isActive === 'true';
    const { count, rows } = await MedicineReminder.findAndCountAll({
      where, order: [['created_at', 'DESC']], limit: parseInt(limit, 10), offset: (page - 1) * limit,
    });
    return { total: count, reminders: rows, page: parseInt(page, 10), limit: parseInt(limit, 10) };
  }

  async getMedicineReminder(userId, id) {
    const r = await MedicineReminder.findOne({ where: { id, user_id: userId } });
    if (!r) { const e = new Error('Medicine reminder not found.'); e.statusCode = 404; throw e; }
    return r;
  }

  async createMedicineReminder(userId, data) {
    return MedicineReminder.create({
      user_id: userId, prescription_id: data.prescriptionId || null,
      family_member_id: data.familyMemberId || null,
      medicine_name: data.medicineName, dosage: data.dosage,
      reminder_times: data.reminderTimes, days_of_week: data.daysOfWeek || [1,2,3,4,5,6,7],
      start_date: data.startDate, end_date: data.endDate || null,
      is_active: true, notification_method: data.notificationMethod || 'in_app',
      snooze_minutes: data.snoozeMinutes || 10, notes: data.notes,
    });
  }

  async updateMedicineReminder(userId, id, data) {
    const r = await this.getMedicineReminder(userId, id);
    const fields = {};
    if (data.medicineName !== undefined) fields.medicine_name = data.medicineName;
    if (data.dosage !== undefined) fields.dosage = data.dosage;
    if (data.reminderTimes !== undefined) fields.reminder_times = data.reminderTimes;
    if (data.daysOfWeek !== undefined) fields.days_of_week = data.daysOfWeek;
    if (data.startDate !== undefined) fields.start_date = data.startDate;
    if (data.endDate !== undefined) fields.end_date = data.endDate;
    if (data.isActive !== undefined) fields.is_active = data.isActive;
    if (data.notificationMethod !== undefined) fields.notification_method = data.notificationMethod;
    if (data.snoozeMinutes !== undefined) fields.snooze_minutes = data.snoozeMinutes;
    if (data.notes !== undefined) fields.notes = data.notes;
    await r.update(fields);
    return r;
  }

  async deleteMedicineReminder(userId, id) {
    const r = await this.getMedicineReminder(userId, id);
    await r.destroy();
    return { message: 'Medicine reminder deleted.' };
  }

  // Followup Reminders
  async listFollowupReminders(userId, query = {}) {
    const { page = 1, limit = 10, isCompleted } = query;
    const where = { user_id: userId, is_active: true };
    if (isCompleted !== undefined) where.is_completed = isCompleted === 'true';
    const { count, rows } = await FollowupReminder.findAndCountAll({
      where, order: [['reminder_date', 'ASC']], limit: parseInt(limit, 10), offset: (page - 1) * limit,
    });
    return { total: count, reminders: rows, page: parseInt(page, 10), limit: parseInt(limit, 10) };
  }

  async getFollowupReminder(userId, id) {
    const r = await FollowupReminder.findOne({ where: { id, user_id: userId } });
    if (!r) { const e = new Error('Follow-up reminder not found.'); e.statusCode = 404; throw e; }
    return r;
  }

  async createFollowupReminder(userId, data) {
    return FollowupReminder.create({
      user_id: userId, consultation_id: data.consultationId || null,
      family_member_id: data.familyMemberId || null,
      title: data.title, description: data.description,
      reminder_date: data.reminderDate, reminder_time: data.reminderTime || null,
      reminder_type: data.reminderType || 'followup',
      notification_method: data.notificationMethod || 'in_app', notes: data.notes,
    });
  }

  async updateFollowupReminder(userId, id, data) {
    const r = await this.getFollowupReminder(userId, id);
    const fields = {};
    if (data.title !== undefined) fields.title = data.title;
    if (data.description !== undefined) fields.description = data.description;
    if (data.reminderDate !== undefined) fields.reminder_date = data.reminderDate;
    if (data.reminderTime !== undefined) fields.reminder_time = data.reminderTime;
    if (data.reminderType !== undefined) fields.reminder_type = data.reminderType;
    if (data.isActive !== undefined) fields.is_active = data.isActive;
    if (data.notificationMethod !== undefined) fields.notification_method = data.notificationMethod;
    if (data.notes !== undefined) fields.notes = data.notes;
    await r.update(fields);
    return r;
  }

  async deleteFollowupReminder(userId, id) {
    const r = await this.getFollowupReminder(userId, id);
    await r.destroy();
    return { message: 'Follow-up reminder deleted.' };
  }

  async completeFollowup(userId, id) {
    const r = await this.getFollowupReminder(userId, id);
    await r.update({ is_completed: true, completed_at: new Date() });
    return r;
  }

  async getUpcoming(userId) {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const medicineReminders = await MedicineReminder.findAll({
      where: { user_id: userId, is_active: true, start_date: { [Op.lte]: nextWeek }, [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: today } }] },
      order: [['created_at', 'DESC']], limit: 10,
    });

    const followupReminders = await FollowupReminder.findAll({
      where: { user_id: userId, is_active: true, is_completed: false, reminder_date: { [Op.gte]: today, [Op.lte]: nextWeek } },
      order: [['reminder_date', 'ASC']], limit: 10,
    });

    return { medicineReminders, followupReminders };
  }
}

module.exports = new ReminderService();
`;

const reminderController = `const reminderService = require('../services/reminderService');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseUtils');

async function listMedicine(req, res) { try { const r = await reminderService.listMedicineReminders(req.user.userId, req.query); return paginatedResponse(res, r.reminders, r.total, r.page, r.limit); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function getMedicine(req, res) { try { return successResponse(res, await reminderService.getMedicineReminder(req.user.userId, req.params.id)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function createMedicine(req, res) { try { return successResponse(res, await reminderService.createMedicineReminder(req.user.userId, req.validatedBody), 'Reminder created.', 201); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function updateMedicine(req, res) { try { return successResponse(res, await reminderService.updateMedicineReminder(req.user.userId, req.params.id, req.validatedBody)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function deleteMedicine(req, res) { try { return successResponse(res, await reminderService.deleteMedicineReminder(req.user.userId, req.params.id)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function listFollowup(req, res) { try { const r = await reminderService.listFollowupReminders(req.user.userId, req.query); return paginatedResponse(res, r.reminders, r.total, r.page, r.limit); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function getFollowup(req, res) { try { return successResponse(res, await reminderService.getFollowupReminder(req.user.userId, req.params.id)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function createFollowup(req, res) { try { return successResponse(res, await reminderService.createFollowupReminder(req.user.userId, req.validatedBody), 'Reminder created.', 201); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function updateFollowup(req, res) { try { return successResponse(res, await reminderService.updateFollowupReminder(req.user.userId, req.params.id, req.validatedBody)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function deleteFollowup(req, res) { try { return successResponse(res, await reminderService.deleteFollowupReminder(req.user.userId, req.params.id)); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function completeFollowup(req, res) { try { return successResponse(res, await reminderService.completeFollowup(req.user.userId, req.params.id), 'Marked as completed.'); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }
async function getUpcoming(req, res) { try { return successResponse(res, await reminderService.getUpcoming(req.user.userId), 'Upcoming reminders.'); } catch (e) { return errorResponse(res, e.message, e.statusCode || 500); } }

module.exports = { listMedicine, getMedicine, createMedicine, updateMedicine, deleteMedicine, listFollowup, getFollowup, createFollowup, updateFollowup, deleteFollowup, completeFollowup, getUpcoming };
`;

const reminderValidators = `const { z } = require('zod');

const createMedicineReminderSchema = z.object({
  prescriptionId: z.string().uuid().optional().nullable(),
  familyMemberId: z.string().uuid().optional().nullable(),
  medicineName: z.string().min(1).max(200),
  dosage: z.string().min(1).max(100),
  reminderTimes: z.array(z.string()).min(1, 'At least one reminder time is required'),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  notificationMethod: z.string().optional(),
  snoozeMinutes: z.number().int().optional(),
  notes: z.string().optional(),
});
const updateMedicineReminderSchema = createMedicineReminderSchema.partial().extend({ isActive: z.boolean().optional() });

const createFollowupReminderSchema = z.object({
  consultationId: z.string().uuid().optional().nullable(),
  familyMemberId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  reminderDate: z.string().min(1),
  reminderTime: z.string().optional().nullable(),
  reminderType: z.enum(['followup','test','vaccination','checkup','refill','other']).optional(),
  notificationMethod: z.string().optional(),
  notes: z.string().optional(),
});
const updateFollowupReminderSchema = createFollowupReminderSchema.partial().extend({ isActive: z.boolean().optional() });

module.exports = { createMedicineReminderSchema, updateMedicineReminderSchema, createFollowupReminderSchema, updateFollowupReminderSchema };
`;

const reminderRoutes = `const express = require('express');
const router = express.Router();
const c = require('../controllers/reminderController');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { createMedicineReminderSchema, updateMedicineReminderSchema, createFollowupReminderSchema, updateFollowupReminderSchema } = require('../validators/reminderValidators');

router.use(authenticate);
router.get('/upcoming', c.getUpcoming);
router.get('/medicine', c.listMedicine);
router.post('/medicine', validate(createMedicineReminderSchema), c.createMedicine);
router.get('/medicine/:id', c.getMedicine);
router.put('/medicine/:id', validate(updateMedicineReminderSchema), c.updateMedicine);
router.delete('/medicine/:id', c.deleteMedicine);
router.get('/followup', c.listFollowup);
router.post('/followup', validate(createFollowupReminderSchema), c.createFollowup);
router.get('/followup/:id', c.getFollowup);
router.put('/followup/:id', validate(updateFollowupReminderSchema), c.updateFollowup);
router.delete('/followup/:id', c.deleteFollowup);
router.put('/followup/:id/complete', c.completeFollowup);

module.exports = router;
`;

fs.writeFileSync(path.join(base, 'reminder-service', 'src', 'services', 'reminderService.js'), reminderService);
fs.writeFileSync(path.join(base, 'reminder-service', 'src', 'controllers', 'reminderController.js'), reminderController);
fs.writeFileSync(path.join(base, 'reminder-service', 'src', 'validators', 'reminderValidators.js'), reminderValidators);
fs.writeFileSync(path.join(base, 'reminder-service', 'src', 'routes', 'reminderRoutes.js'), reminderRoutes);
console.log('Reminder service files written');

console.log('Phase 3 batch 1 done');
