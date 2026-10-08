import { ReactNode, useState } from 'react';
import { ActivityIndicator, Modal as RNModal, Pressable, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { tokens as t } from '@taskflow/shared';
import { ApiError } from './api';

const c = t.color;
export const f = { pixel: 'PressStart2P_400Regular', mono: 'IBMPlexMono_500Medium', monoB: 'IBMPlexMono_600SemiBold', sans: 'DMSans_400Regular', sansB: 'DMSans_600SemiBold' };

// React Native shadows blur, so the Stockpile hard shadow is an offset ink block behind the box.
export function Hard({ children, bg = c.paper, bw = t.border[2], shadow = t.shadow.sm, radius = t.radius.sm, style, hideShadow }: {
  children: ReactNode; bg?: string; bw?: number; shadow?: number; radius?: number; style?: StyleProp<ViewStyle>; hideShadow?: boolean;
}) {
  return (
    <View style={[{ paddingRight: shadow, paddingBottom: shadow }, style]}>
      {!hideShadow && <View style={{ position: 'absolute', left: shadow, top: shadow, right: 0, bottom: 0, backgroundColor: c.ink, borderRadius: radius }} />}
      <View style={{ backgroundColor: bg, borderWidth: bw, borderColor: c.ink, borderRadius: radius, transform: hideShadow ? [{ translateX: shadow }, { translateY: shadow }] : [] }}>{children}</View>
    </View>
  );
}

export function Button({ label, onPress, tone = 'paper', disabled, small }: { label: string; onPress: () => void; tone?: 'paper' | 'butter' | 'pink'; disabled?: boolean; small?: boolean }) {
  const bg = { paper: c.paper, butter: c.butter, pink: c.pink }[tone];
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}>
      {({ pressed }) => (
        <Hard bg={disabled ? c.sunken : bg} hideShadow={pressed || disabled}>
          <Text style={{ fontFamily: f.monoB, fontSize: small ? 12 : 14, color: disabled ? c.inkMuted : c.ink, paddingVertical: small ? 6 : 10, paddingHorizontal: small ? 10 : 16, textAlign: 'center' }}>{label}</Text>
        </Hard>
      )}
    </Pressable>
  );
}

export const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
    <View style={{ borderWidth: 2, borderColor: c.ink, borderRadius: t.radius.md, backgroundColor: active ? c.lavender : c.paper, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ fontFamily: active ? f.monoB : f.mono, fontSize: 13, color: c.ink }}>{label}</Text>
    </View>
  </Pressable>
);

const TONE: Record<string, string> = { NOT_STARTED: c.lavender, PENDING: c.lavender, IN_PROGRESS: c.sky, COMPLETED: c.mint, HIGH: c.pink, MEDIUM: c.butter, LOW: c.lavender };
export const LABEL: Record<string, string> = { NOT_STARTED: 'Not started', PENDING: 'Pending', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const MARK: Record<string, string> = { COMPLETED: '✓ ', IN_PROGRESS: '▶ ', HIGH: '! ' };
// Word plus a glyph so status is never colour alone.
export const Badge = ({ value }: { value: string }) => (
  <View style={{ alignSelf: 'flex-start', borderWidth: 2, borderColor: c.ink, borderRadius: t.radius.sm, backgroundColor: TONE[value], paddingHorizontal: 8, paddingVertical: 2 }}>
    <Text style={{ fontFamily: f.monoB, fontSize: 11, color: c.onPastel, textTransform: 'uppercase', letterSpacing: 0.4 }}>{MARK[value] ?? ''}{LABEL[value]}</Text>
  </View>
);

export function Field({ label, error, ...rest }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontFamily: f.sansB, fontSize: 13, color: c.ink }}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={c.inkMuted} {...rest}
        style={{ fontFamily: f.sans, fontSize: 15, color: c.ink, backgroundColor: c.paper, borderWidth: 2, borderColor: error ? c.danger : c.ink, borderRadius: t.radius.sm, paddingHorizontal: 12, paddingVertical: 8, minHeight: rest.multiline ? 80 : undefined, textAlignVertical: rest.multiline ? 'top' : 'center' }} />
      {!!error && <Text style={{ fontFamily: f.sans, fontSize: 13, color: c.danger }}>{error}</Text>}
    </View>
  );
}

export const Loader = () => <View style={{ padding: 48 }}><ActivityIndicator size="large" color={c.ink} accessibilityLabel="Loading" /></View>;

export const Empty = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <View style={{ alignItems: 'center', gap: 12, padding: 32 }}>
    <Text style={{ fontFamily: f.pixel, fontSize: 11, color: c.ink, textAlign: 'center', lineHeight: 18 }}>{title}</Text>
    {!!hint && <Text style={{ fontFamily: f.sans, fontSize: 13, color: c.inkMuted, textAlign: 'center' }}>{hint}</Text>}
    {action}
  </View>
);

export const ErrorBox = ({ error, onRetry }: { error: ApiError; onRetry?: () => void }) => (
  <Hard shadow={t.shadow.md} bw={3} radius={0} style={{ margin: 16 }}>
    <View style={{ padding: 16, gap: 12 }} accessibilityRole="alert">
      <Text style={{ fontFamily: f.sansB, fontSize: 14, color: c.danger }}>{error.status === 0 ? 'No connection' : 'Couldn’t load this'}</Text>
      <Text style={{ fontFamily: f.sans, fontSize: 14, color: c.ink }}>{error.message}</Text>
      {onRetry && <Button label="Try again" onPress={onRetry} />}
    </View>
  </Hard>
);

export const Alert = ({ text }: { text: string }) => (
  <View style={{ borderWidth: 2, borderColor: c.ink, backgroundColor: c.pinkSoft, borderRadius: t.radius.md, padding: 12 }} accessibilityRole="alert">
    <Text style={{ fontFamily: f.sansB, fontSize: 14, color: c.danger }}>{text}</Text>
  </View>
);

export const OfflineBanner = () => (
  <View style={{ backgroundColor: c.butter, borderBottomWidth: 3, borderColor: c.ink, padding: 8 }} accessibilityRole="alert">
    <Text style={{ fontFamily: f.mono, fontSize: 12, textAlign: 'center', color: c.ink }}>You're offline. Changes work again once you reconnect.</Text>
  </View>
);

export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  return (
    <RNModal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: 16 }}>
        <Hard shadow={t.shadow.lg} bw={3} radius={0} style={{ maxHeight: '92%' }}>
          <View style={{ backgroundColor: c.lavender, padding: 16, borderBottomWidth: 3, borderColor: c.ink }}>
            <Text style={{ fontFamily: f.pixel, fontSize: 11, color: c.onPastel, lineHeight: 16 }}>{title}</Text>
          </View>
          <View style={{ padding: 16, gap: 12 }}>{children}</View>
          <View style={{ padding: 16, gap: 12, flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', backgroundColor: c.sunken, borderTopWidth: 3, borderColor: c.ink }}>{footer}</View>
        </Hard>
      </View>
    </RNModal>
  );
}

export function Confirm({ title, message, confirmLabel, onConfirm, onClose }: { title: string; message: string; confirmLabel: string; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => { setBusy(true); try { await onConfirm(); } catch (e) { setErr((e as Error).message); setBusy(false); } };
  return (
    <Sheet title={title} onClose={onClose} footer={<><Button label="Keep it" onPress={onClose} /><Button label={busy ? 'Deleting…' : confirmLabel} tone="pink" disabled={busy} onPress={go} /></>}>
      <Text style={{ fontFamily: f.sans, fontSize: 15, color: c.ink }}>{message}</Text>
      {!!err && <Alert text={err} />}
    </Sheet>
  );
}

export function useSubmit(fn: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const submit = async () => { setBusy(true); setError(null); try { await fn(); } catch (e) { setError(e as ApiError); setBusy(false); } };
  return { busy, error, submit, fieldError: (k: string) => error?.details?.[k]?.[0] };
}
