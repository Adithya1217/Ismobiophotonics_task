import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { PROJECT_STATUSES, Project, ProjectStatus, projectSchema, tokens as t } from '@taskflow/shared';
import { api } from '../api';
import { useApi, useDebounced } from '../hooks';
import { Alert, Badge, Button, Chip, Confirm, Empty, ErrorBox, Field, Hard, LABEL, Loader, Sheet, f, useSubmit } from '../ui';

export const dateRange = (p: Project) => {
  const f = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '…');
  return p.startDate || p.endDate ? `${f(p.startDate)} → ${f(p.endDate)}` : 'No dates set';
};

export function ProjectForm({ project, onClose, onSaved }: { project?: Project; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ name: project?.name ?? '', description: project?.description ?? '', status: (project?.status ?? 'NOT_STARTED') as ProjectStatus,
    startDate: project?.startDate?.slice(0, 10) ?? '', endDate: project?.endDate?.slice(0, 10) ?? '' });
  const [local, setLocal] = useState<Record<string, string[]>>({});
  const { busy, error, submit, fieldError } = useSubmit(async () => {
    const bad = (['startDate', 'endDate'] as const).filter((k) => v[k] && !/^\d{4}-\d{2}-\d{2}$/.test(v[k]));
    if (bad.length) { setLocal(Object.fromEntries(bad.map((k) => [k, ['Use YYYY-MM-DD']]))); throw Object.assign(new Error(''), {}); }
    const iso = (d: string) => (d ? new Date(d).toISOString() : null);
    const parsed = projectSchema.safeParse({ ...v, startDate: iso(v.startDate), endDate: iso(v.endDate) });
    if (!parsed.success) { setLocal(parsed.error.flatten().fieldErrors as Record<string, string[]>); throw Object.assign(new Error(''), {}); }
    setLocal({});
    await api(project ? `/projects/${project.id}` : '/projects', { method: project ? 'PUT' : 'POST', body: parsed.data });
    onSaved();
  });
  const fe = (k: string) => local[k]?.[0] ?? fieldError(k);
  return (
    <Sheet title={project ? 'Edit project' : 'New project'} onClose={onClose} footer={<><Button label="Cancel" onPress={onClose} /><Button label={busy ? 'Saving…' : 'Save'} tone="butter" disabled={busy} onPress={submit} /></>}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
        {!!error?.message && <Alert text={error.message} />}
        <Field label="Name" value={v.name} onChangeText={(s) => setV({ ...v, name: s })} error={fe('name')} />
        <Field label="Description" value={v.description} onChangeText={(s) => setV({ ...v, description: s })} multiline error={fe('description')} />
        <Field label="Start date (YYYY-MM-DD)" value={v.startDate} onChangeText={(s) => setV({ ...v, startDate: s })} error={fe('startDate')} placeholder="2026-01-31" keyboardType="numbers-and-punctuation" />
        <Field label="End date (YYYY-MM-DD)" value={v.endDate} onChangeText={(s) => setV({ ...v, endDate: s })} error={fe('endDate')} placeholder="2026-12-31" keyboardType="numbers-and-punctuation" />
        <Text style={{ fontFamily: f.sansB, fontSize: 13 }}>Status</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PROJECT_STATUSES.map((s) => <Chip key={s} label={LABEL[s]} active={v.status === s} onPress={() => setV({ ...v, status: s })} />)}
        </View>
      </ScrollView>
    </Sheet>
  );
}

export default function ProjectsScreen({ open }: { open: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const q = useDebounced(search);
  const { data, error, loading, refreshing, refresh, reload } = useApi(
    () => api<{ projects: Project[] }>(`/projects?${new URLSearchParams({ ...(q && { search: q }), ...(status && { status }) })}`), [q, status]);
  const [form, setForm] = useState<{ project?: Project } | null>(null);
  const [del, setDel] = useState<Project | null>(null);
  const filtered = !!(q || status);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: f.pixel, fontSize: 18, color: t.color.ink }}>Projects</Text>
          <Button label="+ Add" tone="butter" small onPress={() => setForm({})} />
        </View>
        <Field label="Search projects" value={search} onChangeText={setSearch} placeholder="Search by name" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="All" active={status === ''} onPress={() => setStatus('')} />
          {PROJECT_STATUSES.map((s) => <Chip key={s} label={LABEL[s]} active={status === s} onPress={() => setStatus(s)} />)}
        </ScrollView>
      </View>
      {loading && !data ? <Loader /> : error && !data ? <ErrorBox error={error} onRetry={reload} /> : (
        <FlatList
          data={data?.projects ?? []} keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 14, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListEmptyComponent={<Empty title={filtered ? 'No matches' : 'Nothing here yet'} hint={filtered ? 'Try a different search or filter.' : 'Add your first project.'} />}
          renderItem={({ item: p }) => (
            <Hard bw={2} radius={t.radius.lg}>
              <Pressable onPress={() => open(p.id)} accessibilityRole="button" accessibilityLabel={`Open ${p.name}`} style={{ padding: 14, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge value={p.status} /><Text style={{ fontFamily: f.mono, fontSize: 12, color: t.color.inkMuted }}>{p.taskCount ?? 0} tasks</Text>
                </View>
                <Text style={{ fontFamily: f.sansB, fontSize: 16, color: t.color.ink }}>{p.name}</Text>
                <Text style={{ fontFamily: f.sans, fontSize: 13, color: t.color.inkMuted }}>{p.description || 'No description'}</Text>
                <Text style={{ fontFamily: f.mono, fontSize: 12, color: t.color.inkMuted }}>{dateRange(p)}</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 10, padding: 14, paddingTop: 0 }}>
                <Button label="Edit" small onPress={() => setForm({ project: p })} /><Button label="Delete" small tone="pink" onPress={() => setDel(p)} />
              </View>
            </Hard>
          )}
        />
      )}
      {form && <ProjectForm project={form.project} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      {del && <Confirm title="Delete project?" message={`"${del.name}" and all its tasks will be removed.`} confirmLabel="Delete project" onClose={() => setDel(null)}
        onConfirm={async () => { await api(`/projects/${del.id}`, { method: 'DELETE' }); setDel(null); reload(); }} />}
    </View>
  );
}
