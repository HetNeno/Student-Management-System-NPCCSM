import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, DASHBOARD_BY_ROLE } from '../context/AuthContext';
import BrandLogo from '../components/shared/BrandLogo';

const SEMESTERS = [1, 2, 3, 4, 5, 6];

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

const inputClass = (hasError) =>
  `w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:bg-white focus:ring-4 ${
    hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-[#D48080] focus:ring-[#B24848]/10'
  }`;

/**
 * Public self-registration. Students only: the form has no role field and
 * the server assigns the student role regardless of what is sent.
 */
export default function SignupPage() {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    semester: '',
    password: '',
    password_confirmation: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) navigate(DASHBOARD_BY_ROLE[user.role] || '/', { replace: true });
  }, [user, navigate]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.semester) next.semester = 'Select your current semester.';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      next.password = 'Use at least 8 characters with letters and numbers.';
    }
    if (form.password !== form.password_confirmation) next.password_confirmation = 'The passwords do not match.';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const clientErrors = validate();
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    const result = await register({ ...form, semester: Number(form.semester), department: 'BCA' });
    setSubmitting(false);

    if (!result.success) {
      const fieldErrors = Object.fromEntries(Object.entries(result.fieldErrors || {}).map(([k, v]) => [k, v[0]]));
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setFormError(result.error);
      return;
    }
    try {
      localStorage.setItem('npccsm_student_active_sem', String(result.user.semester || form.semester));
    } catch {
      /* storage unavailable: semester picker falls back to its default */
    }
    navigate(result.redirect || '/student', { replace: true });
  };

  const describedBy = (key) => (errors[key] ? `su-${key}-error` : undefined);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#FFF8F7] via-white to-[#FFF0EF] px-4 py-10">
      <div className="mx-auto w-full max-w-lg page-enter">
        <Link to="/" className="mx-auto mb-8 flex justify-center" aria-label="NPCCSM portal home">
          <BrandLogo className="h-12 sm:h-14" framed />
        </Link>

        <div className="rounded-3xl border border-[#B24848]/15 bg-white p-7 shadow-[0_20px_40px_-12px_rgba(165,42,42,0.15)] sm:p-9">
          <div className="mb-7">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#A52A2A] to-[#B24848] text-white shadow-md">
              <i className="fas fa-user-graduate text-lg" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Create your student account</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              For NPCCSM BCA students. Teacher and principal accounts are created by the principal.
            </p>
          </div>

          {formError && (
            <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <i className="fas fa-exclamation-circle mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field id="su-name" label="Full name" error={errors.name}>
              <input id="su-name" autoComplete="name" value={form.name} onChange={set('name')} className={inputClass(errors.name)} aria-invalid={!!errors.name} aria-describedby={describedBy('name')} placeholder="e.g. Asha Patel" />
            </Field>

            <Field id="su-email" label="Email address" error={errors.email} hint="You will sign in with this email.">
              <input id="su-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className={inputClass(errors.email)} aria-invalid={!!errors.email} aria-describedby={describedBy('email')} placeholder="you@example.com" />
            </Field>

            <Field id="su-semester" label="Current semester" error={errors.semester}>
              <select id="su-semester" value={form.semester} onChange={set('semester')} className={inputClass(errors.semester)} aria-invalid={!!errors.semester} aria-describedby={describedBy('semester')}>
                <option value="">Select semester</option>
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>BCA Semester {s}</option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="su-password" label="Password" error={errors.password}>
                <input id="su-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={set('password')} className={inputClass(errors.password)} aria-invalid={!!errors.password} aria-describedby={describedBy('password')} />
              </Field>
              <Field id="su-password_confirmation" label="Confirm password" error={errors.password_confirmation}>
                <input id="su-password_confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} className={inputClass(errors.password_confirmation)} aria-invalid={!!errors.password_confirmation} aria-describedby={describedBy('password_confirmation')} />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 select-none">
              <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="h-4 w-4 accent-[#A52A2A]" />
              Show passwords · at least 8 characters with letters and numbers
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="btn-press w-full rounded-xl bg-gradient-to-br from-[#A52A2A] to-[#B24848] py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:-translate-y-px hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Creating account…
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link to="/login?role=student" className="font-bold text-[#A52A2A] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
