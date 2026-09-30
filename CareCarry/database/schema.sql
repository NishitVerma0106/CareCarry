-- ============================================================
-- CareCarry Database Schema
-- Version: 2.0 (Updated Architecture)
-- ============================================================

CREATE DATABASE IF NOT EXISTS carecarry_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE carecarry_db;

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('patient', 'doctor', 'hospital_staff', 'admin') NOT NULL,
  phone         VARCHAR(20),
  is_active     TINYINT(1) DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB;

-- ─── PATIENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  patient_id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id                     INT NOT NULL UNIQUE,
  carecarry_id                VARCHAR(20) UNIQUE NOT NULL,
  abha_id                     VARCHAR(30) DEFAULT NULL,
  abha_status                 ENUM('UNLINKED', 'LINKED', 'VERIFIED') DEFAULT 'UNLINKED',
  date_of_birth               DATE,
  gender                      ENUM('male', 'female', 'other', 'prefer_not_to_say'),
  blood_group                 VARCHAR(5),
  allergies                   TEXT,
  address                     TEXT,
  city                        VARCHAR(100),
  state                       VARCHAR(100),
  emergency_contact_name      VARCHAR(100),
  emergency_contact_phone     VARCHAR(20),
  emergency_contact_relation  VARCHAR(50),
  conditions                  TEXT,
  current_medications         TEXT,
  emergency_notes             TEXT,
  created_at                  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_carecarry_id (carecarry_id),
  INDEX idx_abha_id (abha_id)
) ENGINE=InnoDB;

-- ─── QR TOKENS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_tokens (
  token_id    INT AUTO_INCREMENT PRIMARY KEY,
  patient_id  INT NOT NULL UNIQUE,
  token       VARCHAR(50) UNIQUE NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  INDEX idx_token (token)
) ENGINE=InnoDB;

-- ─── HOSPITALS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospitals (
  hospital_id          INT AUTO_INCREMENT PRIMARY KEY,
  name                 VARCHAR(255) NOT NULL,
  registration_number  VARCHAR(100) UNIQUE,
  address              TEXT,
  city                 VARCHAR(100),
  state                VARCHAR(100),
  phone                VARCHAR(20),
  email                VARCHAR(255),
  verification_status  ENUM('pending', 'verified', 'rejected', 'suspended') DEFAULT 'pending',
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_verification (verification_status)
) ENGINE=InnoDB;

-- ─── DOCTORS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  doctor_id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id              INT NOT NULL UNIQUE,
  license_number       VARCHAR(100) UNIQUE,
  specialization       VARCHAR(100),
  hospital_id          INT,
  verification_status  ENUM('pending', 'verified', 'rejected', 'suspended') DEFAULT 'pending',
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL,
  INDEX idx_verification (verification_status)
) ENGINE=InnoDB;

-- ─── HOSPITAL STAFF ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital_staff (
  staff_id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id              INT NOT NULL UNIQUE,
  hospital_id          INT,
  staff_role           VARCHAR(100) DEFAULT 'records_staff',
  verification_status  ENUM('pending', 'verified', 'rejected', 'suspended') DEFAULT 'pending',
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL,
  INDEX idx_hospital (hospital_id)
) ENGINE=InnoDB;

-- ─── ENCOUNTERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS encounters (
  encounter_id       INT AUTO_INCREMENT PRIMARY KEY,
  patient_id         INT NOT NULL,
  hospital_id        INT,
  doctor_id          INT,
  visit_date         DATETIME DEFAULT CURRENT_TIMESTAMP,
  visit_type         ENUM('OPD', 'IPD', 'Emergency', 'Laboratory', 'Imaging', 'Follow-up') DEFAULT 'OPD',
  department         VARCHAR(100) DEFAULT 'General Medicine',
  token_number       VARCHAR(20) DEFAULT NULL,
  status             ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  queue_status       ENUM('waiting', 'in_consultation', 'completed', 'cancelled') DEFAULT 'waiting',
  discharge_summary  TEXT DEFAULT NULL,
  discharge_date     DATETIME DEFAULT NULL,
  notes              TEXT,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL,
  FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
  INDEX idx_patient (patient_id),
  INDEX idx_hospital (hospital_id),
  INDEX idx_visit_date (visit_date),
  INDEX idx_queue_status (queue_status)
) ENGINE=InnoDB;

-- ─── CONSULTATIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  consultation_id  INT AUTO_INCREMENT PRIMARY KEY,
  encounter_id     INT NOT NULL,
  doctor_id        INT,
  symptoms         TEXT,
  clinical_notes   TEXT,
  follow_up        TEXT,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (encounter_id) REFERENCES encounters(encounter_id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
  INDEX idx_encounter (encounter_id)
) ENGINE=InnoDB;

-- ─── DIAGNOSES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnoses (
  diagnosis_id     INT AUTO_INCREMENT PRIMARY KEY,
  consultation_id  INT NOT NULL,
  diagnosis        TEXT NOT NULL,
  icd_code         VARCHAR(20),
  remarks          TEXT,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id),
  INDEX idx_consultation (consultation_id)
) ENGINE=InnoDB;

-- ─── PRESCRIPTIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  prescription_id  INT AUTO_INCREMENT PRIMARY KEY,
  consultation_id  INT NOT NULL,
  instructions     TEXT,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id),
  INDEX idx_consultation (consultation_id)
) ENGINE=InnoDB;

-- ─── PRESCRIPTION ITEMS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescription_items (
  item_id          INT AUTO_INCREMENT PRIMARY KEY,
  prescription_id  INT NOT NULL,
  medicine_name    VARCHAR(255) NOT NULL,
  dosage           VARCHAR(100),
  frequency        VARCHAR(100),
  duration         VARCHAR(100),
  notes            TEXT,
  status           ENUM('PENDING', 'DISPENSED') DEFAULT 'PENDING',
  dispensed_at     DATETIME DEFAULT NULL,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
  INDEX idx_prescription (prescription_id)
) ENGINE=InnoDB;

-- ─── LAB ORDERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_orders (
  order_id         INT AUTO_INCREMENT PRIMARY KEY,
  encounter_id     INT NOT NULL,
  patient_id       INT NOT NULL,
  hospital_id      INT,
  ordered_by       INT,
  test_name        VARCHAR(255) NOT NULL,
  status           ENUM('ORDERED', 'SAMPLE_COLLECTED', 'COMPLETED', 'CANCELLED') DEFAULT 'ORDERED',
  notes            TEXT,
  result_report_id INT DEFAULT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (encounter_id) REFERENCES encounters(encounter_id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  INDEX idx_enc (encounter_id),
  INDEX idx_pat (patient_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ─── MEDICAL REPORTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_reports (
  report_id             INT AUTO_INCREMENT PRIMARY KEY,
  patient_id            INT NOT NULL,
  encounter_id          INT,
  hospital_id           INT,
  document_type         ENUM('lab_report', 'xray', 'mri', 'ct_scan', 'discharge_summary',
                              'ultrasound', 'ecg', 'other') DEFAULT 'other',
  title                 VARCHAR(255),
  description           TEXT,
  report_date           DATE,
  hospital_name         VARCHAR(255),
  file_name             VARCHAR(255) NOT NULL,
  cloudinary_public_id  VARCHAR(500) NOT NULL,
  secure_file_url       TEXT NOT NULL,
  uploaded_by           INT,
  uploaded_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  FOREIGN KEY (encounter_id) REFERENCES encounters(encounter_id) ON DELETE SET NULL,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_patient (patient_id),
  INDEX idx_encounter (encounter_id)
) ENGINE=InnoDB;

-- ─── ACCESS GRANTS (Consent) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS access_grants (
  grant_id      INT AUTO_INCREMENT PRIMARY KEY,
  patient_id    INT NOT NULL,
  grantee_id    INT NOT NULL,  -- doctor or hospital_staff user_id
  grantee_role  ENUM('doctor', 'hospital_staff') NOT NULL,
  scope         ENUM('full', 'clinical_summary', 'reports', 'prescriptions') DEFAULT 'clinical_summary',
  status        ENUM('pending', 'approved', 'rejected', 'revoked', 'expired') DEFAULT 'pending',
  expires_at    DATETIME,
  requested_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  responded_at  DATETIME,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  FOREIGN KEY (grantee_id) REFERENCES users(user_id),
  INDEX idx_patient (patient_id),
  INDEX idx_grantee (grantee_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id         INT AUTO_INCREMENT PRIMARY KEY,
  actor_id       INT,
  actor_role     VARCHAR(50),
  action         VARCHAR(100) NOT NULL,
  patient_id     INT,
  encounter_id   INT,
  resource_type  VARCHAR(50),
  resource_id    INT,
  ip_address     VARCHAR(45),
  user_agent     TEXT,
  extra_data     JSON,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_actor (actor_id),
  INDEX idx_action (action),
  INDEX idx_patient (patient_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  notification_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  title            VARCHAR(255) NOT NULL,
  message          TEXT NOT NULL,
  type             VARCHAR(50) DEFAULT 'info',
  is_read          TINYINT(1) DEFAULT 0,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_read (is_read)
) ENGINE=InnoDB;

-- ─── ISSUE REPORTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issue_reports (
  issue_id    INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT,
  title       VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status      ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── HEALTH PROVIDERS (Interoperability Network) ──────────────────────────────
CREATE TABLE IF NOT EXISTS health_providers (
  provider_id    VARCHAR(50) PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  provider_code  VARCHAR(50) UNIQUE NOT NULL,
  facility_type  ENUM('HOSPITAL_HIS', 'DIAGNOSTIC_LAB', 'CLINIC_EMR', 'GOVERNMENT_NETWORK') DEFAULT 'HOSPITAL_HIS',
  endpoint_url   VARCHAR(255) NOT NULL,
  adapter_type   VARCHAR(50) DEFAULT 'REST_ADAPTER',
  status         ENUM('ACTIVE', 'MAINTENANCE', 'DEPRECATED') DEFAULT 'ACTIVE',
  records_count  INT DEFAULT 0,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── PROVIDER PATIENT MAPPINGS (Identity Matching) ───────────────────────────
CREATE TABLE IF NOT EXISTS provider_patient_mappings (
  mapping_id    INT AUTO_INCREMENT PRIMARY KEY,
  patient_id    INT NOT NULL,
  carecarry_id  VARCHAR(20) NOT NULL,
  provider_id   VARCHAR(50) NOT NULL,
  provider_mrn  VARCHAR(100) NOT NULL,
  match_status  ENUM('MATCHED', 'PENDING_CONSENT', 'REJECTED') DEFAULT 'MATCHED',
  matched_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES health_providers(provider_id) ON DELETE CASCADE,
  UNIQUE KEY uq_provider_mrn (provider_id, provider_mrn),
  UNIQUE KEY uq_patient_provider (patient_id, provider_id),
  INDEX idx_carecarry (carecarry_id)
) ENGINE=InnoDB;

-- ─── FEDERATED RECORD REFERENCES (Interoperability Access Layer) ──────────────
CREATE TABLE IF NOT EXISTS federated_record_references (
  record_id             VARCHAR(50) PRIMARY KEY,
  patient_id            INT NOT NULL,
  carecarry_id          VARCHAR(20) NOT NULL,
  provider_id           VARCHAR(50) NOT NULL,
  record_type           ENUM('LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'IMAGING_STUDY', 'CLINICAL_NOTE') NOT NULL,
  title                 VARCHAR(255) NOT NULL,
  encounter_ref         VARCHAR(50) DEFAULT NULL,
  source_record_id      VARCHAR(100) NOT NULL,
  source_facility_name  VARCHAR(255) NOT NULL,
  source_doctor_name    VARCHAR(255) DEFAULT NULL,
  source_created_at     DATETIME NOT NULL,
  access_method         ENUM('FEDERATED_API', 'FHIR_R4', 'CLOUD_FALLBACK') DEFAULT 'FEDERATED_API',
  mime_type             VARCHAR(100) DEFAULT 'application/pdf',
  summary_snippet       TEXT DEFAULT NULL,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES health_providers(provider_id) ON DELETE CASCADE,
  INDEX idx_pat_records (patient_id),
  INDEX idx_cc_records (carecarry_id),
  INDEX idx_provider (provider_id)
) ENGINE=InnoDB;
