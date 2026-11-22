import { useCallback, useEffect, useState } from 'react';
import { createTeacher, getUsers, setUserSemester, setUserStatus } from '../../lib/apiClient';

const input = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-[#8B2635]/40 focus:bg-white focus:ring-4 focus:ring-[#8B2635]/10';

/**
 * Principal-only. The authorised path for creating teacher accounts;
 * public signup can only ever create students.
 */
export default function AccountsPanel() {
  const [role, setRole] = useState('teacher');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getUsers(role);
      setUsers(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});
    try {
      const res = await createTeacher(form);
      setNotice(`Teacher account created for ${res.data.email}. Share the password with them securely.`);
      setForm({ name: '', email: '', password: '' });
      setShowForm(false);
      if (role === 'teacher') load();
    } catch (err) {
      const fe = Object.fromEntries(Object.entries(err.errors || {}).map(([k, v]) => [k, v[0]]));
      setFormErrors(Object.keys(fe).length ? fe : { _: err.message });
    } finally {
      setSaving(false);
    }
  };

  const changeSemester = async (u, semester) => {
    if (!window.confirm(`Move ${u.name} to Semester ${semester}? They will only see Semester ${semester} content.`)) return;
    try {
      await setUserSemester(u.id, semester);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, semester } : x)));
      setNotice(`${u.name} moved to Semester ${semester}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggle = async (u) => {
    const next = u.status === 'active' ? 'disabled' : 'active';
    if (next === 'disabled' && !window.confirm(`Disable ${u.name}? They will be signed out and unable to log in.`)) return;
    try {
      await setUserStatus(u.id, next);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section aria-labelledby="accounts-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="accounts-heading" className="text-base font-black text-slate-900">Accounts</h2>
          <p className="text-xs text-slate-500">Create teacher accounts and manage access.</p>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Account type" className="flex rounded-lg border border-slate-200 p-0.5">
            {['teacher', 'student'].map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={role === r}
                onClick={() => setRole(r)}
                className={`rounded-md px-3 py-1 text-xs font-bold capitalize transition-colors ${role === r ? 'bg-[#8B2635] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {r}s
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowForm((v) => !v)} className="btn-press rounded-lg bg-[#8B2635] px-3 py-1.5 text-xs font-bold text-white">
            <i className="fa-solid fa-user-plus mr-1.5" />Add teacher
          </button>
        </div>
      </div>

      {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>}

      {showForm && (
        <form onSubmit={submit} className="anim-slide-down mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-4">
          {formErrors._ && <p role="alert" className="text-xs text-rose-600 md:col-span-4">{formErrors._}</p>}
          <div>
            <label htmlFor="t-name" className="mb-1 block text-[11px] font-bold text-slate-500">Full name</label>
            <input id="t-name" className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            {formErrors.name && <p className="mt-1 text-[11px] text-rose-600">{formErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="t-email" className="mb-1 block text-[11px] font-bold text-slate-500">Email</label>
            <input id="t-email" type="email" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            {formErrors.email && <p className="mt-1 text-[11px] text-rose-600">{formErrors.email}</p>}
          </div>
          <div>
            <label htmlFor="t-pass" className="mb-1 block text-[11px] font-bold text-slate-500">Initial password</label>
            <input id="t-pass" type="text" autoComplete="new-password" className={input} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            {formErrors.password && <p className="mt-1 text-[11px] text-rose-600">{formErrors.password}</p>}
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={saving} className="btn-press w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              {saving ? 'Creating…' : 'Create teacher'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              {role === 'student' && <th className="px-3 py-2">Sem</th>}
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-rose-600" role="alert">{error}</td></tr>
            ) : !users.length ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No {role} accounts yet.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-3 py-2 font-bold text-slate-800">{u.name}</td>
                  <td className="px-3 py-2 text-slate-600">{u.email}</td>
                  {role === 'student' && (
                    <td className="px-3 py-2">
                      <select
                        value={u.semester ?? ''}
                        onChange={(e) => changeSemester(u, Number(e.target.value))}
                        aria-label={`Semester for ${u.name}`}
                        className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-700"
                      >
                        {[1, 2, 3, 4, 5, 6].map((s) => <option key={s} value={s}>Sem {s}</option>)}
                      </select>
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{u.status}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => toggle(u)} className="text-xs font-bold text-slate-600 hover:text-[#8B2635]">
                      {u.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
