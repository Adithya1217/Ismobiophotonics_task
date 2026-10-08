import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Project, TASK_PRIORITIES, TASK_STATUSES, Task, TaskPriority, TaskStatus, taskSchema } from '@taskflow/shared';
import { api } from '../api';
import { useApi, useDebounced } from '../hooks';
import { ConfirmModal, Empty, ErrorPanel, Field, Icon, Loader, Modal, PriorityBadge, StatusBadge, Toast, statusLabel, useForm } from '../components/ui';
import { ProjectFormModal, dateRange } from './Projects';

function TaskFormModal({ projectId, task, onClose, onSaved }: { projectId: string; task?: Task; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({
    name: task?.name ?? '', description: task?.description ?? '', priority: (task?.priority ?? 'MEDIUM') as TaskPriority,
    status: (task?.status ?? 'PENDING') as TaskStatus, dueDate: task?.dueDate?.slice(0, 10) ?? '',
  });
  const [local, setLocal] = useState<Record<string, string[]>>({});
  const { busy, error, onSubmit, fieldError } = useForm(async () => {
    const body = { ...v, dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : null };
    const parsed = taskSchema.safeParse(body);
    if (!parsed.success) { setLocal(parsed.error.flatten().fieldErrors as Record<string, string[]>); throw Object.assign(new Error(), {}); }
    setLocal({});
    await api(task ? `/tasks/${task.id}` : `/projects/${projectId}/tasks`, { method: task ? 'PUT' : 'POST', body: parsed.data });
    onSaved();
  });
  const fe = (k: string) => local[k]?.[0] ?? fieldError(k);
  return (
    <Modal title={task ? 'Edit task' : 'New task'} onClose={onClose} footer={<>
      <button className="btn" type="button" onClick={onClose}>Cancel</button>
      <button className="btn primary" form="task-form" disabled={busy}>{busy ? 'Saving…' : task ? 'Save changes' : 'Add task'}</button>
    </>}>
      <form id="task-form" className="modal-body" onSubmit={onSubmit} noValidate>
        {error?.message && <div className="alert" role="alert">{error.message}</div>}
        <Field label="Name" error={fe('name')}><input className="input" autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="Description" error={fe('description')}><textarea className="textarea" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
        <div className="row">
          <Field label="Priority"><select className="select" value={v.priority} onChange={(e) => setV({ ...v, priority: e.target.value as TaskPriority })}>
            {TASK_PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Status"><select className="select" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as TaskStatus })}>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></Field>
        </div>
        <Field label="Due date"><input className="input" type="date" value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} /></Field>
      </form>
    </Modal>
  );
}

export default function ProjectDetails() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const q = useDebounced(search);
  const proj = useApi(() => api<{ project: Project }>(`/projects/${id}`), [id]);
  const tasks = useApi(
    () => api<{ tasks: Task[] }>(`/projects/${id}/tasks?${new URLSearchParams({ ...(q && { search: q }), ...(status && { status }), ...(priority && { priority }) })}`),
    [id, q, status, priority],
  );
  const [taskForm, setTaskForm] = useState<{ task?: Task } | null>(null);
  const [editProject, setEditProject] = useState(false);
  const [delTask, setDelTask] = useState<Task | null>(null);
  const [delProject, setDelProject] = useState(false);
  const [toast, setToast] = useState('');
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };
  const filtered = !!(q || status || priority);

  if (proj.error?.status === 404) return <div className="panel"><Empty title="Project not found" hint="It may have been deleted." action={<Link className="btn" to="/projects">Back to projects</Link>} /></div>;
  if (proj.error) return <ErrorPanel error={proj.error} onRetry={proj.reload} />;
  if (!proj.data) return <Loader />;
  const p = proj.data.project;

  const setTaskStatus = async (t: Task, s: TaskStatus) => {
    try {
      await api(`/tasks/${t.id}`, { method: 'PUT', body: { name: t.name, description: t.description, priority: t.priority, status: s, dueDate: t.dueDate } });
      tasks.reload(); say('Task updated');
    } catch (e) { say((e as Error).message); }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <Link to="/projects" className="meta"><Icon name="back" size={12} /> Projects</Link>
          <h1 className="page-title" style={{ marginTop: 8 }}>{p.name}</h1>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setEditProject(true)}><Icon name="edit" />Edit</button>
          <button className="btn danger" onClick={() => setDelProject(true)}><Icon name="trash" />Delete</button>
        </div>
      </div>
      <div className="row"><StatusBadge status={p.status} /><p className="hint">{p.description || 'No description'}</p><span className="meta">{dateRange(p)}</span></div>

      <section className="panel" aria-label="Tasks">
        <div className="panel-head"><h2>Tasks</h2><span className="spacer" /><button className="btn primary sm" onClick={() => setTaskForm({})}><Icon name="plus" size={14} />Add task</button></div>
        <div className="panel-body">
          <div className="row" style={{ marginBottom: 16 }}>
            <div className="search"><Icon name="search" /><input className="input" placeholder="Search tasks" aria-label="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <select className="select" style={{ width: 'auto' }} aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus | '')}>
              <option value="">All statuses</option>{TASK_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
            <select className="select" style={{ width: 'auto' }} aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority | '')}>
              <option value="">All priorities</option>{TASK_PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          {tasks.loading && !tasks.data ? <Loader /> : tasks.error ? <ErrorPanel error={tasks.error} onRetry={tasks.reload} /> : tasks.data && (
            tasks.data.tasks.length === 0 ? (
              <Empty title={filtered ? 'No matches' : 'No tasks yet'} hint={filtered ? 'Try a different search or filter.' : 'Add a task to get this project moving.'}
                action={!filtered && <button className="btn primary" onClick={() => setTaskForm({})}>Add task</button>} />
            ) : tasks.data.tasks.map((t) => (
              <div key={t.id} className={`task${t.status === 'COMPLETED' ? ' done' : ''}`}>
                <PriorityBadge priority={t.priority} />
                <div><div className="t-name">{t.name}</div>
                  <div className="meta">{t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : 'No due date'}{t.description ? ` · ${t.description}` : ''}</div></div>
                <div className="task-actions">
                  <select className="status-select" aria-label={`Status of ${t.name}`} value={t.status} onChange={(e) => setTaskStatus(t, e.target.value as TaskStatus)}>
                    {TASK_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
                  <button className="btn sm" aria-label={`Edit ${t.name}`} onClick={() => setTaskForm({ task: t })}><Icon name="edit" size={14} /></button>
                  <button className="btn sm danger" aria-label={`Delete ${t.name}`} onClick={() => setDelTask(t)}><Icon name="trash" size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {taskForm && <TaskFormModal projectId={id} task={taskForm.task} onClose={() => setTaskForm(null)} onSaved={() => { setTaskForm(null); tasks.reload(); say('Task saved'); }} />}
      {editProject && <ProjectFormModal project={p} onClose={() => setEditProject(false)} onSaved={() => { setEditProject(false); proj.reload(); say('Project saved'); }} />}
      {delTask && <ConfirmModal title="Delete task?" message={`"${delTask.name}" will be removed.`} confirmLabel="Delete task" onClose={() => setDelTask(null)}
        onConfirm={async () => { await api(`/tasks/${delTask.id}`, { method: 'DELETE' }); setDelTask(null); tasks.reload(); say('Task deleted'); }} />}
      {delProject && <ConfirmModal title="Delete project?" message={`"${p.name}" and all its tasks will be removed. This can't be undone.`} confirmLabel="Delete project" onClose={() => setDelProject(false)}
        onConfirm={async () => { await api(`/projects/${id}`, { method: 'DELETE' }); nav('/projects'); }} />}
      {toast && <Toast message={toast} />}
    </>
  );
}
