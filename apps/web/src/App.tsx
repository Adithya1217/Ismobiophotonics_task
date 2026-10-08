import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import { Loader } from './components/ui';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <Loader label="Loading" />;
  if (!user) return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetails />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
