import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { 
  ShieldCheck, Building, Users, Lock, Calendar, 
  Check, X, Plus, AlertCircle, Sparkles, Building2, Settings, QrCode, LogOut,
  BarChart3, TrendingUp, Clock, Activity, ArrowUpRight
} from 'lucide-react';
import '../styles/admin.css';
import hospitalIcon from '../assets/hospital.png';
import OrsLoginCard from '../components/common/OrsLoginCard';

export default function AdminPortalView() {
  const { staffUser, staffToken, loginStaff, logoutStaff, selectedHospitalId } = useAuth();
  const { translate } = useLanguage();

  // Login form if not logged in
  const [email, setEmail] = useState('admin@civildistrict.gov.in');
  const [password, setPassword] = useState('Password@123');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Active Tab: 'analytics' | 'settings' | 'departments' | 'staff' | 'rooms' | 'rbac' | 'requests' | 'superadmin'
  const [activeTab, setActiveTab] = useState('analytics');

  // Quick 1-Click Login
  const handleQuickLogin = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('Password@123');
    loginStaff(roleEmail, 'Password@123').catch(err => setAuthError(err.message));
  };

  // Hospital Settings State
  const [hospitalSettings, setHospitalSettings] = useState(null);
  const [presenceRequired, setPresenceRequired] = useState(true);
  const [regMode, setRegMode] = useState('admin_creates');

  // Data states
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [roomAssignments, setRoomAssignments] = useState([]);
  const [rbacMatrix, setRbacMatrix] = useState(null);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [hospitals, setHospitals] = useState([]);

  // Form states
  const [newDeptName, setNewDeptName] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRoleId, setNewStaffRoleId] = useState('');
  const [newStaffDeptId, setNewStaffDeptId] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('Password@123');

  // Room Assignment Form
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [assignRoomNum, setAssignRoomNum] = useState('Room 108');

  // Super Admin Hospital Form
  const [newHospName, setNewHospName] = useState('');
  const [newHospRegMode, setNewHospRegMode] = useState('admin_creates');
  const [newHospPresence, setNewHospPresence] = useState(true);
  const [newHospAddress, setNewHospAddress] = useState('');
  const [newHospPhone, setNewHospPhone] = useState('');

  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (staffToken) {
      loadTabData(activeTab);
    }
  }, [staffToken, activeTab, selectedHospitalId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      await loginStaff(email, password);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadTabData = async (tab) => {
    try {
      if (tab === 'settings') {
        const data = await api.get('/admin/hospital-settings', staffToken);
        setHospitalSettings(data);
        setPresenceRequired(data.physical_presence_required !== false);
        setRegMode(data.registration_mode || 'admin_creates');
      } else if (tab === 'departments') {
        const data = await api.get('/admin/departments', staffToken);
        setDepartments(data);
      } else if (tab === 'staff') {
        const [staffData, rolesData, deptsData] = await Promise.all([
          api.get('/admin/staff', staffToken),
          api.get('/admin/roles', staffToken),
          api.get('/admin/departments', staffToken)
        ]);
        setStaffList(staffData);
        setRoles(rolesData);
        setDepartments(deptsData);
      } else if (tab === 'rooms') {
        const [roomsData, staffData] = await Promise.all([
          api.get('/admin/room-assignments', staffToken),
          api.get('/admin/staff', staffToken)
        ]);
        setRoomAssignments(roomsData);
        setStaffList(staffData);
      } else if (tab === 'rbac') {
        const data = await api.get('/admin/permissions-matrix', staffToken);
        setRbacMatrix(data);
      } else if (tab === 'requests') {
        const data = await api.get('/admin/registration-requests', staffToken);
        setRegistrationRequests(data);
      } else if (tab === 'superadmin') {
        const data = await api.get('/admin/superadmin/hospitals', staffToken);
        setHospitals(data);
      }
    } catch (err) {
      console.log('Error loading admin tab:', err.message);
    }
  };

  // Save Hospital Settings
  const handleSaveHospitalSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/admin/hospital-settings', {
        physical_presence_required: presenceRequired,
        registration_mode: regMode
      }, staffToken);
      setHospitalSettings(res.hospital);
      setNotice('Hospital configuration saved successfully!');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  // Create Department
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName) return;
    try {
      await api.post('/admin/departments', { name: newDeptName }, staffToken);
      setNewDeptName('');
      setNotice('Department added successfully!');
      loadTabData('departments');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  // Create Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/staff', {
        name: newStaffName,
        email: newStaffEmail,
        phone: newStaffPhone,
        role_id: newStaffRoleId,
        department_id: newStaffDeptId || null,
        password: newStaffPassword
      }, staffToken);

      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPhone('');
      setNotice('Staff user provisioned successfully!');
      loadTabData('staff');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  // Set Daily Room Assignment
  const handleAssignRoom = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !assignRoomNum) return;
    try {
      await api.post('/admin/room-assignments', {
        doctor_id: selectedDoctorId,
        room_number: assignRoomNum
      }, staffToken);
      setNotice('Daily doctor consultation room assigned!');
      loadTabData('rooms');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  // Super Admin: Create Hospital
  const handleCreateHospital = async (e) => {
    e.preventDefault();
    if (!newHospName) return;
    try {
      await api.post('/admin/superadmin/hospitals', {
        name: newHospName,
        registration_mode: newHospRegMode,
        physical_presence_required: newHospPresence,
        address: newHospAddress,
        contact_phone: newHospPhone
      }, staffToken);
      setNewHospName('');
      setNewHospAddress('');
      setNewHospPhone('');
      setNotice('New Hospital tenant onboarded to central network!');
      loadTabData('superadmin');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  if (!staffToken) {
    return (
      <div className="ors-view-login-container">
        <OrsLoginCard
          title="Login"
          subtitle="Hospital Administration & Operations • Management Console"
          defaultTab="staff"
          role="admin"
          onSuccess={() => {}}
        />
      </div>
    );
  }

  const isSuperAdmin = staffUser?.hospital_id === null;

  return (
    <div className="admin-container">
      {/* Top Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--gov-primary)' }}>
            Hospital Administration & Operations
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>
            Facility: <b>{staffUser?.hospital_name || 'Central Ministry Platform'}</b> • Logged in as: {staffUser?.name} ({staffUser?.role || 'Admin'})
          </p>
        </div>

        <button type="button" className="gov-btn gov-btn-outline gov-btn-sm" onClick={logoutStaff}>
          <LogOut size={13} /> Sign Out Admin
        </button>
      </div>

      {notice && (
        <div 
          role="alert"
          style={{ 
            backgroundColor: 'var(--status-completed-bg)', 
            color: 'var(--status-completed)', 
            border: '1px solid var(--status-completed-border)',
            padding: '10px 14px', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '18px', 
            fontWeight: '700',
            fontSize: '13.5px'
          }}
        >
          ✓ {notice}
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <nav className="admin-nav-tabs" aria-label="Administration Modules">
        <button 
          type="button"
          className={`admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={15} /> Census & Footfall
        </button>
        <button 
          type="button"
          className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={15} /> Hospital Rules & Presence
        </button>
        <button 
          type="button"
          className={`admin-tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          <Building size={15} /> Departments ({departments.length})
        </button>
        <button 
          type="button"
          className={`admin-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          <Users size={15} /> Staff Directory ({staffList.length})
        </button>
        <button 
          type="button"
          className={`admin-tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          <Calendar size={15} /> Daily Doctor Rooms
        </button>
        <button 
          type="button"
          className={`admin-tab-btn ${activeTab === 'rbac' ? 'active' : ''}`}
          onClick={() => setActiveTab('rbac')}
        >
          <Lock size={15} /> Dynamic RBAC Matrix
        </button>
        <button 
          type="button"
          className={`admin-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <ShieldCheck size={15} /> Self-Register Approvals
        </button>

        {isSuperAdmin && (
          <button 
            type="button"
            className={`admin-tab-btn ${activeTab === 'superadmin' ? 'active' : ''}`}
            onClick={() => setActiveTab('superadmin')}
            style={{ color: 'var(--gov-accent)' }}
          >
            <Building2 size={15} /> Super Admin Platform
          </button>
        )}
      </nav>

      {/* TAB 1: OPD ANALYTICS & FOOTFALL */}
      {activeTab === 'analytics' && (
        <div>
          {/* Official KPI Cards */}
          <div className="admin-stats-grid">
            <div className="stat-card">
              <div className="stat-label">Today's OPD Registrations</div>
              <div className="stat-number">142</div>
              <div className="stat-desc" style={{ color: 'var(--status-completed)', fontWeight: '700' }}>
                <TrendingUp size={12} style={{ display: 'inline', marginRight: '4px' }} />
                +18% vs daily baseline
              </div>
            </div>

            <div className="stat-card accent">
              <div className="stat-label">Active Waiting in Queue</div>
              <div className="stat-number" style={{ color: 'var(--gov-accent)' }}>14</div>
              <div className="stat-desc">4 patients currently in consult</div>
            </div>

            <div className="stat-card success">
              <div className="stat-label">Avg Consult Wait Time</div>
              <div className="stat-number" style={{ color: 'var(--status-completed)' }}>11 min</div>
              <div className="stat-desc">✓ Well below 15-min SLA</div>
            </div>

            <div className="stat-card info">
              <div className="stat-label">Completed Prescriptions</div>
              <div className="stat-number" style={{ color: 'var(--gov-secondary)' }}>128</div>
              <div className="stat-desc">100% ABHA digital record synced</div>
            </div>
          </div>

          {/* Department Breakdown & Hourly Heatmap */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Department Ratio */}
            <div className="gov-card">
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--gov-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={16} /> Departmental Census Distribution
              </h3>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  <span>AYUSH (Ayurveda & Panchakarma)</span>
                  <span>46% (65 Patients)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'var(--gov-border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '46%', height: '100%', backgroundColor: 'var(--status-completed)', borderRadius: '4px' }}></div>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  <span>General Medicine OPD</span>
                  <span>34% (48 Patients)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'var(--gov-border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '34%', height: '100%', backgroundColor: 'var(--gov-primary)', borderRadius: '4px' }}></div>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  <span>Orthopedics & Joint Care</span>
                  <span>12% (17 Patients)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'var(--gov-border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '12%', height: '100%', backgroundColor: 'var(--gov-accent)', borderRadius: '4px' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                  <span>Pediatrics & ENT OPD</span>
                  <span>8% (12 Patients)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'var(--gov-border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '8%', height: '100%', backgroundColor: '#64748B', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>

            {/* Peak Hours Breakdown */}
            <div className="gov-card">
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--gov-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> Peak Arrival Windows (08:00 - 13:00)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { time: '08:00 - 09:00', count: 18, pct: '35%' },
                  { time: '09:00 - 10:00 (Morning Rush)', count: 42, pct: '85%', peak: true },
                  { time: '10:00 - 11:00 (Peak Queue)', count: 48, pct: '95%', peak: true },
                  { time: '11:00 - 12:00', count: 24, pct: '50%' },
                  { time: '12:00 - 13:00', count: 10, pct: '20%' }
                ].map((slot, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                      <span>{slot.time}</span>
                      <span style={{ color: slot.peak ? 'var(--status-priority)' : 'var(--gov-text-muted)' }}>{slot.count} arrivals</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--gov-border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: slot.pct, height: '100%', backgroundColor: slot.peak ? 'var(--status-priority)' : 'var(--gov-primary)', borderRadius: '3px' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Doctor Performance Summary */}
          <div className="gov-card">
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--gov-primary)', marginBottom: '14px' }}>
              Duty Medical Officers Throughput Register
            </h3>
            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Medical Officer</th>
                    <th>Assigned Room</th>
                    <th>Department</th>
                    <th>Patients Consulted</th>
                    <th>Avg Consult Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Vaidya Ananya Deshmukh (BAMS, MD)</td>
                    <td>Room 102</td>
                    <td>AYUSH</td>
                    <td>42</td>
                    <td>8.5 mins</td>
                    <td><span className="status-badge in_consult">In Consult</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Dr. Vikramaditya Verma (MBBS, MD)</td>
                    <td>Room 105</td>
                    <td>General Medicine</td>
                    <td>48</td>
                    <td>6.8 mins</td>
                    <td><span className="status-badge in_consult">In Consult</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HOSPITAL RULES & PRESENCE CONFIG */}
      {activeTab === 'settings' && (
        <div className="gov-card" style={{ maxWidth: '780px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '14px', color: 'var(--gov-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} /> Queue Governance & Physical Presence Rules
          </h3>

          <form onSubmit={handleSaveHospitalSettings}>
            <div style={{ backgroundColor: 'var(--gov-surface-subtle)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--gov-border)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <input 
                  type="checkbox" 
                  id="presence-toggle"
                  checked={presenceRequired}
                  onChange={(e) => setPresenceRequired(e.target.checked)}
                  style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer', accentColor: 'var(--gov-primary)' }}
                />
                <div>
                  <label htmlFor="presence-toggle" style={{ fontWeight: '700', fontSize: '15px', color: 'var(--gov-text-main)', cursor: 'pointer' }}>
                    Require Physical Kiosk Presence Proof (QR Scan) for Remote Registrations
                  </label>
                  <p style={{ fontSize: '12.5px', color: 'var(--gov-text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
                    • <b>Enabled:</b> Remote smartphone patients must scan the kiosk presence QR code upon physical arrival before receiving an active token number.<br />
                    • <b>Disabled:</b> Patients can directly obtain a queue token from home without terminal verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="gov-input-group">
              <label htmlFor="reg-mode-select">Staff Registration Mode</label>
              <select id="reg-mode-select" className="gov-input" value={regMode} onChange={e => setRegMode(e.target.value)}>
                <option value="admin_creates">Admin Creates Staff Directly</option>
                <option value="self_register_approval">Self-Registration with Admin Approval</option>
              </select>
            </div>

            <button type="submit" className="gov-btn gov-btn-primary gov-btn-lg" style={{ marginTop: '8px' }}>
              <Check size={16} /> Save Governance Settings
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div>
          <div className="gov-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: 'var(--gov-primary)' }}>
              Add New OPD Specialty Department
            </h3>
            <form onSubmit={handleCreateDepartment} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input 
                type="text"
                className="gov-input"
                placeholder="Department Name (e.g. Ophthalmology / Eye OPD)"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                style={{ flex: 1, minWidth: '240px' }}
                required
              />
              <button type="submit" className="gov-btn gov-btn-primary">
                <Plus size={15} /> Add Department
              </button>
            </form>
          </div>

          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Department Name</th>
                  <th>Operational Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: '600' }}>{d.name}</td>
                    <td>
                      <span className="status-badge completed" style={{ fontSize: '11px' }}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="gov-btn gov-btn-outline gov-btn-sm">Configure</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STAFF & ROLES */}
      {activeTab === 'staff' && (
        <div>
          <div className="gov-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px', color: 'var(--gov-primary)' }}>
              Provision New Clinical or Administrative Staff
            </h3>
            <form onSubmit={handleCreateStaff}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div className="gov-input-group">
                  <label htmlFor="staff-name">Full Name</label>
                  <input id="staff-name" type="text" className="gov-input" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} required />
                </div>
                <div className="gov-input-group">
                  <label htmlFor="staff-email">Institutional Email</label>
                  <input id="staff-email" type="email" className="gov-input" value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} required />
                </div>
                <div className="gov-input-group">
                  <label htmlFor="staff-phone">Contact Phone</label>
                  <input id="staff-phone" type="tel" className="gov-input" value={newStaffPhone} onChange={e => setNewStaffPhone(e.target.value)} />
                </div>
                <div className="gov-input-group">
                  <label htmlFor="staff-role">Role Assignment</label>
                  <select id="staff-role" className="gov-input" value={newStaffRoleId} onChange={e => setNewStaffRoleId(e.target.value)} required>
                    <option value="">Select Role...</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="gov-input-group">
                  <label htmlFor="staff-dept">Department</label>
                  <select id="staff-dept" className="gov-input" value={newStaffDeptId} onChange={e => setNewStaffDeptId(e.target.value)}>
                    <option value="">None / General Admin</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="gov-input-group">
                  <label htmlFor="staff-pass">Initial Password</label>
                  <input id="staff-pass" type="text" className="gov-input" value={newStaffPassword} onChange={e => setNewStaffPassword(e.target.value)} required />
                </div>
              </div>

              <button type="submit" className="gov-btn gov-btn-primary" style={{ marginTop: '6px' }}>
                <Plus size={15} /> Create Staff Account
              </button>
            </form>
          </div>

          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Assigned Role</th>
                  <th>Department</th>
                  <th>Contact Email</th>
                  <th>Account Status</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: '600' }}>{u.name}</td>
                    <td><span className="status-badge waiting" style={{ fontSize: '11px' }}>{u.role_name || 'Staff'}</span></td>
                    <td>{u.department_name || '—'}</td>
                    <td>{u.email}</td>
                    <td><span className="status-badge completed" style={{ fontSize: '11px' }}>{u.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: DAILY ROOM ASSIGNMENTS */}
      {activeTab === 'rooms' && (
        <div>
          <div className="gov-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px', color: 'var(--gov-primary)' }}>
              Set Daily Doctor Consultation Room Assignment
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--gov-text-muted)', marginBottom: '14px' }}>
              Daily room allocations guide patient triage routing and digital waiting room calls.
            </p>

            <form onSubmit={handleAssignRoom} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select className="gov-input" value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)} required style={{ flex: 1, minWidth: '220px' }}>
                <option value="">Select Medical Officer...</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.department_name || 'General OPD'})</option>
                ))}
              </select>

              <input 
                type="text" 
                className="gov-input" 
                placeholder="Room Number (e.g. Room 102)"
                value={assignRoomNum}
                onChange={e => setAssignRoomNum(e.target.value)}
                style={{ width: '180px' }}
                required
              />

              <button type="submit" className="gov-btn gov-btn-accent" style={{ whiteSpace: 'nowrap' }}>
                Save Room Allocation
              </button>
            </form>
          </div>

          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Medical Officer</th>
                  <th>Department</th>
                  <th>Today's Allocated Room</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {roomAssignments.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: '600' }}>{r.doctor_name}</td>
                    <td>{r.department_name || '—'}</td>
                    <td><span className="status-badge priority">{r.room_number}</span></td>
                    <td>{r.assignment_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: DYNAMIC RBAC MATRIX */}
      {activeTab === 'rbac' && rbacMatrix && (
        <div>
          <div className="gov-card" style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--gov-primary)', marginBottom: '4px' }}>
              Dynamic Role × Module × Action Permission Matrix
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--gov-text-muted)' }}>
              All actions are evaluated dynamically against PostgreSQL role permissions. Zero hardcoded role strings in codebase.
            </p>
          </div>

          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Role Definition</th>
                  {rbacMatrix.modules?.map(m => (
                    <th key={m.id}>{m.key.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rbacMatrix.roles?.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: '700', color: 'var(--gov-primary)' }}>{r.name}</td>
                    {rbacMatrix.modules?.map(m => {
                      const perms = rbacMatrix.permissions?.filter(p => p.role_id === r.id && p.module_key === m.key);
                      return (
                        <td key={m.id} style={{ fontSize: '11.5px' }}>
                          {perms && perms.length > 0 ? (
                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                              {perms.map((p, idx) => (
                                <span key={idx} className="status-badge in_consult" style={{ padding: '2px 5px', fontSize: '10px' }}>
                                  {p.action}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: SELF-REGISTER REQUESTS */}
      {activeTab === 'requests' && (
        <div className="gov-table-container">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Applicant Name</th>
                <th>Requested Role</th>
                <th>Contact Details</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrationRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--gov-text-muted)', padding: '36px' }}>
                    No pending registration approval requests.
                  </td>
                </tr>
              ) : (
                registrationRequests.map(req => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: '600' }}>{req.name}</td>
                    <td>{req.requested_role_name}</td>
                    <td>{req.email} / {req.phone}</td>
                    <td><span className={`status-badge ${req.status}`}>{req.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="gov-btn gov-btn-primary gov-btn-sm">Approve</button>
                        <button type="button" className="gov-btn gov-btn-outline gov-btn-sm" style={{ color: 'var(--status-priority)' }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 8: SUPER ADMIN MULTI-TENANT HOSPITAL ONBOARDING */}
      {activeTab === 'superadmin' && (
        <div>
          <div className="gov-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px', color: 'var(--gov-accent)' }}>
              Provision New Multi-Tenant Hospital or Dispensary
            </h3>
            <form onSubmit={handleCreateHospital}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div className="gov-input-group">
                  <label htmlFor="hosp-name">Hospital / Facility Name</label>
                  <input id="hosp-name" type="text" className="gov-input" placeholder="e.g. AIIMS Rishikesh AYUSH Wing" value={newHospName} onChange={e => setNewHospName(e.target.value)} required />
                </div>
                <div className="gov-input-group">
                  <label htmlFor="hosp-regmode">Staff Registration Mode</label>
                  <select id="hosp-regmode" className="gov-input" value={newHospRegMode} onChange={e => setNewHospRegMode(e.target.value)}>
                    <option value="admin_creates">Admin Creates Staff Directly</option>
                    <option value="self_register_approval">Self-Register with Admin Approval</option>
                  </select>
                </div>
                <div className="gov-input-group">
                  <label htmlFor="hosp-addr">Facility Address</label>
                  <input id="hosp-addr" type="text" className="gov-input" value={newHospAddress} onChange={e => setNewHospAddress(e.target.value)} />
                </div>
                <div className="gov-input-group">
                  <label htmlFor="hosp-phone">Helpdesk Contact</label>
                  <input id="hosp-phone" type="tel" className="gov-input" value={newHospPhone} onChange={e => setNewHospPhone(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="gov-btn gov-btn-accent" style={{ marginTop: '6px' }}>
                <Plus size={15} /> Provision Facility Tenant
              </button>
            </form>
          </div>

          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Hospital Facility Name</th>
                  <th>Registration Policy</th>
                  <th>Physical Address</th>
                  <th>Contact Phone</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: '700', color: 'var(--gov-primary)' }}>{h.name}</td>
                    <td><code>{h.registration_mode}</code></td>
                    <td>{h.address || '—'}</td>
                    <td>{h.contact_phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
