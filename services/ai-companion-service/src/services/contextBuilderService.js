const NodeCache = require('node-cache');
const { sequelize } = require('../config/database');
const logger = require('../config/logger');

const cache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

async function fetchFromService(url, userId) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-user-id': userId,
        'x-user-email': 'internal-ai@docbridge.health',
        'x-user-role': 'patient',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      logger.error(`Error fetching from ${url}: Status ${response.status}`);
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    logger.error(`Failed to fetch from ${url}: ${error.message}`);
    return [];
  }
}

async function buildUserContext(userId) {
  const cacheKey = `context_${userId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug(`Using cached health context for user ${userId}`);
    return cached;
  }

  logger.debug(`Building fresh health context for user ${userId}`);

  try {
    const consultationsPromise = fetchFromService(`http://localhost:3002/api/v1/consultations?limit=5`, userId);
    const medicationsPromise = fetchFromService(`http://localhost:3003/api/v1/prescriptions/active`, userId);
    const symptomsPromise = fetchFromService(`http://localhost:3006/api/v1/symptoms/ongoing`, userId);
    const labReportsPromise = fetchFromService(`http://localhost:3005/api/v1/lab-reports?limit=3`, userId);

    const userPromise = sequelize.query(
      `SELECT first_name, last_name, date_of_birth, gender, blood_group, known_allergies, chronic_conditions
       FROM users WHERE id = :userId`,
      { replacements: { userId }, raw: true }
    );

    const [consultations, medications, symptoms, labReports, [userInfo]] = await Promise.all([
      consultationsPromise,
      medicationsPromise,
      symptomsPromise,
      labReportsPromise,
      userPromise
    ]);

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
  cache.del(`context_${userId}`);
}

module.exports = { buildUserContext, invalidateCache };
