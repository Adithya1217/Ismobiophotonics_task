import type { DashboardStats } from '@taskflow/shared';
import { api } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../hooks';
import { ErrorPanel, Loader } from '../components/ui';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi(() => api<DashboardStats>('/dashboard'), []);
  const tiles: [string, keyof DashboardStats, string][] = [
    ['Projects', 'totalProjects', 'butter'], ['Tasks', 'totalTasks', 'lavender'], ['Completed', 'completedTasks', 'mint'],
    ['Pending', 'pendingTasks', 'pink'], ['Active projects', 'inProgressProjects', 'sky'],
  ];
  return (
    <>
      <div className="topbar"><div><div className="eyebrow">Overview</div><h1 className="page-title">Dashboard</h1></div></div>
      <p>Hi {user?.name}. Here's where your work stands.</p>
      {loading && !data ? <Loader /> : error ? <ErrorPanel error={error} onRetry={reload} /> : data && (
        <section className="kpis" aria-label="Summary">
          {tiles.map(([label, key, tone]) => (
            <div key={key} className={`kpi ${tone}`}><span className="label">{label}</span><span className="num">{data[key]}</span></div>
          ))}
        </section>
      )}
    </>
  );
}
