import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useWebSocket } from '../context/WebSocketContext';
import { api } from '../services/api';
import { 
  Users, UserCheck, Phone, CheckCircle2, 
  AlertCircle, Search, Plus, Trash2, Calendar, FileText, 
  Clock, ShieldAlert, ArrowRight, Activity, Pill, ArrowUpRight,
  Building2, RefreshCw, ShieldCheck, Bot, Sparkles, Stethoscope,
  ClipboardList, HeartPulse
} from 'lucide-react';
import '../styles/doctor.css';
import doctorIcon from '../assets/doctor.png';
import OrsLoginCard from '../components/common/OrsLoginCard';

export default function DoctorDashboardView() {
  const { staffUser, staffToken, loginStaff, logoutStaff } = useAuth();
  const { translate } = useLanguage();
  const { isConnected, caseReadyEvent, queueUpdateEvent, queueUpdateTrigger, triggerSync } = useWebSocket();

  // Login form if not logged in
  const [email, setEmail] = useState('dr.ananya@civildistrict.gov.in');
  const [password, setPassword] = useState('Password@123');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Quick 1-Click Login
  const handleQuickLogin = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('Password@123');
    loginStaff(roleEmail, 'Password@123').catch(err => setAuthError(err.message));
  };

  // Queue state
  const [queue, setQueue] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [consultDetail, setConsultDetail] = useState(null);
  const [loadingConsult, setLoadingConsult] = useState(false);
  const [reportLang, setReportLang] = useState('en'); // 'en' | 'hi' | 'bilingual'
  const [deptFilter, setDeptFilter] = useState('all'); // 'all' | 'my'
  const prevQueueLengthRef = useRef(0);
  const [newPatientAlert, setNewPatientAlert] = useState(null);

  // Prescription Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [rxItems, setRxItems] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [nextCheckup, setNextCheckup] = useState('');
  const [savingRx, setSavingRx] = useState(false);
  const [successNotice, setSuccessNotice] = useState(null);

  const loadQueue = async () => {
    if (!staffToken) return;
    try {
      const endpoint = deptFilter === 'my' && staffUser?.department_id
        ? `/doctor/queue?department_id=${staffUser.department_id}`
        : '/doctor/queue?department_id=all';

      const list = await api.get(endpoint, staffToken);
      setQueue(list);

      // Check if new patient joined
      if (list.length > prevQueueLengthRef.current && prevQueueLengthRef.current > 0) {
        setNewPatientAlert(`New Patient #${list[0]?.token_number} added to queue!`);
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch {}
        setTimeout(() => setNewPatientAlert(null), 4000);
      }
      prevQueueLengthRef.current = list.length;

      if (list.length > 0) {
        if (!selectedToken) {
          setSelectedToken(list[0]);
          loadConsultDetail(list[0].case_id);
        }
      }
    } catch (err) {
      console.log('Error loading queue:', err.message);
      if (err.message && (err.message.includes('Token expired') || err.message.includes('401'))) {
        logoutStaff();
      }
    }
  };

  // Real-time dynamic auto-sync: 3-second heartbeat poll + immediate sync on WebSocket triggers
  useEffect(() => {
    if (!staffToken) return;

    loadQueue();

    const intervalId = setInterval(() => {
      loadQueue();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [staffToken, queueUpdateTrigger, deptFilter, caseReadyEvent, queueUpdateEvent]);

  // When selected token changes or is updated, fetch full consult card and clinical report
  useEffect(() => {
    if (selectedToken?.case_id && staffToken) {
      loadConsultDetail(selectedToken.case_id);
    }
  }, [selectedToken?.id, selectedToken?.case_id, staffToken]);

  const loadConsultDetail = async (caseId) => {
    if (!caseId || !staffToken) return;
    setLoadingConsult(true);
    try {
      const data = await api.get(`/doctor/cases/${caseId}/consult-card`, staffToken);
      setConsultDetail(data);
      setRxItems([
        { medicine_id: '', medicine_name: 'Paracetamol 650mg (Dolo)', dosage: '1 tablet', frequency: '1-0-1', timing: 'after_food', duration_days: 3, notes: 'if fever persists' }
      ]);
    } catch (err) {
      console.log('Error consult detail:', err.message);
    } finally {
      setLoadingConsult(false);
    }
  };

  // Medicine Search with pg_trgm
  const handleMedicineSearch = async (val) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const list = await api.get(`/doctor/medicines/search?q=${encodeURIComponent(val)}`, staffToken);
      setSearchResults(list);
    } catch (e) {}
  };

  const addMedicineToRx = (med) => {
    setRxItems(prev => [
      ...prev,
      {
        medicine_id: med.id,
        medicine_name: med.name,
        dosage: med.form === 'tablet' ? '1 tablet' : '10ml',
        frequency: '1-0-1',
        timing: 'after_food',
        duration_days: 5,
        notes: ''
      }
    ]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeRxItem = (idx) => {
    setRxItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Queue Progression Actions
  const handleCall = async () => {
    if (!selectedToken) return;
    try {
      await api.post(`/doctor/queue/${selectedToken.id}/call`, {}, staffToken);
      setSuccessNotice(`Patient #${selectedToken.token_number} called to your consultation room.`);
      loadQueue();
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStartConsult = async () => {
    if (!selectedToken) return;
    try {
      await api.post(`/doctor/queue/${selectedToken.id}/start-consult`, {}, staffToken);
      loadQueue();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleNoShow = async () => {
    if (!selectedToken) return;
    if (confirm('Mark this patient as No-Show and advance the queue?')) {
      try {
        await api.post(`/doctor/queue/${selectedToken.id}/no-show`, {}, staffToken);
        loadQueue();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSavePrescription = async () => {
    if (!selectedToken || rxItems.length === 0) return;
    setSavingRx(true);
    try {
      const itemsToSubmit = rxItems.map(item => ({
        medicine_id: item.medicine_id || '00000000-0000-0000-0000-000000000001',
        dosage: item.dosage,
        frequency: item.frequency,
        timing: item.timing,
        duration_days: parseInt(item.duration_days, 10) || 5,
        notes: item.notes
      }));

      await api.post('/doctor/prescriptions', {
        case_id: selectedToken.case_id,
        remarks,
        next_checkup_date: nextCheckup || null,
        items: itemsToSubmit
      }, staffToken);

      setSuccessNotice(`Official Prescription issued successfully! Case #${selectedToken.token_number} completed.`);
      setConsultDetail(null);
      setSelectedToken(null);
      loadQueue();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingRx(false);
    }
  };

  // If not authenticated as clinical staff, show official ORS login screen
  if (!staffToken) {
    return (
      <div className="ors-view-login-container">
        <OrsLoginCard
          title="Login"
          subtitle="National Health Mission • Medical Officer OPD Clinical Suite"
          defaultTab="staff"
          role="doctor"
          onSuccess={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="doctor-layout">
      {/* 1. LEFT SIDEBAR: LIVE OPD QUEUE */}
      <aside className="queue-sidebar" aria-label="OPD Patient Queue">
        <div className="queue-sidebar-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ margin: 0 }}>
                <Users size={16} /> Live OPD Queue ({queue.length})
              </h3>
              <span 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  fontSize: '10px', 
                  fontWeight: '800', 
                  padding: '2px 6px', 
                  borderRadius: '10px',
                  backgroundColor: isConnected ? '#dcfce7' : '#fef3c7',
                  color: isConnected ? '#166534' : '#92400e'
                }}
                title={isConnected ? "Real-time WebSocket Connected" : "Background Auto-Syncing (3s Heartbeat)"}
              >
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: isConnected ? '#22c55e' : '#f59e0b'
                }} />
                {isConnected ? 'LIVE' : 'SYNCING'}
              </span>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--gov-text-muted)' }}>
              {staffUser?.name} • Room 102
            </span>
          </div>
          <button 
            type="button" 
            className="gov-btn gov-btn-outline gov-btn-sm" 
            onClick={() => { triggerSync(); loadQueue(); }} 
            title="Refresh OPD Queue immediately"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* Real-time Department Filter Tabs */}
        <div style={{ display: 'flex', padding: '6px 12px', gap: '6px', borderBottom: '1px solid var(--gov-border)', backgroundColor: '#f8fafc' }}>
          <button
            type="button"
            className={`gov-btn gov-btn-sm ${deptFilter === 'all' ? 'gov-btn-primary' : 'gov-btn-outline'}`}
            style={{ flex: 1, padding: '4px 8px', fontSize: '11.5px', fontWeight: '700' }}
            onClick={() => setDeptFilter('all')}
          >
            All OPD ({queue.length})
          </button>
          <button
            type="button"
            className={`gov-btn gov-btn-sm ${deptFilter === 'my' ? 'gov-btn-primary' : 'gov-btn-outline'}`}
            style={{ flex: 1, padding: '4px 8px', fontSize: '11.5px', fontWeight: '700' }}
            onClick={() => setDeptFilter('my')}
          >
            {staffUser?.department_name ? staffUser.department_name.split(' ')[0] : 'My Dept'}
          </button>
        </div>

        {newPatientAlert && (
          <div style={{ 
            backgroundColor: '#dcfce7', 
            borderBottom: '1px solid #86efac', 
            padding: '7px 12px', 
            fontSize: '11.5px', 
            fontWeight: '700', 
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Sparkles size={13} color="#16a34a" />
            <span>{newPatientAlert}</span>
          </div>
        )}

        <div className="queue-list" role="list">
          {queue.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--gov-text-muted)', padding: '48px 16px', fontSize: '13.5px' }}>
              <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <div>No patients currently waiting in this department queue.</div>
            </div>
          ) : (
            queue.map(t => (
              <div 
                key={t.id}
                role="listitem"
                tabIndex={0}
                className={`queue-item-card ${selectedToken?.id === t.id ? 'selected' : ''} ${t.priority ? 'priority-card' : ''}`}
                onClick={() => { setSelectedToken(t); loadConsultDetail(t.case_id); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedToken(t); loadConsultDetail(t.case_id); } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--gov-primary)' }}>
                    #{t.token_number}
                  </span>
                  <span className={`status-badge ${t.status}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--gov-text-main)' }}>
                  {t.patient_name || 'Patient'} ({t.patient_age || 35}y / {t.patient_gender || 'M'})
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gov-text-muted)', marginTop: '2px' }}>
                  {t.chief_complaint || 'Routine Examination'}
                </div>

                {t.priority && (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--status-priority)', fontWeight: '700' }}>
                    [PRIORITY] Triage Carry-Over
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE: CLINICAL CONSULTATION */}
      <section className="consult-workspace" aria-label="Clinical Consultation Workspace">
        {successNotice && (
          <div 
            role="alert"
            style={{ 
              backgroundColor: 'var(--status-completed-bg)', 
              color: 'var(--status-completed)', 
              border: '1px solid var(--status-completed-border)',
              padding: '10px 14px', 
              borderRadius: 'var(--radius-md)', 
              fontWeight: '700', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '13.5px'
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successNotice}</span>
          </div>
        )}

        {loadingConsult ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gov-primary)' }}>
            <RefreshCw size={36} style={{ margin: '0 auto 16px', display: 'block', animation: 'spin 1s linear infinite' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Loading Patient Clinical Intake & EMR Card...</h3>
            <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>Retrieving AI assessment, symptom inquiry transcript & vital records</p>
          </div>
        ) : selectedToken && consultDetail ? (
          <>
            {/* Patient Header Banner */}
            <div className="patient-banner-bar">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--gov-primary)' }}>
                    {consultDetail.case?.patient_name || 'Verified Citizen'}
                  </h2>
                  <span className="status-badge priority">Token #{selectedToken.token_number}</span>
                  <span className={`status-badge ${selectedToken.status}`}>{selectedToken.status.replace('_', ' ')}</span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--gov-text-muted)', marginTop: '3px' }}>
                  Age: {consultDetail.case?.patient_age || 35} | Gender: {consultDetail.case?.patient_gender || 'M'} | Mobile: +91-{consultDetail.case?.patient_phone || '---'} | ABHA: {consultDetail.case?.patient_abha_id || 'Not Linked'}
                </div>
              </div>

              {/* Consultation Lifecycle Actions */}
              <div className="doctor-actions-row">
                <button 
                  type="button"
                  className="gov-btn gov-btn-outline gov-btn-sm"
                  onClick={handleCall}
                  disabled={selectedToken.status === 'in_consult'}
                  title="Notifies patient waiting room with room number"
                >
                  <Phone size={14} /> 1. Call Patient
                </button>

                <button 
                  type="button"
                  className="gov-btn gov-btn-accent gov-btn-sm"
                  onClick={handleStartConsult}
                  disabled={selectedToken.status === 'in_consult'}
                >
                  <Activity size={14} /> 2. Start Consult
                </button>

                <button 
                  type="button"
                  className="gov-btn gov-btn-outline gov-btn-sm"
                  style={{ color: 'var(--status-priority)', borderColor: 'var(--status-priority)' }}
                  onClick={handleNoShow}
                >
                  Mark No-Show
                </button>
              </div>
            </div>

            {/* Split Clinical Grid: Transcript & Rx Builder */}
            {(() => {
              let aiReport = null;
              if (consultDetail.case?.clinical_report) {
                try {
                  aiReport = typeof consultDetail.case.clinical_report === 'string'
                    ? JSON.parse(consultDetail.case.clinical_report)
                    : consultDetail.case.clinical_report;
                } catch {
                  aiReport = null;
                }
              }

              const abhaRecords = consultDetail.abha_history || [];

              return (
                <div className="clinical-split-grid">
                  {/* Left Column: AI Clinical Intake Report, ABDM Records, Transcript & OCR */}
                  <div className="transcript-panel">
                    {/* 1. AI Clinical Intake Report Card */}
                    {aiReport && (
                      <div className="doctor-report-card">
                        <div className="doctor-report-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
                          <div className="doctor-report-title">
                            <Bot size={17} color="var(--gov-primary)" />
                            <span>AI Clinical Intake Report</span>
                          </div>

                          {/* Language Switcher Pill for Doctor */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--gov-border)' }}>
                            <button
                              type="button"
                              onClick={() => setReportLang('en')}
                              style={{
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: reportLang === 'en' ? 700 : 500,
                                backgroundColor: reportLang === 'en' ? 'var(--gov-primary)' : 'transparent',
                                color: reportLang === 'en' ? '#FFFFFF' : 'var(--gov-text-muted)',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              English
                            </button>
                            <button
                              type="button"
                              onClick={() => setReportLang('hi')}
                              style={{
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: reportLang === 'hi' ? 700 : 500,
                                backgroundColor: reportLang === 'hi' ? 'var(--gov-primary)' : 'transparent',
                                color: reportLang === 'hi' ? '#FFFFFF' : 'var(--gov-text-muted)',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              हिन्दी
                            </button>
                            <button
                              type="button"
                              onClick={() => setReportLang('bilingual')}
                              style={{
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: reportLang === 'bilingual' ? 700 : 500,
                                backgroundColor: reportLang === 'bilingual' ? 'var(--gov-primary)' : 'transparent',
                                color: reportLang === 'bilingual' ? '#FFFFFF' : 'var(--gov-text-muted)',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              द्विभाषी (Dual)
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                            <span className="doctor-report-badge" style={{ 
                              backgroundColor: aiReport.severity_assessment === 'severe' ? 'var(--status-priority-bg)' : 'var(--gov-primary-light)',
                              color: aiReport.severity_assessment === 'severe' ? 'var(--status-priority)' : 'var(--gov-primary)',
                              border: `1px solid ${aiReport.severity_assessment === 'severe' ? 'var(--status-priority-border)' : 'var(--gov-primary-border)'}`
                            }}>
                              Severity: {aiReport.severity_assessment?.toUpperCase() || 'MODERATE'}
                            </span>
                            <span className="doctor-report-badge" style={{
                              backgroundColor: aiReport.urgency_flag === 'urgent' ? 'var(--status-priority-bg)' : 'var(--status-completed-bg)',
                              color: aiReport.urgency_flag === 'urgent' ? 'var(--status-priority)' : 'var(--status-completed)',
                              border: `1px solid ${aiReport.urgency_flag === 'urgent' ? 'var(--status-priority-border)' : 'var(--status-completed-border)'}`
                            }}>
                              Urgency: {aiReport.urgency_flag?.toUpperCase() || 'ROUTINE'}
                            </span>
                          </div>
                        </div>

                        {/* Chief Complaint */}
                        <div className="doctor-report-section">
                          <div className="doctor-report-label">
                            {reportLang === 'hi' ? 'मुख्य शिकायत (Chief Complaint)' : 'Chief Complaint'}
                          </div>
                          <div className="doctor-report-text" style={{ fontWeight: '700', color: 'var(--gov-primary)' }}>
                            {reportLang === 'hi' 
                              ? (aiReport.chief_complaint_hi || aiReport.chief_complaint || consultDetail.case?.chief_complaint || 'सामान्य जांच')
                              : (aiReport.chief_complaint_en || aiReport.chief_complaint || consultDetail.case?.chief_complaint || 'General Checkup')}
                          </div>
                          {reportLang === 'bilingual' && aiReport.chief_complaint_hi && (
                            <div className="doctor-report-text" style={{ fontSize: '13px', color: 'var(--gov-secondary)', marginTop: '4px' }}>
                              हिन्दी: {aiReport.chief_complaint_hi}
                            </div>
                          )}
                        </div>

                        {/* Symptom Summary */}
                        <div className="doctor-report-section">
                          <div className="doctor-report-label">
                            {reportLang === 'hi' ? 'लक्षण सारांश (Symptom Summary)' : 'Symptom Summary'}
                          </div>
                          <div className="doctor-report-text">
                            {reportLang === 'hi'
                              ? (aiReport.symptom_summary_hi || aiReport.report_text_hi || aiReport.symptom_summary || aiReport.report_text_en)
                              : (aiReport.symptom_summary_en || aiReport.symptom_summary || aiReport.report_text_en)}
                          </div>
                          {reportLang === 'bilingual' && (aiReport.symptom_summary_hi || aiReport.report_text_hi) && (
                            <div className="doctor-report-text" style={{ fontSize: '13px', color: '#1E3A8A', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #CBD5E1' }}>
                              <strong>हिन्दी सारांश:</strong> {aiReport.symptom_summary_hi || aiReport.report_text_hi}
                            </div>
                          )}
                        </div>

                        {/* Recommended Department */}
                        <div className="doctor-report-section" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <span className="doctor-report-label" style={{ margin: 0 }}>
                            {reportLang === 'hi' ? 'अनुशंसित विभाग (Dept):' : 'Recommended Department:'}
                          </span>
                          <span style={{ fontWeight: '700', color: 'var(--gov-accent)', fontSize: '13px' }}>
                            {reportLang === 'hi' 
                              ? (aiReport.recommended_department_hi || aiReport.recommended_department || 'सामान्य चिकित्सा')
                              : (aiReport.recommended_department_en || aiReport.recommended_department || 'General Medicine')}
                          </span>
                        </div>

                        {/* Clinical Observations & Notes */}
                        {(aiReport.clinical_notes || aiReport.clinical_notes_hi) && (
                          <div className="doctor-report-section" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--gov-border)' }}>
                            <div className="doctor-report-label">
                              {reportLang === 'hi' ? 'क्लिनिकल टिप्पणियाँ व अवलोकन' : 'Clinical Observations & Notes'}
                            </div>
                            <div className="doctor-report-text" style={{ fontSize: '12.5px', color: 'var(--gov-text-muted)' }}>
                              {reportLang === 'hi' 
                                ? (aiReport.clinical_notes_hi || aiReport.clinical_notes)
                                : (aiReport.clinical_notes_en || aiReport.clinical_notes)}
                            </div>
                            {reportLang === 'bilingual' && aiReport.clinical_notes_hi && (
                              <div className="doctor-report-text" style={{ fontSize: '12px', color: '#046A38', marginTop: '4px' }}>
                                हिन्दी: {aiReport.clinical_notes_hi}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. ABDM Verified Past Medical Records */}
                    {abhaRecords.length > 0 && (
                      <div className="doctor-abha-card">
                        <div className="doctor-abha-header">
                          <div className="doctor-abha-title">
                            <ShieldCheck size={16} color="var(--gov-accent)" />
                            <span>ABDM Health Records ({abhaRecords.length})</span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--gov-accent)', fontWeight: '700' }}>
                            Verified Ayushman Bharat
                          </span>
                        </div>

                        {abhaRecords.map((rec, idx) => {
                          const rxText = rec.prescription || (Array.isArray(rec.prescriptions) ? rec.prescriptions.join(', ') : '');
                          const bp = rec.vitals?.bp || rec.vitals?.blood_pressure;
                          const temp = rec.vitals?.temp;
                          const pulse = rec.vitals?.pulse;
                          const spo2 = rec.vitals?.spo2;

                          return (
                            <div key={idx} className="doctor-abha-record-item">
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: '700', color: 'var(--gov-primary)' }}>{rec.diagnosis}</span>
                                <span style={{ fontSize: '11px', color: 'var(--gov-text-muted)' }}>{rec.date}</span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--gov-text-muted)', marginBottom: '4px' }}>
                                {rec.hospital} • {rec.department} {rec.doctor ? `(${rec.doctor})` : ''}
                              </div>
                              {rxText && (
                                <div style={{ fontSize: '11.5px', color: 'var(--gov-text-main)', marginBottom: '3px' }}>
                                  <b>Past Rx:</b> {rxText}
                                </div>
                              )}
                              {rec.vitals && (
                                <div style={{ fontSize: '11px', color: 'var(--gov-text-subtle)', marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                  {bp && <span><b>BP:</b> {bp}</span>}
                                  {temp && <span><b>Temp:</b> {temp}</span>}
                                  {pulse && <span><b>Pulse:</b> {pulse}</span>}
                                  {spo2 && <span><b>SpO2:</b> {spo2}</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 3. Symptom Intake Transcript */}
                    <h3 style={{ fontSize: '14.5px', fontWeight: '700', marginBottom: '12px', marginTop: '16px', color: 'var(--gov-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={15} /> Symptom Intake Transcript
                    </h3>

                    {consultDetail.transcript?.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>No intake questions recorded.</p>
                    ) : (
                      consultDetail.transcript?.map((resp, i) => (
                        <div key={resp.id || i} className="qa-bubble">
                          <div className="qa-question">Node: {resp.question_id}</div>
                          <div className="qa-answer">{resp.answer_text}</div>
                          {resp.extracted_via_llm && (
                            <span style={{ fontSize: '11px', color: 'var(--gov-accent)', marginLeft: '8px', fontWeight: '700' }}>
                              (Voice Intake)
                            </span>
                          )}
                        </div>
                      ))
                    )}

                    {/* 4. Attached Documents & OCR */}
                    {consultDetail.documents?.length > 0 && (
                      <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--gov-border)' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--gov-text-main)' }}>
                          Attached Medical Documents ({consultDetail.documents.length})
                        </h4>
                        {consultDetail.documents.map((doc, idx) => (
                          <div key={idx} style={{ backgroundColor: 'var(--gov-surface-subtle)', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: '8px', border: '1px solid var(--gov-border)', fontSize: '12px' }}>
                            <div style={{ fontWeight: '700', color: 'var(--gov-primary)' }}>{doc.doc_type?.toUpperCase()}</div>
                            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '11px', marginTop: '4px', color: 'var(--gov-text-muted)' }}>
                              {doc.ocr_text}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

              {/* Right Column: Digital Prescription Builder */}
              <div className="rx-builder-panel">
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: 'var(--gov-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Pill size={16} /> Official Prescription & E-Prescribe
                </h3>

                {/* pg_trgm Medicine Search Input */}
                <div className="gov-input-group" style={{ position: 'relative' }}>
                  <label htmlFor="med-search">Search Allopathic & AYUSH Medicines</label>
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <input 
                      id="med-search"
                      type="text"
                      className="gov-input"
                      placeholder="Type medicine name (e.g. Paracetamol, Dolo, Ashwagandha, Liv.52)..."
                      value={searchQuery}
                      onChange={(e) => handleMedicineSearch(e.target.value)}
                    />
                    <Search size={16} style={{ position: 'absolute', right: '12px', color: 'var(--gov-text-muted)' }} />
                  </div>

                  {searchResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#FFFFFF', border: '1px solid var(--gov-border-strong)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                      {searchResults.map((m) => (
                        <div 
                          key={m.id} 
                          style={{ padding: '9px 12px', borderBottom: '1px solid var(--gov-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}
                          onClick={() => addMedicineToRx(m)}
                        >
                          <div>
                            <b>{m.name}</b> <span style={{ fontSize: '11.5px', color: 'var(--gov-text-muted)' }}>({m.form} - {m.strength})</span>
                          </div>
                          <Plus size={14} color="var(--gov-primary)" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prescription Line Items Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="rx-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Timing</th>
                        <th>Days</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rxItems.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '600' }}>{item.medicine_name}</td>
                          <td>
                            <input 
                              type="text" 
                              className="gov-input gov-btn-sm" 
                              value={item.dosage} 
                              onChange={(e) => {
                                const copy = [...rxItems];
                                copy[idx].dosage = e.target.value;
                                setRxItems(copy);
                              }}
                              style={{ width: '80px' }}
                            />
                          </td>
                          <td>
                            <div className="frequency-presets">
                              {['1-0-1', '1-1-1', '1-0-0', '0-0-1', 'SOS'].map(freq => (
                                <button 
                                  key={freq}
                                  type="button"
                                  className={`freq-btn ${item.frequency === freq ? 'active' : ''}`}
                                  onClick={() => {
                                    const copy = [...rxItems];
                                    copy[idx].frequency = freq;
                                    setRxItems(copy);
                                  }}
                                >
                                  {freq}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td>
                            <select 
                              className="gov-input gov-btn-sm"
                              value={item.timing}
                              onChange={(e) => {
                                const copy = [...rxItems];
                                copy[idx].timing = e.target.value;
                                setRxItems(copy);
                              }}
                            >
                              <option value="after_food">After Food</option>
                              <option value="before_food">Before Food</option>
                              <option value="with_food">With Food</option>
                              <option value="anytime">Anytime</option>
                            </select>
                          </td>
                          <td>
                            <input 
                              type="number"
                              className="gov-input gov-btn-sm"
                              value={item.duration_days}
                              onChange={(e) => {
                                const copy = [...rxItems];
                                copy[idx].duration_days = e.target.value;
                                setRxItems(copy);
                              }}
                              style={{ width: '55px' }}
                            />
                          </td>
                          <td>
                            <button 
                              type="button" 
                              onClick={() => removeRxItem(idx)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--status-priority)' }}
                              title="Delete Item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Clinical Remarks & Next Checkup Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <div className="gov-input-group">
                    <label htmlFor="rx-remarks">Clinical Advice / Regimen</label>
                    <textarea 
                      id="rx-remarks"
                      className="gov-input"
                      rows={2}
                      placeholder="e.g. Avoid cold exposure, hydration, follow AYUSH dietary guidance..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>
                  <div className="gov-input-group">
                    <label htmlFor="rx-checkup">Follow-up Date (Optional)</label>
                    <input 
                      id="rx-checkup"
                      type="date"
                      className="gov-input"
                      value={nextCheckup}
                      onChange={(e) => setNextCheckup(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="button"
                  className="gov-btn gov-btn-primary gov-btn-lg"
                  style={{ width: '100%', marginTop: '6px' }}
                  onClick={handleSavePrescription}
                  disabled={savingRx || rxItems.length === 0}
                >
                  <CheckCircle2 size={18} /> {savingRx ? 'Saving Prescription...' : 'Issue Prescription & Complete Visit'}
                </button>
              </div>
            </div>
          );
        })()}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gov-text-muted)' }}>
            <Activity size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--gov-primary)' }}>
              Select a patient token from the left queue to open the clinical EMR card
            </h3>
          </div>
        )}
      </section>
    </div>
  );
}
