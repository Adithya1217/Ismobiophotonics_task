import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PROJECT_STATUSES, Project, ProjectStatus, projectSchema } from '@taskflow/shared';
import { api } from '../api';
import { useApi, useDebounced } from '../hooks';
import { ConfirmModal, Empty, ErrorPanel, Field, Icon, Loader, Modal, StatusBadge, Toast, statusLabel, useForm } from '../components/ui';

export const dateRange = (p: Project) => {
  const f = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '…');
  return p.startDate || p.endDate ? `${f(p.startDate)} → ${f(p.endDate)}` : 'No dates set';
};

export function ProjectFormModal({ project, onClose, onSaved }: { project?: Project; onClose: () => void; onSaved: (p: Project) => void }) {
  const [v, setV] = useState({ name: project?.name ?? '', description: project?.description ?? '', status: (project?.status ?? 'NOT_STARTED') as ProjectStatus,
    startDate: project?.startDate?.slice(0, 10) ?? '', endDate: project?.endDate?.slice(0, 10) ?? '' });
  const [local, setLocal] = useState<Record<string, string[]>>({});
  const { busy, error, onSubmit, fieldError } = useForm(async () => {
    const iso = (d: string) => (d ? new Date(d).toISOString() : null);
    const parsed = projectSchema.safeParse({ ...v, startDate: iso(v.startDate), endDate: iso(v.endDate) });
    if (!parsed.success) { setLocal(parsed.error.flatten().fieldErrors as Record<string, string[]>); throw Object.assign(new Error(), {}); }
    setLocal({});
    const r = await api<{ project: Project }>(project ? `/projects/${project.id}` : '/projects', { method: project ? 'PUT' : 'POST', body: parsed.data });
    onSaved(r.project);
  });
  const fe = (k: string) => local[k]?.[0] ?? fieldError(k);
  return (
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose} footer={<>
      <button className="btn" type="button" onClick={onClose}>Cancel</button>
      <button className="btn primary" form="project-form" disabled={busy}>{busy ? 'Saving…' : project ? 'Save changes' : 'Add project'}</button>
    </>}>
      <form id="project-form" className="modal-body" onSubmit={onSubmit} noValidate>
        {error?.message && <div className="alert" role="alert">{error.message}</div>}
        <Field label="Name" error={fe('name')}><input className="input" value={v.name} autoFocus onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="Description" error={fe('description')}><textarea className="textarea" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
        <Field label="Status"><select className="select" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as ProjectStatus })}>
          {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select></Field>
        <Field label="Start date" error={fe('startDate')}><input className="input" type="date" value={v.startDate} onChange={(e) => setV({ ...v, startDate: e.target.value })} /></Field>
        <Field label="End date" error={fe('endDate')}><input className="input" type="date" value={v.endDate} onChange={(e) => setV({ ...v, endDate: e.target.value })} /></Field>
      </form>
    </Modal>
  );
}

export default function Projects() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const q = useDebounced(search);
  const { data, error, loading, reload } = useApi(
    () => api<{ projects: Project[] }>(`/projects?${new URLSearchParams({ ...(q && { search: q }), ...(status && { status }) })}`),
    [q, status],
  );
  const [form, setForm] = useState<{ project?: Project } | null>(null);
  const [del, setDel] = useState<Project | null>(null);
  const [toast, setToast] = useState('');
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };
  const filtered = !!(q || status);

  return (
    <>
      <div className="topbar">
        <div><div className="eyebrow">Your work</div><h1 className="page-title">Projects</h1></div>
        <button className="btn primary" onClick={() => setForm({})}><Icon name="plus" />Add project</button>
      </div>
      <div className="row">
        <div className="search"><Icon name="search" /><input className="input" placeholder="Search projects" aria-label="Search projects" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="row" role="group" aria-label="Filter by status">
          <button className="chip" aria-pressed={status === ''} onClick={() => setStatus('')}>All</button>
          {PROJECT_STATUSES.map((s) => <button key={s} className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>{statusLabel(s)}</button>)}
        </div>
      </div>
      {loading && !data ? <Loader /> : error ? <ErrorPanel error={error} onRetry={reload} /> : data && (
        data.projects.length === 0 ? (
          <div className="panel"><Empty title={filtered ? 'No matches' : 'Nothing here yet'} hint={filtered ? 'Try a different search or filter.' : 'Add your first project to start tracking tasks.'}
            action={!filtered && <button className="btn primary" onClick={() => setForm({})}>Add project</button>} /></div>
        ) : (
          <div className="grid cols-2">
            {data.projects.map((p) => (
              <article key={p.id} className="card">
                <div className="row"><StatusBadge status={p.status} /><span className="spacer" /><span className="meta">{p.taskCount ?? 0} tasks</span></div>
                <h3><Link to={`/projects/${p.id}`}>{p.name}</Link></h3>
                <p className="hint">{p.description || 'No description'}</p>
                <div className="meta">{dateRange(p)}</div>
                <div className="row">
                  <Link className="btn sm" to={`/projects/${p.id}`}>Open</Link>
                  <button className="btn sm" onClick={() => setForm({ project: p })}><Icon name="edit" size={14} />Edit</button>
                  <button className="btn sm danger" onClick={() => setDel(p)}><Icon name="trash" size={14} />Delete</button>
                </div>
              </article>
            ))}
          </div>
        )
      )}
      {form && <ProjectFormModal project={form.project} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); say('Project saved'); }} />}
      {del && <ConfirmModal title="Delete project?" message={`"${del.name}" and all its tasks will be removed. This can't be undone.`} confirmLabel="Delete project"
        onClose={() => setDel(null)} onConfirm={async () => { await api(`/projects/${del.id}`, { method: 'DELETE' }); setDel(null); reload(); say('Project deleted'); }} />}
      {toast && <Toast message={toast} />}
    </>
  );
}
