import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginSchema, registerSchema, User } from '@taskflow/shared';
import { api } from '../api';
import { useAuth } from '../auth';
import { BrandMark, Field, useForm } from '../components/ui';

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login';
  const { setUser, expired } = useAuth();
  const nav = useNavigate();
  const [v, setV] = useState({ name: '', email: '', password: '' });
  const [local, setLocal] = useState<Record<string, string[]>>({});
  const { busy, error, onSubmit, fieldError } = useForm(async () => {
    const parsed = (isLogin ? loginSchema : registerSchema).safeParse(v);
    if (!parsed.success) { setLocal(parsed.error.flatten().fieldErrors as Record<string, string[]>); throw Object.assign(new Error(), { details: undefined }); }
    setLocal({});
    const r = await api<{ user: User }>(`/auth/${mode}`, { method: 'POST', body: parsed.data });
    setUser(r.user); nav('/');
  });
  const fe = (k: string) => local[k]?.[0] ?? fieldError(k);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <div className="auth"><div className="panel">
      <div className="panel-head"><BrandMark /><h2>{isLogin ? 'Log in' : 'Create account'}</h2></div>
      <div className="panel-body"><form onSubmit={onSubmit} noValidate>
        {expired && isLogin && <div className="alert" role="alert">Your session expired. Please log in again.</div>}
        {error && error.message && <div className="alert" role="alert">{error.message}</div>}
        {!isLogin && <Field label="Name" error={fe('name')}><input className="input" value={v.name} onChange={set('name')} autoComplete="name" /></Field>}
        <Field label="Email" error={fe('email')}><input className="input" type="email" value={v.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label="Password" error={fe('password')} hint={isLogin ? undefined : 'At least 8 characters'}>
          <input className="input" type="password" value={v.password} onChange={set('password')} autoComplete={isLogin ? 'current-password' : 'new-password'} />
        </Field>
        <button className="btn primary" disabled={busy}>{busy ? 'One moment…' : isLogin ? 'Log in' : 'Create account'}</button>
        <p className="hint">{isLogin ? <>New here? <Link to="/register">Create an account</Link></> : <>Already registered? <Link to="/login">Log in</Link></>}</p>
      </form></div>
    </div></div>
  );
}
