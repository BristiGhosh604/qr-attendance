import { lazy, Suspense, useEffect, useState } from 'react';
import { getStoredUser } from './api.js';
import { currentRoute, navigateTo } from './navigation.js';
import AuthPage from './pages/AuthPage.jsx';

const StudentPage = lazy(() => import('./pages/StudentPage.jsx'));
const TeacherPage = lazy(() => import('./pages/TeacherPage.jsx'));

export default function App() {
  const [route, setRoute] = useState(currentRoute);
  const user = getStoredUser();

  useEffect(() => {
    const handleHashChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const validRoute = route === '/' || route === '/teacher' || route === '/student';
    if (!validRoute) navigateTo('/', { replace: true });
    else if (route === '/teacher' && user?.role !== 'TEACHER') navigateTo('/', { replace: true });
    else if (route === '/student' && user?.role !== 'STUDENT') navigateTo('/', { replace: true });
  }, [route, user?.role]);

  let page = <AuthPage />;
  if (route === '/teacher' && user?.role === 'TEACHER') page = <TeacherPage />;
  if (route === '/student' && user?.role === 'STUDENT') page = <StudentPage />;

  return (
    <Suspense fallback={<div className="app-loader"><span className="spinner spinner-dark" /><strong>Opening your workspace…</strong></div>}>
      {page}
    </Suspense>
  );
}
