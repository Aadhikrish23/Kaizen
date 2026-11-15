import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import {
  AdminFood, useAdminFoods, useAdminStats, useAdminUsers, useDeleteAdminFood, useSaveAdminFood, useUpdateAdminUser,
} from '../../services/adminService';

type AdminTab = 'stats' | 'users' | 'foods';

const Stats: React.FC = () => {
  const { data, isLoading } = useAdminStats();
  if (isLoading || !data) return <LoadingState message="Loading stats..." />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-control border border-kaizen-border bg-kaizen-bg"><p className="text-[10px] font-mono uppercase text-kaizen-subtle">Users</p><p className="text-2xl font-mono text-kaizen-text">{data.users.total}</p></div>
        <div className="p-3 rounded-control border border-kaizen-border bg-kaizen-bg"><p className="text-[10px] font-mono uppercase text-kaizen-subtle">Active (7 days)</p><p className="text-2xl font-mono text-kaizen-text">{data.users.active7d}</p></div>
      </div>
      <table className="w-full text-xs font-mono text-left">
        <thead><tr className="text-kaizen-subtle"><th className="py-1">Log type</th><th>Total</th><th>Last 7 days</th></tr></thead>
        <tbody>
          {Object.entries(data.logs).map(([k, v]) => (
            <tr key={k} className="border-t border-kaizen-border/40"><td className="py-1 capitalize">{k}</td><td>{v.total}</td><td>{v.last7d}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Users: React.FC<{ selfId?: string }> = ({ selfId }) => {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading } = useAdminUsers(page, q);
  const { mutateAsync: update, isPending, error } = useUpdateAdminUser();
  const [message, setMessage] = useState<string | null>(null);
  const act = async (id: string, patch: { role?: 'user' | 'admin'; isActive?: boolean }) => {
    setMessage(null);
    try { await update({ id, ...patch }); } catch (e: any) { setMessage(e?.message || 'Update failed'); }
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search email or name" aria-label="Search users"
        className="w-full max-w-sm bg-kaizen-bg border border-kaizen-border rounded-control px-3 py-2 text-sm text-kaizen-text" />
      {message && <p className="text-xs font-mono text-rose-300">{message}</p>}
      {isLoading || !data ? <LoadingState message="Loading users..." /> : (
        <table className="w-full text-xs font-mono text-left">
          <thead><tr className="text-kaizen-subtle"><th className="py-1">Email</th><th>Name</th><th>Role</th><th>Status</th><th /></tr></thead>
          <tbody>
            {(data.users || []).map((u) => (
              <tr key={u.id} className="border-t border-kaizen-border/40">
                <td className="py-1.5">{u.email}</td><td>{u.name}</td><td>{u.role}</td><td>{u.isActive ? 'active' : 'deactivated'}</td>
                <td className="space-x-2 text-right">
                  {u.id !== selfId && (
                    <>
                      <Button size="sm" variant="secondary" disabled={isPending} onClick={() => act(u.id, { role: u.role === 'admin' ? 'user' : 'admin' })}>
                        {u.role === 'admin' ? 'Make user' : 'Make admin'}
                      </Button>
                      <Button size="sm" variant={u.isActive ? 'danger' : 'secondary'} disabled={isPending} onClick={() => act(u.id, { isActive: !u.isActive })}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex items-center gap-2 text-xs font-mono text-kaizen-muted">
        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
        <span>Page {page} of {pages}{data ? ` (${data.total} users)` : ''}</span>
        <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
      {error && !message && <p className="text-xs font-mono text-rose-300">Update failed</p>}
    </div>
  );
};

const blank = { name: '', brand: '', servingSize: '100 g', calories: '', protein: '', carbs: '', fat: '' };

const Foods: React.FC = () => {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading } = useAdminFoods(page, q);
  const { mutateAsync: save, isPending } = useSaveAdminFood();
  const { mutateAsync: remove } = useDeleteAdminFood();
  const [form, setForm] = useState({ ...blank });
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const num = (v: string) => (v === '' ? 0 : Number(v));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const food: Omit<AdminFood, 'id'> = {
        name: form.name, servingSize: form.servingSize, calories: num(form.calories), protein: num(form.protein), carbs: num(form.carbs), fat: num(form.fat),
        ...(form.brand ? { brand: form.brand } : {}),
      };
      await save({ id: editing ?? undefined, food });
      setForm({ ...blank });
      setEditing(null);
    } catch (err: any) {
      setMessage(err?.message || 'Save failed');
    }
  };
  const edit = (f: AdminFood) => {
    setEditing(f.id);
    setForm({ name: f.name, brand: f.brand ?? '', servingSize: f.servingSize, calories: String(f.calories), protein: String(f.protein), carbs: String(f.carbs), fat: String(f.fat) });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-control border border-kaizen-border bg-kaizen-bg">
        {(['name', 'brand', 'servingSize', 'calories', 'protein', 'carbs', 'fat'] as const).map((k) => (
          <input key={k} aria-label={k} placeholder={k} value={form[k]} required={k === 'name' || k === 'servingSize' || k === 'calories'}
            type={['calories', 'protein', 'carbs', 'fat'].includes(k) ? 'number' : 'text'} min="0" step="any"
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            className="bg-kaizen-surface border border-kaizen-border rounded-control px-2 py-1 text-xs text-kaizen-text" />
        ))}
        <div className="flex gap-2 col-span-2">
          <Button type="submit" size="sm" variant="primary" disabled={isPending}>{editing ? 'Save food' : 'Add global food'}</Button>
          {editing && <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(null); setForm({ ...blank }); }}>Cancel</Button>}
        </div>
      </form>
      {message && <p className="text-xs font-mono text-rose-300">{message}</p>}
      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search foods" aria-label="Search foods"
        className="w-full max-w-sm bg-kaizen-bg border border-kaizen-border rounded-control px-3 py-2 text-sm text-kaizen-text" />
      {isLoading || !data ? <LoadingState message="Loading foods..." /> : (
        <table className="w-full text-xs font-mono text-left">
          <thead><tr className="text-kaizen-subtle"><th className="py-1">Name</th><th>Serving</th><th>kcal</th><th>P</th><th>C</th><th>F</th><th /></tr></thead>
          <tbody>
            {(data.foods || []).map((f) => (
              <tr key={f.id} className="border-t border-kaizen-border/40">
                <td className="py-1.5">{f.name}{f.brand ? ` (${f.brand})` : ''}</td><td>{f.servingSize}</td><td>{f.calories}</td><td>{f.protein}</td><td>{f.carbs}</td><td>{f.fat}</td>
                <td className="space-x-2 text-right">
                  <Button size="sm" variant="secondary" onClick={() => edit(f)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(f.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex items-center gap-2 text-xs font-mono text-kaizen-muted">
        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
        <span>Page {page} of {pages}{data ? ` (${data.total} foods)` : ''}</span>
        <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
      <p className="text-[11px] text-kaizen-subtle">Only global foods are listed here; users' custom foods are never shown or editable.</p>
    </div>
  );
};

// Visible only to admins (the server enforces the role on every /admin route as well).
export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<AdminTab>('stats');
  if (user?.role !== 'admin') return null;
  const tabs: AdminTab[] = ['stats', 'users', 'foods'];
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="pb-4 border-b border-kaizen-border flex items-center justify-between">
        <h2 className="text-xl font-display font-extrabold tracking-tight text-white">Admin</h2>
        <div className="flex bg-kaizen-surface p-1 rounded-control border border-kaizen-border" role="tablist">
          {tabs.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-control capitalize ${tab === t ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-kaizen-muted'}`}>{t}</button>
          ))}
        </div>
      </div>
      <Card title={tab === 'stats' ? 'Usage' : tab === 'users' ? 'Users' : 'Global foods'}>
        {tab === 'stats' && <Stats />}
        {tab === 'users' && <Users selfId={user?.id} />}
        {tab === 'foods' && <Foods />}
      </Card>
    </div>
  );
};
