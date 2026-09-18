import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { LanguageProvider } from './context/LanguageContext';
import KioskView from './views/KioskView';
import PatientPhoneView from './views/PatientPhoneView';
import DoctorDashboardView from './views/DoctorDashboardView';
import AdminPortalView from './views/AdminPortalView';
import GovHeader from './components/common/GovHeader';
import GovBreadcrumb from './components/common/GovBreadcrumb';
import GovFooter from './components/common/GovFooter';

// Breadcrumb trails for each view
const breadcrumbMap = {
  kiosk: [
    { labelEn: 'Home', labelHi: 'होम', path: 'kiosk' },
    { labelEn: 'Kiosk Terminal', labelHi: 'कियोस्क टर्मिनल', path: 'kiosk' },
    { labelEn: 'Patient Intake', labelHi: 'मरीज पंजीकरण', active: true }
  ],
  phone: [
    { labelEn: 'Home', labelHi: 'होम', path: 'kiosk' },
    { labelEn: 'Patient Phone', labelHi: 'मरीज मोबाइल', active: true }
  ],
  doctor: [
    { labelEn: 'Home', labelHi: 'होम', path: 'kiosk' },
    { labelEn: 'Doctor Portal', labelHi: 'चिकित्सक पोर्टल', active: true }
  ],
  admin: [
    { labelEn: 'Home', labelHi: 'होम', path: 'kiosk' },
    { labelEn: 'Admin Portal', labelHi: 'प्रशासन पोर्टल', active: true }
  ]
};

// Main Application Layout Shell
function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeView = location.pathname.startsWith('/doctor')
    ? 'doctor'
    : location.pathname.startsWith('/admin') || location.pathname.startsWith('/superadmin')
    ? 'admin'
    : location.pathname.startsWith('/intake') || location.pathname.startsWith('/patient')
    ? 'phone'
    : 'kiosk';

  const handleViewChange = (view) => {
    if (view === 'kiosk') navigate('/');
    else if (view === 'phone') navigate('/intake');
    else navigate(`/${view}`);
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'transparent',
      overflow: 'hidden'
    }}>
      {/* Skip to Main Content Link for Keyboard / Screen Reader Accessibility */}
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      {/* Official Government Header at the Top of Viewport */}
      <GovHeader 
        activeView={activeView} 
        onViewChange={handleViewChange} 
      />

      {/* Government Breadcrumb Navigation Strip */}
      <GovBreadcrumb
        items={breadcrumbMap[activeView] || breadcrumbMap.kiosk}
        onNavigate={handleViewChange}
      />

      {/* Main Content Area — Scroll locked to viewport */}
      <main 
        id="main-content" 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: 'transparent',
          overflow: 'hidden',
          minHeight: 0
        }} 
        tabIndex="-1"
      >
        <Routes>
          {/* Kiosk Terminal (Default Primary Public Interface) */}
          <Route path="/" element={<KioskView />} />
          <Route path="/kiosk" element={<KioskView />} />

          {/* Patient Mobile Companion App (Scannable from Kiosk QR or Direct Link) */}
          <Route path="/phone" element={<PatientPhoneView />} />
          <Route path="/mobile" element={<PatientPhoneView />} />
          <Route path="/intake" element={<PatientPhoneView />} />
          <Route path="/patient" element={<PatientPhoneView />} />

          {/* Dedicated Doctor Clinical Suite */}
          <Route path="/doctor" element={<DoctorDashboardView />} />

          {/* Dedicated Hospital & Super Admin Portal */}
          <Route path="/admin" element={<AdminPortalView />} />
          <Route path="/superadmin" element={<AdminPortalView />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Official Government Footer — Fixed at Bottom */}
      <GovFooter />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <WebSocketProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </WebSocketProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
