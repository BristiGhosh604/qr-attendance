import { useEffect, useMemo, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  CircleAlert, CircleCheck, CircleCheckBig, CircleHelp, CircleX, LoaderCircle,
  LockKeyhole, LogOut, MapPin, ScanLine, ShieldCheck, Smartphone, SunMedium,
  Wifi,
} from 'lucide-react';
import Brand from '../components/Brand.jsx';
import { api, clearStoredUser, getStoredUser } from '../api.js';
import { navigateTo } from '../navigation.js';

function createDeviceFingerprint() {
  const raw = [
    navigator.userAgent,
    `${window.screen.width}x${window.screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ].join('|');
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) - hash + raw.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

const statusContent = {
  ready: { icon: ScanLine, label: 'Ready' },
  scanning: { icon: LoaderCircle, label: 'Checking' },
  success: { icon: CircleCheckBig, label: 'Verified' },
  error: { icon: CircleAlert, label: 'Attention' },
};

function VerificationItem({ type, icon: Icon, title, message }) {
  const StateIcon = type === 'verified' ? CircleCheck : type === 'failed' ? CircleX : null;
  return (
    <div className={`verification-item ${type}`}>
      <span className="verify-icon"><Icon /></span>
      <div><strong>{title}</strong><p>{message}</p></div>
      <span className="verify-state">{StateIcon ? <StateIcon /> : <span className="spinner spinner-dark" />}</span>
    </div>
  );
}

export default function StudentPage() {
  const user = getStoredUser();
  const scannerRef = useRef(null);
  const scanActiveRef = useRef(true);
  const gpsRef = useRef({ latitude: null, longitude: null });
  const scanHandlerRef = useRef(null);
  const resetTimerRef = useRef(null);
  const deviceId = useMemo(createDeviceFingerprint, []);
  const [gps, setGps] = useState({ type: 'pending', message: 'Finding your location…' });
  const [online, setOnline] = useState(navigator.onLine);
  const [scanStatus, setScanStatus] = useState({ type: 'ready', title: 'Ready to scan', message: 'Point your camera at the live QR code shown by your teacher.' });
  const [alert, setAlert] = useState(null);

  useEffect(() => { document.title = 'Scan attendance — QR Attendance'; }, []);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline); };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGps({ type: 'failed', message: 'Location is not supported' });
      return undefined;
    }
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        gpsRef.current = { latitude: coords.latitude, longitude: coords.longitude };
        setGps({ type: 'verified', message: `Accurate to ±${Math.round(coords.accuracy)} m` });
      },
      (error) => {
        gpsRef.current = { latitude: null, longitude: null };
        setGps({ type: 'failed', message: error.code === 1 ? 'Location permission is blocked' : 'Location is currently unavailable' });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const resetScanner = (delay = 3000) => {
    window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => {
      scanActiveRef.current = true;
      setAlert(null);
      setScanStatus({ type: 'ready', title: 'Ready to scan', message: 'Point your camera at the live QR code shown by your teacher.' });
    }, delay);
  };

  const processScan = async (decodedText) => {
    if (!scanActiveRef.current) return;
    scanActiveRef.current = false;
    setAlert(null);
    const { latitude, longitude } = gpsRef.current;

    if (latitude === null || longitude === null) {
      setScanStatus({ type: 'error', title: 'Location not ready', message: 'Allow location access, then wait a moment and scan again.' });
      setAlert({ type: 'error', message: 'Your location is required before attendance can be verified.' });
      resetScanner(2800);
      return;
    }
    if (!decodedText.startsWith('QR_TOKEN:')) {
      setScanStatus({ type: 'error', title: 'Not an attendance QR', message: 'Ask your teacher to display the current live QR code.' });
      setAlert({ type: 'error', message: 'This code does not belong to QR Attendance.' });
      resetScanner(2800);
      return;
    }
    if (!navigator.onLine) {
      setScanStatus({ type: 'error', title: 'You are offline', message: 'Reconnect to the internet and scan the current QR again.' });
      setAlert({ type: 'error', message: 'An internet connection is required to mark attendance.' });
      resetScanner(3200);
      return;
    }

    setScanStatus({ type: 'scanning', title: 'Verifying attendance…', message: 'Checking the QR code, classroom location and this device.' });
    try {
      const data = await api.markAttendance(decodedText.replace('QR_TOKEN:', ''), latitude, longitude, user.userId, deviceId);
      setScanStatus({ type: 'success', title: 'Attendance confirmed!', message: `You’re all set, ${data.studentName}. Your verified attendance is recorded.` });
      setAlert({ type: 'success', message: 'Attendance marked successfully. You can close this page.' });
      scannerRef.current?.clear().catch(() => {});
    } catch (error) {
      setScanStatus({ type: 'error', title: 'Attendance not marked', message: error.message });
      setAlert({ type: 'error', message: error.message });
      resetScanner(3800);
    }
  };
  scanHandlerRef.current = processScan;

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 10,
      qrbox: (width, height) => {
        const size = Math.min(width, height, 250) * 0.82;
        return { width: size, height: size };
      },
      rememberLastUsedCamera: true,
      aspectRatio: 1,
      showTorchButtonIfSupported: true,
    }, false);
    scannerRef.current = scanner;
    scanner.render((text) => scanHandlerRef.current?.(text), () => {});
    return () => {
      window.clearTimeout(resetTimerRef.current);
      scannerRef.current = null;
      scanner.clear().catch(() => {});
    };
  }, []);

  const logout = () => {
    scannerRef.current?.clear().catch(() => {});
    clearStoredUser();
    navigateTo('/', { replace: true });
  };

  const checksReady = [gps.type === 'verified', true, online].filter(Boolean).length;
  const StatusIcon = statusContent[scanStatus.type].icon;

  return (
    <div className="student-page">
      <header className="student-topbar">
        <Brand subtitle="Student portal" />
        <div className="student-profile"><div><strong>{user.name}</strong><small>Student account</small></div><span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span><button type="button" className="icon-btn" onClick={logout} aria-label="Sign out"><LogOut /></button></div>
      </header>

      <main className="student-shell">
        <section className="student-intro"><span className="eyebrow">Secure check-in</span><h1>Mark your attendance</h1><p>Keep the teacher’s QR code inside the frame. We’ll verify your location and device automatically.</p></section>
        <section className="student-grid">
          <div className="student-primary">
            <article className={`scan-status-card status-${scanStatus.type}`}>
              <div className={`status-orb ${scanStatus.type}`}><StatusIcon /></div>
              <div className="status-copy"><span className="status-label">Scanner status</span><h2>{scanStatus.title}</h2><p>{scanStatus.message}</p></div>
              <span className={`status-pill ${scanStatus.type}`}>{scanStatus.type === 'ready' && <span className="pulse-dot" />}{statusContent[scanStatus.type].label}</span>
            </article>

            <article className="card scanner-card">
              <div className="card-header"><div><span className="section-kicker">Camera</span><h2>Scan the live QR</h2></div><span className="badge badge-neutral"><ShieldCheck /> Secure</span></div>
              <div className="scanner-stage"><div id="reader" /><div className="scanner-corner corner-tl" /><div className="scanner-corner corner-tr" /><div className="scanner-corner corner-bl" /><div className="scanner-corner corner-br" /></div>
              <div className="scan-tip"><SunMedium /><span>For a faster scan, keep the QR well lit and hold your phone steady.</span></div>
              {alert && <div className={`alert alert-${alert.type} visible-alert`} role={alert.type === 'error' ? 'alert' : 'status'}>{alert.message}</div>}
            </article>
          </div>

          <aside className="student-side" aria-label="Verification status">
            <article className="card verification-card"><div className="card-header"><div><span className="section-kicker">Before you scan</span><h2>Verification checklist</h2></div><span className="check-count">{checksReady}/3</span></div><div className="verification-list"><VerificationItem type={gps.type} icon={MapPin} title="Classroom location" message={gps.message} /><VerificationItem type="verified" icon={Smartphone} title="This device" message={`Secure ID · ${deviceId.substring(0, 8).toUpperCase()}`} /><VerificationItem type={online ? 'verified' : 'failed'} icon={Wifi} title="Connection" message={online ? 'Connected and ready' : 'No internet connection'} /></div></article>
            <article className="privacy-card"><span><LockKeyhole /></span><div><strong>Your privacy matters</strong><p>Location is used only to verify that you are within the attendance area during this scan.</p></div></article>
            <div className="help-copy"><CircleHelp /><p><strong>Having trouble?</strong><br />Allow camera and location access, then refresh this page.</p></div>
          </aside>
        </section>
      </main>
    </div>
  );
}
