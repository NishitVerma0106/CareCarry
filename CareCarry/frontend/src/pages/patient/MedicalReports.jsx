import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { patientService } from '../../services';
import { Upload, FileText, CheckCircle, X, ExternalLink, Calendar, Hospital, AlertCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const DOC_TYPES = [
  { value: 'lab_report', label: 'Lab Report / Blood Test' },
  { value: 'xray', label: 'X-Ray' },
  { value: 'mri', label: 'MRI Scan' },
  { value: 'ct_scan', label: 'CT Scan' },
  { value: 'ultrasound', label: 'Ultrasound' },
  { value: 'ecg', label: 'ECG Report' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'prescription', label: 'Prescription Slip' },
  { value: 'other', label: 'Other Document' },
];

export default function MedicalReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload form state
  const [form, setForm] = useState({
    document_type: 'lab_report',
    title: '',
    hospital_name: '',
    report_date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await patientService.getReports();
      setReports(res.data.data || []);
    } catch {
      toast.error('Failed to load medical reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(f.type)) {
      toast.error('Please upload a PDF, JPG, PNG, or WEBP file.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }
    setFile(f);
    if (!form.title) {
      setForm((prev) => ({ ...prev, title: f.name.replace(/\.[^/.]+$/, '') }));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', form.document_type);
      formData.append('title', form.title || file.name);
      formData.append('hospital_name', form.hospital_name);
      formData.append('report_date', form.report_date);
      formData.append('description', form.description);

      const res = await patientService.uploadReport(formData);
      toast.success(res.data.message || 'Medical report uploaded successfully!');
      setShowUploadModal(false);
      setFile(null);
      setForm({
        document_type: 'lab_report',
        title: '',
        hospital_name: '',
        report_date: new Date().toISOString().split('T')[0],
        description: '',
      });
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Report upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="My Medical Reports" />
        <div className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="page-title">Medical Reports & Documents</div>
              <p className="page-subtitle">Upload and securely store your lab reports, prescriptions, scans, and health records</p>
            </div>
            <button
              id="open-upload-modal"
              className="btn btn-primary"
              onClick={() => setShowUploadModal(true)}
            >
              <Plus size={16} /> Upload New Report
            </button>
          </div>

          {/* Upload Modal */}
          {showUploadModal && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)'
            }}>
              <div className="card animate-fade-in" style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 className="card-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Upload size={20} color="#6366f1" /> Upload Medical Report
                  </h3>
                  <button
                    className="btn btn-ghost btn-sm btn-icon"
                    onClick={() => setShowUploadModal(false)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="doc-type">Document Type *</label>
                    <select
                      id="doc-type"
                      className="form-input"
                      value={form.document_type}
                      onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                    >
                      {DOC_TYPES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="doc-title">Report Title *</label>
                    <input
                      id="doc-title"
                      className="form-input"
                      placeholder="e.g. Complete Blood Count (CBC)"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="doc-hospital">Hospital / Clinic / Lab</label>
                      <input
                        id="doc-hospital"
                        className="form-input"
                        placeholder="e.g. City Diagnostic Center"
                        value={form.hospital_name}
                        onChange={(e) => setForm({ ...form, hospital_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="doc-date">Report Date</label>
                      <input
                        id="doc-date"
                        type="date"
                        className="form-input"
                        value={form.report_date}
                        onChange={(e) => setForm({ ...form, report_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="doc-desc">Description / Doctor's Notes (Optional)</label>
                    <textarea
                      id="doc-desc"
                      className="form-input"
                      placeholder="Any relevant observations or notes regarding this test..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={2}
                    />
                  </div>

                  {/* Drop zone */}
                  <div
                    id="patient-drop-zone"
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('patient-file-input').click()}
                    style={{
                      border: `2px dashed ${dragOver ? '#6366f1' : file ? '#10b981' : 'var(--cc-border-strong)'}`,
                      borderRadius: 'var(--cc-radius-lg)',
                      padding: '32px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: dragOver ? 'rgba(99,102,241,0.06)' : file ? 'rgba(16,185,129,0.04)' : 'var(--cc-surface-2)',
                      marginBottom: 20,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      id="patient-file-input"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFile(e.target.files?.[0])}
                    />

                    {file ? (
                      <div>
                        <CheckCircle size={36} color="#10b981" style={{ marginBottom: 8 }} />
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{file.name}</div>
                        <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB · Click to choose different file
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload size={36} color="var(--cc-text-muted)" style={{ marginBottom: 8 }} />
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Choose file or drag & drop</div>
                        <div style={{ color: 'var(--cc-text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                          Supports PDF, JPG, PNG, WEBP (Max 10 MB)
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowUploadModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="patient-upload-submit"
                      className="btn btn-primary"
                      disabled={uploading || !file}
                    >
                      {uploading ? <div className="spinner" /> : <><Upload size={16} /> Upload to Cloudinary</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Reports Grid */}
          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : reports.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {reports.map((report) => (
                <div key={report.report_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{
                        padding: '10px',
                        borderRadius: 12,
                        background: 'rgba(99,102,241,0.1)',
                        color: '#818cf8',
                      }}>
                        <FileText size={24} />
                      </div>
                      <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                        {report.document_type.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>
                      {report.title || report.file_name}
                    </h4>

                    {report.hospital_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--cc-text-muted)', marginBottom: 6 }}>
                        <Hospital size={14} color="#f59e0b" />
                        <span>{report.hospital_name}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--cc-text-muted)', marginBottom: 10 }}>
                      <Calendar size={13} />
                      <span>{report.report_date ? format(new Date(report.report_date), 'dd MMM yyyy') : format(new Date(report.uploaded_at), 'dd MMM yyyy')}</span>
                    </div>

                    {report.description && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--cc-text-muted)', marginBottom: 12 }}>
                        {report.description}
                      </p>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--cc-border)', paddingTop: 12, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--cc-text-subtle)' }}>
                      {report.file_name}
                    </span>
                    <a
                      href={report.secure_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      <ExternalLink size={14} /> View File
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <div className="empty-state-title">No medical documents uploaded yet</div>
              <div className="empty-state-desc">Upload your blood test, scans, prescriptions, or discharge summaries to keep them organized in one place.</div>
              <button
                className="btn btn-primary"
                onClick={() => setShowUploadModal(true)}
                style={{ marginTop: 16 }}
              >
                <Plus size={16} /> Upload First Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
