import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Project, TASK_PRIORITIES, TASK_STATUSES, Task, TaskPriority, TaskStatus, taskSchema, tokens as t } from '@taskflow/shared';
import { api } from '../api';
import { useApi, useDebounced } from '../hooks';
import { Alert, Badge, Button, Chip, Confirm, Empty, ErrorBox, Field, Hard, LABEL, Loader, Sheet, f, useSubmit } from '../ui';
import { ProjectForm, dateRange } from './ProjectsScreen';

function TaskForm({ projectId, task, onClose, onSaved }: { projectId: string; task?: Task; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ name: task?.name ?? '', description: task?.description ?? '', priority: (task?.priority ?? 'MEDIUM') as TaskPriority, status: (task?.status ?? 'PENDING') as TaskStatus, dueDate: task?.dueDate?.slice(0, 10) ?? '' });
  const [local, setLocal] = useState<Record<string, string[]>>({});
  const { busy, error, submit, fieldError } = useSubmit(async () => {
    if (v.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(v.dueDate)) { setLocal({ dueDate: ['Use YYYY-MM-DD'] }); throw Object.assign(new Error(''), {}); }
    const parsed = taskSchema.safeParse({ ...v, dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : null });
    if (!parsed.success) { setLocal(parsed.error.flatten().fieldErrors as Record<string, string[]>); throw Object.assign(new Error(''), {}); }
    setLocal({});
    await api(task ? `/tasks/${task.id}` : `/projects/${projectId}/tasks`, { method: task ? 'PUT' : 'POST', body: parsed.data });
    onSaved();
  });
  const fe = (k: string) => local[k]?.[0] ?? fieldError(k);
  return (
    <Sheet title={task ? 'Edit task' : 'New task'} onClose={onClose} footer={<><Button label="Cancel" onPress={onClose} /><Button label={busy ? 'Saving…' : 'Save'} tone="butter" disabled={busy} onPress={submit} /></>}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
        {!!error?.message && <Alert text={error.message} />}
        <Field label="Name" value={v.name} onChangeText={(s) => setV({ ...v, name: s })} error={fe('name')} />
        <Field label="Description" value={v.description} onChangeText={(s) => setV({ ...v, description: s })} multiline error={fe('description')} />
        <Text style={{ fontFamily: f.sansB, fontSize: 13 }}>Priority</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{TASK_PRIORITIES.map((p) => <Chip key={p} label={LABEL[p]} active={v.priority === p} onPress={() => setV({ ...v, priority: p })} />)}</View>
        <Text style={{ fontFamily: f.sansB, fontSize: 13 }}>Status</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{TASK_STATUSES.map((s) => <Chip key={s} label={LABEL[s]} active={v.status === s} onPress={() => setV({ ...v, status: s })} />)}</View>
        <Field label="Due date (YYYY-MM-DD)" value={v.dueDate} onChangeText={(s) => setV({ ...v, dueDate: s })} error={fe('dueDate')} placeholder="2026-12-31" keyboardType="numbers-and-punctuation" />
      </ScrollView>
    </Sheet>
  );
}

export default function ProjectDetailsScreen({ id, back }: { id: string; back: () => void }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const q = useDebounced(search);
  const proj = useApi(() => api<{ project: Project }>(`/projects/${id}`), [id]);
  const tasks = useApi(() => api<{ tasks: Task[] }>(`/projects/${id}/tasks?${new URLSearchParams({ ...(q && { search: q }), ...(status && { status }), ...(priority && { priority }) })}`), [id, q, status, priority]);
  const [taskForm, setTaskForm] = useState<{ task?: Task } | null>(null);
  const [editProject, setEditProject] = useState(false);
  const [delTask, setDelTask] = useState<Task | null>(null);
  const [delProject, setDelProject] = useState(false);
  const [actionErr, setActionErr] = useState('');
  const filtered = !!(q || status || priority);

  if (proj.error?.status === 404) return <Empty title="Project not found" action={<Button label="Back" onPress={back} />} />;
  if (proj.error && !proj.data) return <ErrorBox error={proj.error} onRetry={proj.reload} />;
  if (!proj.data) return <Loader />;
  const p = proj.data.project;

  const setTaskStatus = async (tk: Task, s: TaskStatus) => {
    setActionErr('');
    try { await api(`/tasks/${tk.id}`, { method: 'PUT', body: { name: tk.name, description: tk.description, priority: tk.priority, status: s, dueDate: tk.dueDate } }); tasks.reload(); }
    catch (e) { setActionErr((e as Error).message); }
  };
  const refreshAll = async () => { await Promise.all([proj.reload(), tasks.refresh()]); };

  const header = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      <Button label="< Projects" small onPress={back} />
      <Text style={{ fontFamily: f.pixel, fontSize: 16, color: t.color.ink, lineHeight: 24 }}>{p.name}</Text>
      <Badge value={p.status} />
      <Text style={{ fontFamily: f.sans, fontSize: 14, color: t.color.inkMuted }}>{p.description || 'No description'}</Text>
      <Text style={{ fontFamily: f.mono, fontSize: 12, color: t.color.inkMuted }}>{dateRange(p)}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Edit" small onPress={() => setEditProject(true)} /><Button label="Delete" small tone="pink" onPress={() => setDelProject(true)} />
        <View style={{ flex: 1 }} /><Button label="+ Task" small tone="butter" onPress={() => setTaskForm({})} />
      </View>
      <Field label="Search tasks" value={search} onChangeText={setSearch} placeholder="Search by name" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="Any status" active={status === ''} onPress={() => setStatus('')} />
        {TASK_STATUSES.map((s) => <Chip key={s} label={LABEL[s]} active={status === s} onPress={() => setStatus(s)} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="Any priority" active={priority === ''} onPress={() => setPriority('')} />
        {TASK_PRIORITIES.map((s) => <Chip key={s} label={LABEL[s]} active={priority === s} onPress={() => setPriority(s)} />)}
      </ScrollView>
      {!!actionErr && <Alert text={actionErr} />}
      {tasks.loading && !tasks.data && <Loader />}
      {tasks.error && !tasks.data && <ErrorBox error={tasks.error} onRetry={tasks.reload} />}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={tasks.data?.tasks ?? []} keyExtractor={(x) => x.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={tasks.refreshing} onRefresh={refreshAll} />}
        ListEmptyComponent={tasks.data ? <Empty title={filtered ? 'No matches' : 'No tasks yet'} hint={filtered ? 'Try a different search or filter.' : 'Add a task to get moving.'} /> : null}
        renderItem={({ item: tk }) => (
          <Hard bw={2} radius={t.radius.lg}>
            <View style={{ padding: 12, gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}><Badge value={tk.priority} /><Badge value={tk.status} /></View>
              <Text style={{ fontFamily: f.sansB, fontSize: 15, color: tk.status === 'COMPLETED' ? t.color.inkMuted : t.color.ink, textDecorationLine: tk.status === 'COMPLETED' ? 'line-through' : 'none' }}>{tk.name}</Text>
              <Text style={{ fontFamily: f.mono, fontSize: 12, color: t.color.inkMuted }}>{tk.dueDate ? `Due ${new Date(tk.dueDate).toLocaleDateString()}` : 'No due date'}</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {TASK_STATUSES.map((s) => <Chip key={s} label={LABEL[s]} active={tk.status === s} onPress={() => tk.status !== s && setTaskStatus(tk, s)} />)}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="Edit" small onPress={() => setTaskForm({ task: tk })} /><Button label="Delete" small tone="pink" onPress={() => setDelTask(tk)} />
              </View>
            </View>
          </Hard>
        )}
      />
      {taskForm && <TaskForm projectId={id} task={taskForm.task} onClose={() => setTaskForm(null)} onSaved={() => { setTaskForm(null); tasks.reload(); }} />}
      {editProject && <ProjectForm project={p} onClose={() => setEditProject(false)} onSaved={() => { setEditProject(false); proj.reload(); }} />}
      {delTask && <Confirm title="Delete task?" message={`"${delTask.name}" will be removed.`} confirmLabel="Delete task" onClose={() => setDelTask(null)}
        onConfirm={async () => { await api(`/tasks/${delTask.id}`, { method: 'DELETE' }); setDelTask(null); tasks.reload(); }} />}
      {delProject && <Confirm title="Delete project?" message={`"${p.name}" and all its tasks will be removed.`} confirmLabel="Delete project" onClose={() => setDelProject(false)}
        onConfirm={async () => { await api(`/projects/${id}`, { method: 'DELETE' }); back(); }} />}
    </View>
  );
}
