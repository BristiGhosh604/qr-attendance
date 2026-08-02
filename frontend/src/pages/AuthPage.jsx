import { useEffect, useState } from 'react';
import {
  ArrowRight, ChevronDown, Eye, EyeOff, GraduationCap, LockKeyhole,
  Mail, MapPinCheck, RefreshCw, ShieldCheck, Sparkles, UserRound,
} from 'lucide-react';
import Brand from '../components/Brand.jsx';
import { api, getStoredUser, storeUser } from '../api.js';
import { navigateTo } from '../navigation.js';

const emptyLogin = { email: '', password: '' };
const emptyRegister = { name: '', email: '', password: '', role: 'STUDENT' };

function Alert({ alert }) {
  if (!alert) return null;
  return <div className={`alert alert-${alert.type} visible-alert`} role={alert.type === 'error' ? 'alert' : 'status'}>{alert.message}</div>;
}

export default function AuthPage() {
  const existingUser = getStoredUser();
  const [tab, setTab] = useState('login');
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    document.title = 'Sign in — QR Attendance';
    if (existingUser) navigateTo(existingUser.role === 'TEACHER' ? '/teacher' : '/student', { replace: true });
  }, [existingUser?.role]);

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setAlert(null);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!loginForm.email.trim() || !loginForm.password) {
      setAlert({ type: 'error', message: 'Enter your email and password to continue.' });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const user = await api.login(loginForm.email.trim(), loginForm.password);
      storeUser(user);
      setAlert({ type: 'success', message: `Welcome back, ${user.name}. Opening your portal…` });
      window.setTimeout(() => navigateTo(user.role === 'TEACHER' ? '/teacher' : '/student', { replace: true }), 500);
    } catch (error) {
      setAlert({ type: 'error', message: error.message });
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    const { name, email, password, role } = registerForm;
    if (!name.trim() || !email.trim() || !password) {
      setAlert({ type: 'error', message: 'Please complete all fields before continuing.' });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      await api.register(name.trim(), email.trim(), password, role);
      setLoginForm({ email: email.trim(), password: '' });
      setRegisterForm(emptyRegister);
      setLoading(false);
      setTab('login');
      setAlert({ type: 'success', message: 'Account created successfully. Sign in with your new account.' });
    } catch (error) {
      setAlert({ type: 'error', message: error.message });
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell auth-page">
      <section className="auth-story" aria-label="Product overview">
        <div className="story-glow story-glow-one" /><div className="story-glow story-glow-two" />
        <Brand light />
        <div className="story-copy">
          <span className="eyebrow eyebrow-light"><Sparkles /> Attendance, reimagined</span>
          <h1>Make every class count.</h1>
          <p>Secure, location-verified attendance that takes seconds—not roll calls.</p>
          <div className="story-points">
            <div className="story-point"><span><RefreshCw /></span><div><strong>Dynamic QR codes</strong><small>Fresh codes prevent screenshot sharing.</small></div></div>
            <div className="story-point"><span><MapPinCheck /></span><div><strong>GPS verified</strong><small>Attendance stays inside the classroom.</small></div></div>
            <div className="story-point"><span><ShieldCheck /></span><div><strong>Built for trust</strong><small>Every unusual attempt is recorded.</small></div></div>
          </div>
        </div>
        <div className="story-proof">
          <div className="proof-avatars" aria-hidden="true"><span>AG</span><span>RB</span><span>SK</span></div>
          <p><strong>Simple for everyone.</strong><br />Built for teachers and students.</p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand"><Brand /></div>
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <span className="eyebrow">Welcome</span>
            <h2>{tab === 'login' ? 'Good to see you again' : 'Create your account'}</h2>
            <p>{tab === 'login' ? 'Sign in to continue to your attendance portal.' : 'Join your class and start managing attendance in minutes.'}</p>
          </div>

          <div className="tabs" role="tablist" aria-label="Account access">
            <button type="button" className={`tab${tab === 'login' ? ' active' : ''}`} role="tab" aria-selected={tab === 'login'} onClick={() => changeTab('login')}>Sign in</button>
            <button type="button" className={`tab${tab === 'register' ? ' active' : ''}`} role="tab" aria-selected={tab === 'register'} onClick={() => changeTab('register')}>Create account</button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group"><label htmlFor="loginEmail">Email address</label><div className="input-shell"><Mail /><input id="loginEmail" type="email" autoComplete="email" placeholder="you@college.edu" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required /></div></div>
              <div className="form-group"><label htmlFor="loginPassword">Password</label><div className="input-shell has-action"><LockKeyhole /><input id="loginPassword" type={showLoginPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required /><button type="button" className="input-action" onClick={() => setShowLoginPassword(!showLoginPassword)} aria-label={showLoginPassword ? 'Hide password' : 'Show password'}>{showLoginPassword ? <EyeOff /> : <Eye />}</button></div></div>
              <button className="btn btn-primary btn-lg" disabled={loading} type="submit">{loading ? <><span className="spinner" />Please wait…</> : <>Sign in securely <ArrowRight /></>}</button>
              <Alert alert={alert} />
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-group"><label htmlFor="regName">Full name</label><div className="input-shell"><UserRound /><input id="regName" autoComplete="name" placeholder="Your full name" value={registerForm.name} onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })} required /></div></div>
              <div className="form-group"><label htmlFor="regEmail">Email address</label><div className="input-shell"><Mail /><input id="regEmail" type="email" autoComplete="email" placeholder="you@college.edu" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} required /></div></div>
              <div className="form-group"><label htmlFor="regPassword">Password</label><div className="input-shell has-action"><LockKeyhole /><input id="regPassword" type={showRegisterPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a secure password" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} required /><button type="button" className="input-action" onClick={() => setShowRegisterPassword(!showRegisterPassword)} aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}>{showRegisterPassword ? <EyeOff /> : <Eye />}</button></div></div>
              <div className="form-group"><label htmlFor="regRole">I am joining as</label><div className="input-shell"><GraduationCap /><select id="regRole" value={registerForm.role} onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}><option value="STUDENT">Student</option><option value="TEACHER">Teacher</option></select><ChevronDown className="select-chevron" /></div></div>
              <button className="btn btn-primary btn-lg" disabled={loading} type="submit">{loading ? <><span className="spinner" />Please wait…</> : <>Create my account <ArrowRight /></>}</button>
              <Alert alert={alert} />
            </form>
          )}
          <p className="auth-legal"><ShieldCheck /> Your attendance data is securely protected.</p>
        </div>
      </section>
    </main>
  );
}
