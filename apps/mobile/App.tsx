import { useEffect, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useFonts } from 'expo-font';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { DMSans_400Regular, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { tokens as t } from '@taskflow/shared';
import { AuthProvider, useAuth } from './src/auth';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProjectDetailsScreen from './src/screens/ProjectDetailsScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import { Loader, OfflineBanner, f } from './src/ui';

type Route = { name: 'dashboard' } | { name: 'projects' } | { name: 'project'; id: string };

function Shell() {
  const { user, ready, logout } = useAuth();
  const [route, setRoute] = useState<Route>({ name: 'dashboard' });
  const [online, setOnline] = useState(true);

  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)), []);
  // Android hardware back: details -> projects -> dashboard.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route.name === 'project') { setRoute({ name: 'projects' }); return true; }
      if (route.name === 'projects') { setRoute({ name: 'dashboard' }); return true; }
      return false;
    });
    return () => sub.remove();
  }, [route]);
  useEffect(() => { if (!user) setRoute({ name: 'dashboard' }); }, [user]);

  if (!ready) return <Loader />;
  if (!user) return <AuthScreen />;

  const tab = (name: 'dashboard' | 'projects', label: string) => {
    const active = route.name === name || (name === 'projects' && route.name === 'project');
    return (
      <Pressable key={name} onPress={() => setRoute(name === 'dashboard' ? { name: 'dashboard' } : { name: 'projects' })} accessibilityRole="tab" accessibilityState={{ selected: active }}
        style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: active ? t.color.butter : t.color.paper }}>
        <Text style={{ fontFamily: active ? f.monoB : f.mono, fontSize: 13, color: t.color.ink }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {!online && <OfflineBanner />}
      <View style={{ flex: 1 }}>
        {route.name === 'dashboard' && <DashboardScreen />}
        {route.name === 'projects' && <ProjectsScreen open={(id) => setRoute({ name: 'project', id })} />}
        {route.name === 'project' && <ProjectDetailsScreen id={route.id} back={() => setRoute({ name: 'projects' })} />}
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: 3, borderColor: t.color.ink }}>
        {tab('dashboard', 'Dashboard')}
        {tab('projects', 'Projects')}
        <Pressable onPress={logout} accessibilityRole="button" accessibilityLabel="Log out" style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: t.color.paper }}>
          <Text style={{ fontFamily: f.mono, fontSize: 13, color: t.color.ink }}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({ PressStart2P_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold, DMSans_400Regular, DMSans_600SemiBold });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.color.cream }}>
        <StatusBar style="dark" />
        <AuthProvider><Shell /></AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
