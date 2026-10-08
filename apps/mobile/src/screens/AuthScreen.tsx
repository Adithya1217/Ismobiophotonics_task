import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { loginSchema, registerSchema, tokens as t } from '@taskflow/shared';
import { useAuth } from '../auth';
import { Alert, Button, Field, Hard, f, useSubmit } from '../ui';

export default function AuthScreen() {
  const { signIn, notice } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [v, setV] = useState({ name: '', email: '', password: '' });
  const [local, setLocal] = useState<Record<string, string[]>>({});
  const { busy, error, submit, fieldError } = useSubmit(async () => {
    const parsed = (mode === 'login' ? loginSchema : registerSchema).safeParse(v);
    if (!parsed.success) { setLocal(parsed.error.flatten().fieldErrors as Record<string, string[]>); throw Object.assign(new Error(''), {}); }
    setLocal({});
    await signIn(mode, parsed.data);
  });
  const fe = (k: string) => local[k]?.[0] ?? fieldError(k);
  const set = (k: string) => (s: string) => setV({ ...v, [k]: s });
  const login = mode === 'login';
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontFamily: f.pixel, fontSize: 18, color: t.color.ink, marginBottom: 20 }}>TASKFLOW</Text>
        <Hard shadow={t.shadow.md} bw={3} radius={0}>
          <View style={{ backgroundColor: t.color.sunken, padding: 16, borderBottomWidth: 3, borderColor: t.color.ink }}>
            <Text style={{ fontFamily: f.pixel, fontSize: 11, color: t.color.ink }}>{login ? 'Log in' : 'Create account'}</Text>
          </View>
          <View style={{ padding: 20, gap: 14 }}>
            {!!notice && login && <Alert text={notice} />}
            {!!error?.message && <Alert text={error.message} />}
            {!login && <Field label="Name" value={v.name} onChangeText={set('name')} error={fe('name')} autoComplete="name" />}
            <Field label="Email" value={v.email} onChangeText={set('email')} error={fe('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Field label="Password" value={v.password} onChangeText={set('password')} error={fe('password')} secureTextEntry autoCapitalize="none" />
            <Button label={busy ? 'One moment…' : login ? 'Log in' : 'Create account'} tone="butter" onPress={submit} disabled={busy} />
            <Button label={login ? 'New here? Create an account' : 'Have an account? Log in'} small onPress={() => { setMode(login ? 'register' : 'login'); setLocal({}); }} />
          </View>
        </Hard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
