import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const patientService = {
  getProfile: () => api.get('/patient/me'),
  updateProfile: (data) => api.put('/patient/me', data),
  getCareCarryId: () => api.get('/patient/carecard'),
  getTimeline: () => api.get('/patient/timeline'),
  getReports: () => api.get('/patient/reports'),
  uploadReport: (formData) =>
    api.post('/patient/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getConsultations: () => api.get('/patient/consultations'),
  getPrescriptions: () => api.get('/patient/prescriptions'),
  getAccess: () => api.get('/patient/access'),
  updateConsent: (id, status) => api.patch(`/patient/access/${id}`, { status }),
  approveConsent: (id) => api.post(`/patient/access/${id}/approve`),
  rejectConsent: (id) => api.post(`/patient/access/${id}/reject`),
  revokeConsent: (id) => api.post(`/patient/access/${id}/revoke`),
};

export const doctorService = {
  getQueue: (params) => api.get('/doctor/encounters', { params }),
  getEncounters: (params) => api.get('/doctor/encounters', { params }),
  getClinicalSummary: (encounterOrPatientId) =>
    api.get(`/doctor/encounters/${encounterOrPatientId}/clinical-summary`),
  getPatientSummary: (patientId) =>
    api.get(`/doctor/patients/${patientId}/summary`),
  createConsultation: (data) => api.post('/doctor/consultations', data),
  updateConsultation: (id, data) => api.put(`/doctor/consultations/${id}`, data),
  createDiagnosis: (data) => api.post('/doctor/diagnoses', data),
  createPrescription: (data) => api.post('/doctor/prescriptions', data),
  getPatientHistory: (patientId) => api.get(`/doctor/patients/${patientId}/history`),
  updateEncounterStatus: (id, queue_status) =>
    api.patch(`/doctor/encounters/${id}/status`, { queue_status }),
  createLabOrder: (encounterId, data) =>
    api.post(`/encounters/${encounterId}/lab-orders`, data),
};

export const hospitalService = {
  resolvePatient: (data) => api.post('/hospital/patients/resolve', data),
  lookupPatient: (data) => api.post('/hospital/patients/resolve', data),
  getDoctors: () => api.get('/hospital/doctors'),
  createEncounter: (data) => api.post('/hospital/encounters', data),
  getEncounters: (params) => api.get('/hospital/encounters', { params }),
  getTodaysEncounters: () => api.get('/hospital/encounters'),
  getEncounter: (id) => api.get(`/hospital/encounters/${id}`),
  updateEncounterStatus: (id, queue_status) =>
    api.patch(`/hospital/encounters/${id}/status`, { queue_status }),
  dischargeEncounter: (id, data) =>
    api.post(`/hospital/encounters/${id}/discharge`, data),
  getStats: () => api.get('/hospital/stats'),
  getDepartments: () => api.get('/hospital/departments'),
  uploadReport: (formData, encounterId) => {
    const url = encounterId
      ? `/hospital/encounters/${encounterId}/reports`
      : '/hospital/reports';
    return api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getEncounterReports: (id) => api.get(`/hospital/encounters/${id}/reports`),
  // Lab Integration
  createLabOrder: (encounterId, data) =>
    api.post(`/hospital/encounters/${encounterId}/lab-orders`, data),
  getLabOrders: (encounterId) =>
    api.get('/hospital/lab-orders', { params: encounterId ? { encounterId } : {} }),
  updateLabOrderStatus: (orderId, data) =>
    api.patch(`/hospital/lab-orders/${orderId}/status`, data),
  // Pharmacy Integration
  getPharmacyPrescriptions: (encounterId) =>
    api.get('/hospital/pharmacy/prescriptions', { params: encounterId ? { encounterId } : {} }),
  dispenseMedication: (itemId, status = 'DISPENSED') =>
    api.patch(`/hospital/pharmacy/items/${itemId}/dispense`, { status }),
};

export const identityService = {
  resolveQr: (token) => api.post('/identity/qr/resolve', { qrToken: token, token }),
  resolveCarecarryId: (id) => api.get(`/identity/resolve/${id}`),
};

export const adminService = {
  getPendingDoctors: () => api.get('/admin/doctors/pending'),
  getAllDoctors: () => api.get('/admin/doctors'),
  verifyDoctor: (id, status = 'verified') => api.patch(`/admin/doctors/${id}/verify`, { status }),
  suspendDoctor: (id) => api.patch(`/admin/doctors/${id}/suspend`),
  getPendingHospitals: () => api.get('/admin/hospitals/pending'),
  getAllHospitals: () => api.get('/admin/hospitals'),
  verifyHospital: (id, status = 'verified') => api.patch(`/admin/hospitals/${id}/verify`, { status }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getStatistics: () => api.get('/admin/statistics'),
  getAllUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (id, status) => api.patch(`/admin/users/${id}/status`, { status }),
  toggleUserActive: (id) => api.patch(`/admin/users/${id}/toggle-active`),
};

export const interoperabilityService = {
  getProviders: () => api.get('/interoperability/providers'),
  getStats: () => api.get('/interoperability/stats'),
  patientMatch: (data) => api.post('/interoperability/patient-match', data),
  discoverRecords: (carecarryId) => api.get(`/interoperability/patient/${carecarryId}/records`),
  fetchFederatedDocument: (recordId) => api.get(`/interoperability/records/${recordId}/fetch`),
  linkAbha: (data) => api.post('/interoperability/abha/link', data),
};
