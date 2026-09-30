import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { hospitalService } from '../../services';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DOC_TYPES = [
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'xray', label: 'X-Ray' },
  { value: 'mri', label: 'MRI Scan' },
  { value: 'ct_scan', label: 'CT Scan' },
  { value: 'ultrasound', label: 'Ultrasound' },
  { value: 'ecg', label: 'ECG' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'other', label: 'Other Document' },
];

export default function ReportUpload() {
  const [form, setForm] = useState({ patient_id: '', encounter_id: '', document_type: 'lab_report' });
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(null);

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(f.type)) {
      toast.error('Invalid file type. Use PDF, JPG, PNG, or WEBP.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB.');
      return;
    }
    setFile(f);
    setUploaded(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file.'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', form.patient_id);
      formData.append('document_type', form.document_type);
      if (form.encounter_id) formData.append('encounter_id', form.encounter_id);

      const res = await hospitalService.uploadReport(formData);
      setUploaded(res.data.data);
      setFile(null);
      toast.success('Report uploaded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Upload Medical Report" />
        <div className="page-content">
          <div className="page-header">
            <div className="page-title">Upload Medical Document</div>
            <p className="page-subtitle">Upload lab reports, imaging, discharge summaries and other documents to a patient encounter</p>
          </div>

          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {uploaded && (
              <div className="alert alert-success animate-fade-in" style={{ marginBottom: 24 }}>
                <CheckCircle size={20} />
                <div>
                  <strong>Upload successful!</strong><br />
                  File: {uploaded.fileName} · Type: {uploaded.documentType}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 className="card-title" style={{ marginBottom: 16 }}>Report Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="upload-patient-id">Patient ID</label>
                    <input id="upload-patient-id" className="form-input" placeholder="Patient ID (number)" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="upload-encounter-id">Encounter ID (Optional)</label>
                    <input id="upload-encounter-id" className="form-input" placeholder="Encounter #" value={form.encounter_id} onChange={(e) => setForm({ ...form, encounter_id: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="upload-doc-type">Document Type</label>
                  <select id="upload-doc-type" className="form-input" value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
                    {DOC_TYPES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drop Zone */}
              <div
                id="file-drop-zone"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--cc-primary-light)' : file ? '#10b981' : 'var(--cc-border-strong)'}`,
                  borderRadius: 'var(--cc-radius-xl)',
                  padding: '48px 32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver ? 'rgba(99,102,241,0.05)' : file ? 'rgba(16,185,129,0.04)' : 'var(--cc-surface)',
                  transition: 'var(--cc-transition)',
                  marginBottom: 20,
                }}
              >
                <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />

                {file ? (
                  <div>
                    <CheckCircle size={40} color="#10b981" style={{ marginBottom: 12 }} />
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{file.name}</div>
                    <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      style={{ marginTop: 12, color: '#ef4444' }}
                    >
                      <X size={14} /> Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={40} color="var(--cc-text-muted)" style={{ marginBottom: 12 }} />
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Drop file here or click to browse</div>
                    <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem' }}>
                      PDF, JPG, PNG, WEBP · Max 10MB
                    </div>
                  </div>
                )}
              </div>

              <div className="alert alert-info" style={{ marginBottom: 20 }}>
                <FileText size={18} />
                <span>Files are stored privately in Cloudinary. Only authorized personnel and the patient can view them.</span>
              </div>

              <button type="submit" id="upload-submit" className="btn btn-primary btn-full btn-lg" disabled={uploading || !file}>
                {uploading ? <><div className="spinner" /> Uploading...</> : <><Upload size={18} /> Upload Report</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
