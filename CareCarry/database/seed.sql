-- ============================================================
-- CareCarry Seed Data
-- Demo data for development and testing
-- ============================================================

USE carecarry_db;

-- Admin user (password: Admin@1234)
INSERT INTO users (first_name, last_name, email, password_hash, role, phone) VALUES
('CareCarry', 'Admin', 'admin@carecarry.in',
 '$2b$12$xOqqhQOrlYDeRjc0kIxOoOVhfqcFcqa/jXCoWcd807klMSNRQi89C',
 'admin', '9000000000');

-- Sample hospital
INSERT INTO hospitals (name, registration_number, address, city, state, phone, email, verification_status) VALUES
('ABC Government Hospital', 'HOS-MH-2024-001', '123 Main Road, Andheri', 'Mumbai', 'Maharashtra', '9100000001', 'abc@hospital.in', 'verified'),
('City Medical Centre', 'HOS-DL-2024-002', '45 Ring Road, Dwarka', 'Delhi', 'Delhi', '9100000002', 'city@medical.in', 'verified');

-- Sample patient (password: Patient@1234)
INSERT INTO users (first_name, last_name, email, password_hash, role, phone) VALUES
('Rajan', 'Kumar', 'rajan@example.com',
 '$2b$12$MPr7ZcrEzTxgZo5Emjk9FO7KzkaJiXf/Sno5goL9RrAvySGbbgibK',
 'patient', '9800000001');

INSERT INTO patients (user_id, carecarry_id, date_of_birth, gender, blood_group, allergies, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relation) VALUES
(2, 'CC-7K3QX9AB', '1990-06-15', 'male', 'O+', 'Penicillin, Dust',
 'Room 4, Migrant Colony, Dharavi, Mumbai',
 'Sunita Kumar', '9700000001', 'Wife');

-- Sample doctor (password: Doctor@1234)
INSERT INTO users (first_name, last_name, email, password_hash, role, phone) VALUES
('Priya', 'Sharma', 'dr.sharma@example.com',
 '$2b$12$ogA8JzYGxoPoQ4NkQHuTCue3o59i5DjXz32/z.TmwNQb451d2gzMm',
 'doctor', '9600000001');

INSERT INTO doctors (user_id, license_number, specialization, hospital_id, verification_status) VALUES
(3, 'MH-DOC-123456', 'General Medicine', 1, 'verified');

-- Sample hospital staff (password: Staff@1234)
INSERT INTO users (first_name, last_name, email, password_hash, role, phone) VALUES
('Anil', 'Patil', 'anil.staff@abc.in',
 '$2b$12$BtFSDymd.alUI/OhXxgmwuVaxO3rowzLFByx/lidZkRd6yETQECtG',
 'hospital_staff', '9500000001');

INSERT INTO hospital_staff (user_id, hospital_id, staff_role, verification_status) VALUES
(4, 1, 'records_staff', 'verified');

-- Sample encounter
INSERT INTO encounters (patient_id, hospital_id, doctor_id, visit_date, visit_type, status, notes) VALUES
(1, 1, 1, '2026-09-28 10:30:00', 'OPD', 'completed', 'Routine checkup');

-- Sample consultation
INSERT INTO consultations (encounter_id, doctor_id, symptoms, clinical_notes, follow_up) VALUES
(1, 1,
 'Fever for 3 days, mild cough, body ache',
 'Patient presents with viral fever. BP: 120/80. Temp: 101.2°F. Lungs clear.',
 'Review after 5 days. Return immediately if fever exceeds 103°F.');

-- Sample diagnosis
INSERT INTO diagnoses (consultation_id, diagnosis, icd_code, remarks) VALUES
(1, 'Viral Fever (Non-specific)', 'A09', 'Likely viral etiology. No bacterial infection signs.');

-- Sample prescription
INSERT INTO prescriptions (consultation_id, instructions) VALUES
(1, 'Take medicines after food. Rest and hydration recommended. Avoid cold foods.');

INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, notes) VALUES
(1, 'Paracetamol 500mg', '1 tablet', 'Twice a day (morning and night)', '5 days', 'Only when fever > 99°F'),
(1, 'Cetirizine 10mg', '1 tablet', 'Once daily at night', '5 days', 'For cough and cold symptoms'),
(1, 'ORS Sachet', '1 sachet in 1L water', 'Twice a day', '3 days', 'For hydration');

-- Second encounter (older - from another city)
INSERT INTO encounters (patient_id, hospital_id, doctor_id, visit_date, visit_type, status, notes) VALUES
(1, 2, 1, '2026-08-15 09:00:00', 'OPD', 'completed', 'Follow up visit from Delhi');

INSERT INTO consultations (encounter_id, doctor_id, symptoms, clinical_notes, follow_up) VALUES
(2, 1, 'Recurring back pain', 'Muscle spasm in lumbar region. No neurological signs.', 'Physiotherapy recommended.');

INSERT INTO diagnoses (consultation_id, diagnosis, remarks) VALUES
(2, 'Lumbar Muscle Spasm', 'Non-specific low back pain.');

INSERT INTO prescriptions (consultation_id, instructions) VALUES
(2, 'Hot fomentation twice daily. Avoid heavy lifting.');

INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration) VALUES
(2, 'Diclofenac 50mg', '1 tablet', 'Twice daily after food', '3 days'),
(2, 'Muscle Relaxant (Thiocolchicoside)', '4mg', 'Twice daily', '5 days');
