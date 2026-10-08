import { FormEvent, ReactNode, useEffect, useState } from 'react';
import type { ProjectStatus, TaskPriority, TaskStatus } from '@taskflow/shared';
import { ApiError } from '../api';

const PATHS: Record<string, string> = {
  dashboard: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
  folder: 'M3 5h7l2 3h9v11H3z',
  plus: 'M12 5v14M5 12h14',
  search: 'M10 4a6 6 0 100 12 6 6 0 000-12zM15 15l6 6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  logout: 'M9 4H4v16h5M16 8l4 4-4 4M20 12H9',
  check: 'M4 12l5 5L20 6',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 3',
  alert: 'M12 3L2 21h20zM12 10v5M12 18v1',
  back: 'M15 5l-7 7 7 7',
};
export const Icon = ({ name, size = 20 }: { name: keyof typeof PATHS | string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
    <path d={PATHS[name]} />
  </svg>
);

export const BrandMark = () => (
  <span className="brand-mark" aria-hidden="true">
    <svg width="24" height="24" viewBox="0 0 12 12" shapeRendering="crispEdges">
      <rect x="1" y="1" width="10" height="10" fill="#fffdf7" stroke="#17151f" strokeWidth="1" />
      <path d="M3 4h1v1H3zM3 6h1v1H3zM3 8h1v1H3zM5 4h4v1H5zM5 6h4v1H5zM5 8h3v1H5z" fill="#17151f" />
    </svg>
  </span>
);

const STATUS_LABEL: Record<string, string> = { NOT_STARTED: 'Not started', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', PENDING: 'Pending' };
const STATUS_TONE: Record<string, string> = { NOT_STARTED: 'b-lavender', PENDING: 'b-lavender', IN_PROGRESS: 'b-sky', COMPLETED: 'b-mint' };
const STATUS_ICON: Record<string, string> = { NOT_STARTED: 'clock', PENDING: 'clock', IN_PROGRESS: 'edit', COMPLETED: 'check' };
export const statusLabel = (s: string) => STATUS_LABEL[s];

// Status is never colour alone: always an icon plus a word.
export const StatusBadge = ({ status }: { status: ProjectStatus | TaskStatus }) => (
  <span className={`badge ${STATUS_TONE[status]}`}><Icon name={STATUS_ICON[status]} size={14} />{STATUS_LABEL[status]}</span>
);
export const PriorityBadge = ({ priority }: { priority: TaskPriority }) => (
  <span className={`badge ${priority === 'HIGH' ? 'b-pink' : priority === 'MEDIUM' ? 'b-butter' : 'b-lavender'}`}>
    {priority === 'HIGH' && <Icon name="alert" size={14} />}{priority}
  </span>
);

export const Loader = ({ label = 'Counting tasks…' }: { label?: string }) => (
  <div className="loader" role="status" aria-label={label}><i /><i /><i /></div>
);

export const Empty = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="empty"><div className="pixel">{title}</div>{hint && <p className="hint">{hint}</p>}{action}</div>
);

export const ErrorPanel = ({ error, onRetry }: { error: ApiError; onRetry?: () => void }) => (
  <div className="panel"><div className="panel-body alert-panel" role="alert">
    <div className="alert">{error.status === 0 ? 'No connection' : 'Couldn’t load this'}</div>
    <p>{error.message}</p>
    {onRetry && <button className="btn" onClick={onRetry}>Try again</button>}
  </div></div>
);

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className={`field${error ? ' invalid' : ''}`}>
      <label>{label}{children}</label>
      {error ? <span className="field-error" role="alert">{error}</span> : hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head on-pastel">{title}</div>
        {children}
        <div className="modal-foot">{footer}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, confirmLabel, onConfirm, onClose }: {
  title: string; message: string; confirmLabel: string; onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true);
    try { await onConfirm(); } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose} autoFocus>Keep it</button>
      <button className="btn danger" onClick={go} disabled={busy}>{busy ? 'Deleting…' : confirmLabel}</button>
    </>}>
      <div className="modal-body"><p>{message}</p>{err && <div className="alert" role="alert">{err}</div>}</div>
    </Modal>
  );
}

// Shared form plumbing: submit handler with busy state and server field errors.
export function useForm<T>(submit: () => Promise<T>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const onSubmit = async (e?: FormEvent) => {
    e?.preventDefault(); setBusy(true); setError(null);
    try { await submit(); } catch (err) { setError(err as ApiError); setBusy(false); }
  };
  return { busy, error, onSubmit, fieldError: (k: string) => error?.details?.[k]?.[0] };
}

export const Toast = ({ message }: { message: string }) => <div className="toast" role="status">{message}</div>;
