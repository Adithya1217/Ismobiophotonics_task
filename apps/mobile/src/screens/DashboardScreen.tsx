import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { DashboardStats, tokens as t } from '@taskflow/shared';
import { api } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../hooks';
import { ErrorBox, Hard, Loader, f } from '../ui';

const TILES: [string, keyof DashboardStats, string][] = [
  ['Projects', 'totalProjects', t.color.butter], ['Tasks', 'totalTasks', t.color.lavender], ['Completed', 'completedTasks', t.color.mint],
  ['Pending', 'pendingTasks', t.color.pink], ['Active projects', 'inProgressProjects', t.color.sky],
];

export default function DashboardScreen() {
  const { user } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => api<DashboardStats>('/dashboard'), []);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={{ fontFamily: f.pixel, fontSize: 18, color: t.color.ink }}>Dashboard</Text>
      <Text style={{ fontFamily: f.sans, fontSize: 15, color: t.color.ink }}>Hi {user?.name}. Pull down to refresh.</Text>
      {loading && !data ? <Loader /> : error && !data ? <ErrorBox error={error} onRetry={reload} /> : data && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {TILES.map(([label, key, bg]) => (
            <Hard key={key} bg={bg} bw={3} radius={0} shadow={t.shadow.md} style={{ width: '47%', flexGrow: 1 }}>
              <View style={{ padding: 16, gap: 10 }} accessible accessibilityLabel={`${label}: ${data[key]}`}>
                <Text style={{ fontFamily: f.pixel, fontSize: 8, color: t.color.onPastel, textTransform: 'uppercase' }}>{label}</Text>
                <Text style={{ fontFamily: f.pixel, fontSize: 24, color: t.color.onPastel }}>{data[key]}</Text>
              </View>
            </Hard>
          ))}
        </View>
      )}
      {!!error && !!data && <ErrorBox error={error} onRetry={reload} />}
    </ScrollView>
  );
}
