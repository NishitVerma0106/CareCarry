/**
 * CareCarry Interoperability Gateway — Provider Adapter Registry
 * Implements the Integration Adapter Pattern to connect heterogeneous Hospital HIS / EMR systems.
 */

// Simulated Source Hospital Document Payloads
const mockHospitalDocuments = {
  'LAB-AP-88219': {
    sourceRecordId: 'LAB-AP-88219',
    hospitalName: 'Apollo Hospitals Central HIS',
    hospitalCode: 'APOLLO_HIS',
    patientName: 'Rajan Kumar',
    mrn: 'AP-7K3QX9AB',
    date: '2026-08-14',
    doctor: 'Dr. Rajesh Nair (Chief Biochemist)',
    title: 'Comprehensive Metabolic Panel & Lipid Profile',
    data: {
      totalCholesterol: '182 mg/dL (Desirable: <200)',
      hdlCholesterol: '48 mg/dL (Normal: >40)',
      ldlCholesterol: '105 mg/dL (Optimal: <100)',
      triglycerides: '145 mg/dL (Normal: <150)',
      fastingGlucose: '94 mg/dL (Normal: 70-99)',
      serumCreatinine: '0.92 mg/dL (Normal: 0.7-1.3)',
      eGFR: '>90 mL/min/1.73m²',
    },
    interpretation: 'Normal fasting lipid and renal functional parameters. Cardiac risk index: Low (3.79).',
    signedBy: 'Dr. Rajesh Nair, MD (Biochemistry), Apollo Central Laboratories',
  },
  'RAD-AP-77312': {
    sourceRecordId: 'RAD-AP-77312',
    hospitalName: 'Apollo Hospitals Central HIS',
    hospitalCode: 'APOLLO_HIS',
    patientName: 'Rajan Kumar',
    mrn: 'AP-7K3QX9AB',
    date: '2026-08-15',
    doctor: 'Dr. Sunita Mehta, MD, DM (Cardiology)',
    title: '2D Echocardiography & Color Doppler Study',
    findings: {
      leftVentricle: 'Normal cavity size, no regional wall motion abnormality (RWMA)',
      leftVentricularEF: 'LVEF 62% (Normal range 55-70%)',
      valves: 'Aortic, Mitral, Tricuspid and Pulmonary valves structurally normal. No regurgitation.',
      pericardium: 'No pericardial effusion',
      aorticRoot: 'Normal dimension (28mm)',
    },
    conclusion: 'Normal resting 2D Echo and color Doppler examination. Preserved LV systolic function.',
    signedBy: 'Dr. Sunita Mehta, Senior Consultant Cardiologist, Apollo Heart Centre',
  },
  'DIS-MAX-90142': {
    sourceRecordId: 'DIS-MAX-90142',
    hospitalName: 'Max Super Specialty EMR Network',
    hospitalCode: 'MAX_EMR',
    patientName: 'Rajan Kumar',
    mrn: 'MAX-7K3QX9AB',
    date: '2026-07-28',
    doctor: 'Dr. K. S. Verma (Head of Pulmonology)',
    title: 'Inpatient Discharge Summary — Acute Bronchitis',
    admissionDate: '2026-07-25',
    dischargeDate: '2026-07-28',
    clinicalCourse: 'Patient admitted with productive cough, mild dyspnea, and low-grade pyrexia. Treated with nebulized bronchodilators and oral antibiotics. Marked clinical recovery observed on Day 3. Vitals stable.',
    dischargeMedications: [
      'Azithromycin 500mg once daily for 2 more days',
      'Formoterol + Budesonide inhaler 200mcg 1 puff twice daily',
      'Montelukast 10mg once at bedtime for 30 days',
    ],
    followUp: 'Review in Pulmonology OPD after 2 weeks with repeat chest auscultation.',
    signedBy: 'Dr. K. S. Verma, MD (Pulmonary Medicine), Max Healthcare',
  },
  'RX-MAX-33120': {
    sourceRecordId: 'RX-MAX-33120',
    hospitalName: 'Max Super Specialty EMR Network',
    hospitalCode: 'MAX_EMR',
    patientName: 'Rajan Kumar',
    mrn: 'MAX-7K3QX9AB',
    date: '2026-07-28',
    doctor: 'Dr. K. S. Verma (Pulmonology)',
    title: 'Discharge Prescription & Inhaler Protocol',
    items: [
      { medicine: 'Budesonide 200mcg Inhaler', dosage: '1 puff', frequency: 'Twice daily', duration: '30 days' },
      { medicine: 'Montelukast 10mg Tablets', dosage: '1 tablet', frequency: 'Bedtime', duration: '30 days' },
      { medicine: 'Levocetirizine 5mg', dosage: '1 tablet', frequency: 'As needed for allergic rhinitis', duration: '15 days' },
    ],
    signedBy: 'Dr. K. S. Verma, Max Super Specialty Hospital',
  },
};

/**
 * Apollo Central HIS Adapter
 */
class ApolloHisAdapter {
  constructor(providerConfig) {
    this.providerId = providerConfig.provider_id || 'HOSP-001';
    this.name = 'Apollo Hospitals Central HIS';
  }

  async patientMatch({ carecarryId, abhaId, phone }) {
    return {
      matched: true,
      providerId: this.providerId,
      providerName: this.name,
      providerMrn: `AP-${carecarryId.substring(3)}`,
      matchScore: 0.98,
      registeredAtSource: '2024-03-12',
    };
  }

  async discoverRecords({ providerMrn, carecarryId }) {
    return [
      {
        recordId: 'REC-APOLLO-01',
        carecarryId,
        providerId: this.providerId,
        sourceFacilityName: this.name,
        recordType: 'LAB_REPORT',
        title: 'Comprehensive Metabolic Panel & Lipid Profile',
        encounterRef: 'ENC-AP-4091',
        sourceRecordId: 'LAB-AP-88219',
        sourceDoctorName: 'Dr. Rajesh Nair (Chief Biochemist)',
        sourceCreatedAt: '2026-08-14T11:30:00Z',
        accessMethod: 'FEDERATED_API',
        mimeType: 'application/json',
        summarySnippet: 'Total Cholesterol: 182 mg/dL, HDL: 48 mg/dL, Triglycerides: 145 mg/dL. Renal profile within normal limits.',
      },
      {
        recordId: 'REC-APOLLO-02',
        carecarryId,
        providerId: this.providerId,
        sourceFacilityName: this.name,
        recordType: 'IMAGING_STUDY',
        title: '2D Echocardiography & Color Doppler Study',
        encounterRef: 'ENC-AP-4091',
        sourceRecordId: 'RAD-AP-77312',
        sourceDoctorName: 'Dr. Sunita Mehta (Cardiologist)',
        sourceCreatedAt: '2026-08-15T14:15:00Z',
        accessMethod: 'FEDERATED_API',
        mimeType: 'application/json',
        summarySnippet: 'LVEF 62%, normal wall motion, valves structurally intact, normal diastolic filling.',
      },
    ];
  }

  async fetchDocument({ sourceRecordId }) {
    const doc = mockHospitalDocuments[sourceRecordId];
    if (!doc) {
      return {
        found: false,
        message: `Record ${sourceRecordId} not found in Apollo HIS archives.`,
      };
    }
    return {
      found: true,
      source: this.name,
      sourceRecordId,
      retrievedAt: new Date().toISOString(),
      document: doc,
    };
  }
}

/**
 * Max Healthcare EMR FHIR Adapter
 */
class MaxEmrAdapter {
  constructor(providerConfig) {
    this.providerId = providerConfig.provider_id || 'HOSP-002';
    this.name = 'Max Super Specialty EMR Network';
  }

  async patientMatch({ carecarryId, abhaId, phone }) {
    return {
      matched: true,
      providerId: this.providerId,
      providerName: this.name,
      providerMrn: `MAX-${carecarryId.substring(3)}`,
      matchScore: 0.95,
      registeredAtSource: '2025-01-19',
    };
  }

  async discoverRecords({ providerMrn, carecarryId }) {
    return [
      {
        recordId: 'REC-MAX-01',
        carecarryId,
        providerId: this.providerId,
        sourceFacilityName: this.name,
        recordType: 'DISCHARGE_SUMMARY',
        title: 'Inpatient Discharge Summary — Acute Bronchitis',
        encounterRef: 'ENC-MAX-1029',
        sourceRecordId: 'DIS-MAX-90142',
        sourceDoctorName: 'Dr. K. S. Verma (Head of Pulmonology)',
        sourceCreatedAt: '2026-07-28T17:00:00Z',
        accessMethod: 'FHIR_R4',
        mimeType: 'application/json',
        summarySnippet: 'Resolved acute respiratory infection. Treated with azithromycin & nebulization. Vitals stable on discharge.',
      },
      {
        recordId: 'REC-MAX-02',
        carecarryId,
        providerId: this.providerId,
        sourceFacilityName: this.name,
        recordType: 'PRESCRIPTION',
        title: 'Discharge Prescription & Inhaler Protocol',
        encounterRef: 'ENC-MAX-1029',
        sourceRecordId: 'RX-MAX-33120',
        sourceDoctorName: 'Dr. K. S. Verma (Pulmonology)',
        sourceCreatedAt: '2026-07-28T17:15:00Z',
        accessMethod: 'FHIR_R4',
        mimeType: 'application/json',
        summarySnippet: 'Budesonide 200mcg Inhaler 1 puff BID, Montelukast 10mg QHS for 30 days.',
      },
    ];
  }

  async fetchDocument({ sourceRecordId }) {
    const doc = mockHospitalDocuments[sourceRecordId];
    if (!doc) {
      return {
        found: false,
        message: `Record ${sourceRecordId} not found in Max EMR repository.`,
      };
    }
    return {
      found: true,
      source: this.name,
      sourceRecordId,
      retrievedAt: new Date().toISOString(),
      document: doc,
    };
  }
}

/**
 * Fortis Healthcare Clinical Network Adapter
 */
class FortisNetAdapter {
  constructor(providerConfig) {
    this.providerId = providerConfig.provider_id || 'HOSP-003';
    this.name = 'Fortis Clinical Care Systems';
  }

  async patientMatch({ carecarryId }) {
    return {
      matched: true,
      providerId: this.providerId,
      providerName: this.name,
      providerMrn: `FORT-${carecarryId.substring(3)}`,
      matchScore: 0.94,
      registeredAtSource: '2025-06-04',
    };
  }

  async discoverRecords({ carecarryId }) {
    return [
      {
        recordId: 'REC-FORTIS-01',
        carecarryId,
        providerId: this.providerId,
        sourceFacilityName: this.name,
        recordType: 'CLINICAL_NOTE',
        title: 'Annual Executive Health Checkup & TMT Report',
        encounterRef: 'ENC-FORT-8821',
        sourceRecordId: 'CHK-FORT-11029',
        sourceDoctorName: 'Dr. Ananya Roy (Internal Medicine)',
        sourceCreatedAt: '2026-05-10T10:00:00Z',
        accessMethod: 'FEDERATED_API',
        mimeType: 'application/json',
        summarySnippet: 'Treadmill Test (TMT) Negative for inducible myocardial ischemia at 10.2 METs. Resting BP 118/76 mmHg.',
      },
    ];
  }

  async fetchDocument({ sourceRecordId }) {
    return {
      found: true,
      source: this.name,
      sourceRecordId,
      retrievedAt: new Date().toISOString(),
      document: {
        sourceRecordId,
        hospitalName: this.name,
        title: 'Executive Health Checkup & TMT Stress Test',
        protocol: 'Bruce Protocol (10.2 METs achieved, Target Heart Rate 88%)',
        result: 'Negative for inducible ischemia. Normal blood pressure response.',
        signedBy: 'Dr. Ananya Roy, Senior Consultant, Fortis Healthcare',
      },
    };
  }
}

/**
 * Provider Adapter Factory
 */
class ProviderAdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.initDefaultAdapters();
  }

  initDefaultAdapters() {
    this.registerAdapter('HOSP-001', new ApolloHisAdapter({ provider_id: 'HOSP-001' }));
    this.registerAdapter('HOSP-002', new MaxEmrAdapter({ provider_id: 'HOSP-002' }));
    this.registerAdapter('HOSP-003', new FortisNetAdapter({ provider_id: 'HOSP-003' }));
  }

  registerAdapter(providerId, adapterInstance) {
    this.adapters.set(providerId, adapterInstance);
  }

  getAdapter(providerId) {
    return this.adapters.get(providerId) || null;
  }

  getAllAdapters() {
    return Array.from(this.adapters.entries()).map(([id, adapter]) => ({
      providerId: id,
      name: adapter.name,
      adapterClass: adapter.constructor.name,
    }));
  }
}

const adapterRegistry = new ProviderAdapterRegistry();

module.exports = {
  adapterRegistry,
  mockHospitalDocuments,
};
