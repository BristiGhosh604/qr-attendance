import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, BadgeCheck, CalendarDays, ChartNoAxesCombined, ChartSpline,
  ChevronDown, CircleDotDashed, ClipboardCheck, Clock3, Info, LayoutDashboard,
  LocateFixed, LockKeyhole, LogOut, MapPin, MapPinned, MoveHorizontal,
  MoveVertical, Plus, QrCode, Radio, RadioTower, RefreshCw, ScanFace,
  ScanLine, ShieldAlert, ShieldCheck, TimerReset, TriangleAlert, UserCheck,
  UsersRound,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import Brand from '../components/Brand.jsx';
import { api, clearStoredUser, getStoredUser } from '../api.js';
import { navigateTo } from '../navigation.js';

const sections = [
  { id: 'dashboard', label: 'Overview', mobileLabel: 'Overview', icon: LayoutDashboard },
  { id: 'session', label: 'Start session', mobileLabel: 'Session', icon: RadioTower },
  { id: 'students', label: 'Present students', mobileLabel: 'Students', icon: UsersRound },
  { id: 'audit', label: 'Security audit', mobileLabel: 'Audit', icon: ShieldCheck },
  { id: 'analytics', label: 'Analytics', mobileLabel: 'Trends', icon: ChartNoAxesCombined },
];

const emptyAnalytics = { labels: [], data: [], totalSessions: 0 };

function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon /></span><h3>{title}</h3><p>{message}</p>{action}
    </div>
  );
}

function StatCard({ icon: Icon, tone, value, label, note, side }) {
  return (
    <article className="stat-card">
      <div className="stat-top"><span className={`stat-icon icon-${tone}`}><Icon /></span>{side}</div>
      <div className={`stat-number${typeof value === 'string' && value.length > 5 ? ' stat-word' : ''}`}>{value}</div>
      <div className="stat-label">{label}</div><div className="stat-note">{note}</div>
    </article>
  );
}

function Alert({ alert }) {
  if (!alert) return null;
  return <div className={`alert alert-${alert.type} visible-alert`} role={alert.type === 'error' ? 'alert' : 'status'}>{alert.message}</div>;
}

function AttendanceTable({ students }) {
  if (!students.length) return <EmptyState icon={ScanLine} title="Ready for the first scan" message="Students appear here as soon as their attendance is verified." />;
  return (
    <div className="table-scroll">
      <table className="student-table">
        <thead><tr><th>Student</th><th>Time</th><th>Verification</th></tr></thead>
        <tbody>{students.map((student, index) => (
          <tr key={`${student.studentId}-${student.scannedAt}`}>
            <td><div className="student-cell"><span className="table-index">{String(index + 1).padStart(2, '0')}</span><span className="avatar">{student.studentName?.charAt(0).toUpperCase()}</span><span><strong>{student.studentName}</strong><small>Student ID · {student.studentId}</small></span></div></td>
            <td><span className="time-cell"><Clock3 />{new Date(student.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
            <td><span className="badge badge-success"><BadgeCheck /> Verified</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export default function TeacherPage() {
  const user = getStoredUser();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [audit, setAudit] = useState({ totalPresent: 0, totalSuspicious: 0, suspiciousAttempts: [] });
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [countdown, setCountdown] = useState(15);
  const [sessionForm, setSessionForm] = useState({ radius: '500', latitude: '', longitude: '' });
  const [sessionAlert, setSessionAlert] = useState(null);
  const [startingMode, setStartingMode] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!user) return;
    setAnalyticsLoading(true);
    try { setAnalytics(await api.getAnalytics(user.userId)); }
    catch (error) { console.error(error); }
    finally { setAnalyticsLoading(false); }
  }, [user?.userId]);

  const loadSessionData = useCallback(async (sessionId) => {
    try {
      const [presentData, auditData] = await Promise.all([api.getPresent(sessionId), api.getAudit(sessionId)]);
      setStudents(presentData);
      setAudit(auditData);
    } catch (error) { console.error(error); }
  }, []);

  const refreshQr = useCallback(async (sessionId) => {
    try {
      const data = await api.refreshQr(sessionId);
      setSession((current) => current ? { ...current, qrImage: data.qrImage, refreshedAt: new Date() } : current);
      setCountdown(15);
    } catch (error) { console.error(error); }
  }, []);

  useEffect(() => { document.title = 'Teacher workspace — QR Attendance'; loadAnalytics(); }, [loadAnalytics]);

  useEffect(() => {
    if (!session?.sessionId) return undefined;
    loadSessionData(session.sessionId);
    const attendanceTimer = window.setInterval(() => loadSessionData(session.sessionId), 5000);
    const qrTimer = window.setInterval(() => refreshQr(session.sessionId), 15000);
    const countdownTimer = window.setInterval(() => setCountdown((value) => value <= 1 ? 15 : value - 1), 1000);
    return () => {
      window.clearInterval(attendanceTimer);
      window.clearInterval(qrTimer);
      window.clearInterval(countdownTimer);
    };
  }, [session?.sessionId, loadSessionData, refreshQr]);

  const logout = () => { clearStoredUser(); navigateTo('/', { replace: true }); };

  const startSession = async (latitude, longitude, mode) => {
    setStartingMode(mode);
    setSessionAlert(null);
    try {
      const data = await api.createSession(user.userId, latitude, longitude, Number(sessionForm.radius));
      setSession({ ...data, refreshedAt: new Date() });
      setStudents([]);
      setAudit({ totalPresent: 0, totalSuspicious: 0, suspiciousAttempts: [] });
      setCountdown(15);
      setSessionAlert({ type: 'success', message: 'Session is live. The secure QR is ready to share.' });
      window.setTimeout(() => setActiveSection('dashboard'), 650);
    } catch (error) {
      setSessionAlert({ type: 'error', message: error.message });
    } finally { setStartingMode(null); }
  };

  const detectAndStart = () => {
    if (!navigator.geolocation) {
      setSessionAlert({ type: 'error', message: 'Location is not supported in this browser. Enter the coordinates instead.' });
      return;
    }
    setStartingMode('auto');
    setSessionAlert(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setSessionForm((current) => ({ ...current, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }));
        startSession(coords.latitude, coords.longitude, 'auto');
      },
      (error) => {
        const messages = { 1: 'Location access is blocked. Allow it or enter coordinates.', 2: 'Your location is unavailable. Enter the coordinates instead.', 3: 'Location timed out. Enter the coordinates instead.' };
        setSessionAlert({ type: 'error', message: messages[error.code] || 'Could not detect your location.' });
        setStartingMode(null);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  };

  const manualStart = () => {
    const latitude = Number(sessionForm.latitude);
    const longitude = Number(sessionForm.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setSessionAlert({ type: 'error', message: 'Enter both latitude and longitude before starting.' });
      return;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setSessionAlert({ type: 'error', message: 'Those coordinates are outside the valid latitude or longitude range.' });
      return;
    }
    startSession(latitude, longitude, 'manual');
  };

  const totalAttendance = analytics.data.reduce((sum, value) => sum + value, 0);
  const averageAttendance = analytics.totalSessions ? (totalAttendance / analytics.totalSessions).toFixed(1) : '0';
  const chartData = analytics.labels.map((label, index) => ({
    date: new Date(`${label}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    students: analytics.data[index],
  }));

  const navigation = (mobile = false) => sections.map(({ id, label, mobileLabel, icon: Icon }, index) => (
    <button type="button" key={id} className={`nav-item${activeSection === id ? ' active' : ''}`} onClick={() => setActiveSection(id)}>
      <Icon /><span>{mobile ? mobileLabel : label}</span>{!mobile && id === 'audit' && audit.totalSuspicious > 0 && <span className="nav-dot visible" />}
    </button>
  ));

  return (
    <div className="app-layout dashboard-page">
      <aside className="sidebar" aria-label="Teacher workspace sidebar">
        <span className="sidebar-brand"><Brand light subtitle="Teacher workspace" /></span>
        <nav className="sidebar-nav" aria-label="Main navigation"><p className="nav-label">Workspace</p>{navigation().slice(0, 3)}<p className="nav-label nav-label-spaced">Insights</p>{navigation().slice(3)}</nav>
        <div className="sidebar-security"><div className="security-icon"><ShieldCheck /></div><strong>Protected sessions</strong><p>QR, GPS and device verification are active.</p></div>
        <div className="sidebar-footer"><div className="user-pill"><div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div><div className="user-info"><p>{user.name}</p><span>Teacher account</span></div><button type="button" className="icon-btn icon-btn-dark" onClick={logout} aria-label="Sign out"><LogOut /></button></div></div>
      </aside>

      <header className="mobile-topbar"><Brand subtitle="Teacher workspace" /><button type="button" className="icon-btn" onClick={logout} aria-label="Sign out"><LogOut /></button></header>

      <main className="main-content">
        {activeSection === 'dashboard' && (
          <section className="app-section active-section">
            <div className="page-header page-header-action"><div><span className="eyebrow">Teacher workspace</span><h1>Your classroom, at a glance</h1><p>{greeting}, {user.name}. Here’s what is happening today.</p></div><button type="button" className="btn btn-primary btn-auto" onClick={() => setActiveSection('session')}><Plus /> New session</button></div>
            <div className="stats-row">
              <StatCard icon={UserCheck} tone="green" value={students.length} label="Students present" note="In the active session" side={<span className="trend trend-good"><Radio /> Live</span>} />
              <StatCard icon={ShieldAlert} tone="coral" value={audit.totalSuspicious} label="Flagged attempts" note="Requires your review" side={<span className="trend">Monitored</span>} />
              <StatCard icon={Activity} tone="blue" value={session ? 'Active' : 'Inactive'} label="Session status" note={session ? 'QR verification is running' : 'Start when your class begins'} side={<span className="status-dot" />} />
              <StatCard icon={TimerReset} tone="amber" value={`${countdown}s`} label="Next QR refresh" note="Single-use secure token" side={<span className="trend">Auto</span>} />
            </div>
            <div className="dashboard-grid">
              <article className="card qr-card">
                <div className="card-header"><div><span className="section-kicker">Active session</span><h2>Live attendance QR</h2></div>{session && <span className="badge badge-success"><span className="pulse-dot" /> Live</span>}</div>
                {session ? (
                  <div className="qr-live">
                    <div className="qr-stage"><div className="qr-corners"><div id="qrWrapper"><img id="qrImage" src={`data:image/png;base64,${session.qrImage}`} alt="Live attendance QR code" /></div></div></div>
                    <div className="countdown-wrap"><div className="countdown-label"><span><RefreshCw /> New secure code in</span><strong>{countdown}s</strong></div><div className="countdown-bar-bg"><div className="countdown-bar-fill" style={{ width: `${countdown / 15 * 100}%` }} /></div></div>
                    <p className="qr-caption">Updated at {session.refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    <div className="secure-note"><LockKeyhole /><span>Single-use token · Session expires in 20 minutes</span></div>
                  </div>
                ) : <div className="empty-state-soft"><EmptyState icon={QrCode} title="No live QR yet" message="Start a session and the secure QR code will appear here." action={<button type="button" className="btn btn-primary btn-auto" onClick={() => setActiveSection('session')}><RadioTower /> Start a session</button>} /></div>}
              </article>
              <article className="card attendance-card"><div className="card-header"><div><span className="section-kicker">Real-time register</span><h2>Present students</h2></div><span className="live-copy">{session ? <><span className="pulse-dot" /> Live · updates every 5s</> : 'Waiting for a session'}</span></div><div className="table-container"><AttendanceTable students={students} /></div></article>
            </div>
          </section>
        )}

        {activeSection === 'session' && (
          <section className="app-section active-section">
            <div className="page-header"><span className="eyebrow">Session setup</span><h1>Open the attendance window</h1><p>Choose the allowed area, confirm the classroom location, and go live.</p></div>
            <div className="session-grid">
              <article className="card setup-card">
                <div className="card-header"><div><span className="step-chip">01</span><h2>Session settings</h2></div><span className="badge badge-neutral"><Clock3 /> 20 min</span></div>
                <div className="form-group"><label htmlFor="radius">Allowed attendance radius</label><div className="input-shell"><CircleDotDashed /><select id="radius" value={sessionForm.radius} onChange={(e) => setSessionForm({ ...sessionForm, radius: e.target.value })}><option value="500">500 m — Indoor or home testing</option><option value="100">100 m — Same building</option><option value="50">50 m — Same floor</option><option value="10">10 m — Same room (outdoor GPS)</option><option value="5">5 m — Strict open-air mode</option></select><ChevronDown className="select-chevron" /></div><p className="input-hint"><Info /> 50–100 m is usually more reliable inside large buildings.</p></div>
                <div className="form-group"><label>Classroom coordinates</label><div className="coordinate-grid"><div><span className="coordinate-label">Latitude</span><div className="input-shell"><MoveVertical /><input type="number" step="any" placeholder="22.5726" value={sessionForm.latitude} onChange={(e) => setSessionForm({ ...sessionForm, latitude: e.target.value })} /></div></div><div><span className="coordinate-label">Longitude</span><div className="input-shell"><MoveHorizontal /><input type="number" step="any" placeholder="88.3639" value={sessionForm.longitude} onChange={(e) => setSessionForm({ ...sessionForm, longitude: e.target.value })} /></div></div></div><p className="input-hint"><MapPin /> Use auto-detect, or paste coordinates from Google Maps.</p></div>
                <div className="session-actions"><button type="button" className="btn btn-primary" disabled={Boolean(startingMode)} onClick={detectAndStart}>{startingMode === 'auto' ? <><span className="spinner" /> Finding classroom…</> : <><LocateFixed /> Detect &amp; start</>}</button><button type="button" className="btn btn-secondary" disabled={Boolean(startingMode)} onClick={manualStart}>{startingMode === 'manual' ? <><span className="spinner spinner-dark" /> Starting…</> : <><MapPinned /> Use coordinates</>}</button></div>
                <Alert alert={sessionAlert} />
              </article>
              <aside className="card flow-card" aria-label="Secure attendance flow"><div className="card-header"><div><span className="section-kicker">What happens next</span><h2>A secure flow, end to end</h2></div></div><ol className="flow-list"><li><span>1</span><div><strong>Anchor the classroom</strong><p>Your chosen coordinates become the centre of the attendance area.</p></div></li><li><span>2</span><div><strong>Show the live QR</strong><p>A new single-use code is generated automatically every 15 seconds.</p></div></li><li><span>3</span><div><strong>Verify each student</strong><p>GPS, session validity and device identity are checked together.</p></div></li><li><span>4</span><div><strong>Review with confidence</strong><p>Verified attendance and unusual attempts update in real time.</p></div></li></ol><div className="trust-banner"><ShieldCheck /><div><strong>Anti-proxy protection</strong><p>Dynamic tokens and device checks reduce shared-code attendance.</p></div></div></aside>
            </div>
          </section>
        )}

        {activeSection === 'students' && (
          <section className="app-section active-section"><div className="page-header page-header-action"><div><span className="eyebrow">Live register</span><h1>Present students</h1><p>Verified attendance for the current session, updated automatically.</p></div><span className="badge badge-success badge-large">{students.length} present</span></div><article className="card full-table-card"><div className="card-header"><div><span className="section-kicker">Current class</span><h2>Attendance register</h2></div><span className="live-copy"><span className="pulse-dot" /> Refreshes every 5 seconds</span></div><div className="table-container">{session ? <AttendanceTable students={students} /> : <EmptyState icon={ClipboardCheck} title="No active register" message="Start a session to begin recording attendance." action={<button type="button" className="btn btn-primary btn-auto" onClick={() => setActiveSection('session')}>Start session</button>} />}</div></article></section>
        )}

        {activeSection === 'audit' && (
          <section className="app-section active-section"><div className="page-header"><span className="eyebrow">Session security</span><h1>Security audit</h1><p>Review attempts that did not pass token, GPS, or device verification.</p></div><div className="audit-summary"><StatCard icon={ShieldAlert} tone="coral" value={audit.totalSuspicious} label="Flagged attempts" /><StatCard icon={BadgeCheck} tone="green" value={audit.totalPresent} label="Verified students" /><article className="security-summary-card"><div><ScanFace /></div><div><strong>Three-layer verification</strong><p>Token validity, geofence and device fingerprint are checked for every scan.</p></div></article></div><article className="card"><div className="card-header"><div><span className="section-kicker">Review queue</span><h2>Flagged attempts</h2></div><span className="badge badge-neutral">Current session</span></div>{!audit.suspiciousAttempts?.length ? <EmptyState icon={ShieldCheck} title="Everything looks secure" message="No suspicious attempts have been detected in this session." /> : <div className="audit-list">{audit.suspiciousAttempts.map((item, index) => <article className="audit-item" key={`${item.studentName}-${item.attemptedAt}-${index}`}><span className="audit-alert-icon"><TriangleAlert /></span><div className="audit-detail"><div><strong>{item.studentName}</strong><span className="badge badge-danger">Flagged</span></div><p>{item.reason}</p><small><Clock3 />{new Date(item.attemptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<span>·</span><MapPin />{Number(item.lat).toFixed(4)}, {Number(item.lng).toFixed(4)}</small></div></article>)}</div>}</article></section>
        )}

        {activeSection === 'analytics' && (
          <section className="app-section active-section"><div className="page-header page-header-action"><div><span className="eyebrow">30-day overview</span><h1>Attendance analytics</h1><p>Understand participation patterns across your recent sessions.</p></div><button type="button" className="btn btn-secondary btn-auto" onClick={loadAnalytics}><RefreshCw /> Refresh data</button></div><div className="stats-row stats-row-three"><StatCard icon={CalendarDays} tone="blue" value={analytics.totalSessions} label="Total sessions" note="All recorded sessions" /><StatCard icon={UsersRound} tone="green" value={totalAttendance} label="Verified attendances" note="During the last 30 days" /><StatCard icon={ChartSpline} tone="amber" value={averageAttendance} label="Average per session" note="Across all sessions" /></div><article className="card chart-card"><div className="card-header"><div><span className="section-kicker">Attendance trend</span><h2>Daily verified attendance</h2></div><span className="badge badge-neutral">Last 30 days</span></div><div className="chart-wrap">{analyticsLoading ? <p className="chart-placeholder"><span className="spinner spinner-dark" /> Loading analytics…</p> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}><defs><linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f766e" stopOpacity={0.22} /><stop offset="100%" stopColor="#0f766e" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf2ef" /><XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={30} tick={{ fill: '#78908a', fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#78908a', fontSize: 11 }} /><Tooltip cursor={{ stroke: '#b9d8d1', strokeDasharray: '4 4' }} contentStyle={{ background: '#10251f', border: 0, borderRadius: 10, color: '#fff', fontSize: 12 }} /><Area type="monotone" dataKey="students" stroke="#0f766e" strokeWidth={2.5} fill="url(#attendanceGradient)" activeDot={{ r: 5, fill: '#0f766e', stroke: '#fff', strokeWidth: 3 }} /></AreaChart></ResponsiveContainer>}</div></article></section>
        )}
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{navigation(true)}</nav>
    </div>
  );
}
