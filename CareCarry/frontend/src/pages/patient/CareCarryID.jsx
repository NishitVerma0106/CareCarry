import { useEffect, useState, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { patientService } from '../../services';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Download, Copy, Printer, CheckCircle, ShieldCheck, Heart, Droplets } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function CareCarryID() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  const fetchQR = async () => {
    setLoading(true);
    try {
      const res = await patientService.getCareCarryId();
      setData(res.data.data);
    } catch {
      toast.error('Failed to load CareCarry ID.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQR();
  }, []);

  const copyId = async () => {
    if (!data?.carecarryId) return;
    await navigator.clipboard.writeText(data.carecarryId);
    setCopied(true);
    toast.success('CareCarry ID copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generate an image or SVG download of the QR
    const svg = document.getElementById('carecard-qr-svg');
    if (!svg) {
      toast.error('QR element not found.');
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `CareCarry_${data.carecarryId}_QR.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      toast.success('CareCard QR downloaded!');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="CareCarry Digital Health ID" />
        <div className="page-content">
          <div className="page-header" style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="page-title">Digital Health Identity & QR CareCard</div>
            <p className="page-subtitle">
              Show this official QR code at hospital registration or triage for instant patient identification
            </p>
          </div>

          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : data ? (
            <div className="animate-fade-in" style={{ maxWidth: 540, margin: '0 auto' }}>
              {/* Physical CareCard Layout */}
              <div
                ref={cardRef}
                id="printable-carecard"
                style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #022c22 100%)',
                  border: '2px solid rgba(99,102,241,0.4)',
                  borderRadius: 24,
                  padding: '28px',
                  boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7), 0 0 30px rgba(99,102,241,0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: 24,
                }}
              >
                {/* Decorative sheen */}
                <div style={{
                  position: 'absolute', top: -100, right: -100, width: 220, height: 220,
                  background: 'radial-gradient(circle, rgba(99,102,241,0.25), transparent)',
                  borderRadius: '50%', pointerEvents: 'none',
                }} />

                {/* Card Top */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#10b981',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900
                    }}>
                      CC
                    </div>
                    <span style={{ fontFamily: 'Space Grotesk', fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '1px' }}>
                      CARECARRY
                    </span>
                  </div>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 20,
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                    color: '#10b981', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase'
                  }}>
                    <ShieldCheck size={14} /> Official ID
                  </div>
                </div>

                {/* QR Code Container */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 24px' }}>
                  <div style={{
                    background: '#ffffff',
                    padding: 16,
                    borderRadius: 18,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    display: 'inline-block',
                  }}>
                    <QRCodeSVG
                      id="carecard-qr-svg"
                      value={JSON.stringify({ token: data.token, carecarryId: data.carecarryId })}
                      size={200}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                </div>

                {/* Patient Details on Card */}
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: '16px 20px',
                  backdropFilter: 'blur(8px)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>
                        CareCarry ID
                      </div>
                      <div style={{
                        fontFamily: 'Space Grotesk',
                        fontSize: '1.4rem',
                        fontWeight: 800,
                        color: '#a5b4fc',
                        letterSpacing: '2px',
                      }}>
                        {data.carecarryId}
                      </div>
                    </div>

                    {data.bloodGroup && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 8,
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#f87171', fontWeight: 800, fontSize: '0.85rem'
                      }}>
                        <Droplets size={14} /> {data.bloodGroup}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Patient Name
                      </div>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1rem', marginTop: 2 }}>
                        {data.name || 'Verified Patient'}
                      </div>
                    </div>

                    {data.dateOfBirth && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--cc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          DOB
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--cc-text)', marginTop: 2 }}>
                          {format(new Date(data.dateOfBirth), 'dd MMM yyyy')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 14, color: 'var(--cc-text-muted)', fontSize: '0.72rem' }}>
                  Token expires: {data.expiresAt ? format(new Date(data.expiresAt), 'dd MMM yyyy HH:mm') : 'Active'}
                </div>
              </div>

              {/* Action Buttons: Download, Print, Copy, Refresh */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
                <button id="copy-carecarry-id" className="btn btn-secondary" onClick={copyId} title="Copy CareCarry ID">
                  {copied ? <CheckCircle size={16} color="#10b981" /> : <Copy size={16} />}
                  <span style={{ fontSize: '0.8rem' }}>{copied ? 'Copied' : 'Copy ID'}</span>
                </button>

                <button id="download-carecard" className="btn btn-secondary" onClick={handleDownload} title="Download QR">
                  <Download size={16} />
                  <span style={{ fontSize: '0.8rem' }}>Download</span>
                </button>

                <button id="print-carecard" className="btn btn-secondary" onClick={handlePrint} title="Print CareCard">
                  <Printer size={16} />
                  <span style={{ fontSize: '0.8rem' }}>Print</span>
                </button>

                <button id="refresh-carecard" className="btn btn-primary" onClick={fetchQR} title="Refresh QR Token">
                  <RefreshCw size={16} />
                  <span style={{ fontSize: '0.8rem' }}>Refresh</span>
                </button>
              </div>

              {/* Privacy Architecture Notice */}
              <div className="alert alert-info">
                <span>🛡️</span>
                <div>
                  <strong>Architectural Privacy Guarantee: </strong>
                  The QR code contains solely a dynamic lookup token (`QR-XXXX`). No personal medical history, diagnoses, or prescriptions are stored in the QR code. Authorized healthcare providers resolve this token through the CareCarry REST API.
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
