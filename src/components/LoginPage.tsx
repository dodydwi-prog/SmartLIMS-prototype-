import { FormEvent, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  ArrowLeft,
  Building2,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { DEMO_USERS, resolveIdentifierToEmail } from '../data/limsMockDatabase';
import {
  INDUSTRY_SECTORS,
  PORTAL_ROLES,
  PortalRoleId,
} from '../data/limsPreviewData';
import { auth, googleAuthProvider } from '../lib/firebase';
import { DemoUser } from '../types/lims';

interface LoginPageProps {
  initialRole?: PortalRoleId;
  onBackToLanding: () => void;
  onAuthStart?: () => void;
  onAuthAbort?: () => void;
  onFirebaseAuthSuccess: (
    firebaseUser: User,
    desiredRole: PortalRoleId,
    corporateOverride?: Partial<DemoUser>
  ) => Promise<void>;
}

type AuthTab = 'login' | 'register';

function mapFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  const msg = err instanceof Error ? err.message : String(err);

  if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
    return 'Metode login Email/Password belum diaktifkan di Firebase Console (Authentication > Sign-in method > Email/Password) untuk proyek caramel-quiz-r41j7.';
  }
  if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
    return 'Jendela masuk Google ditutup sebelum selesai. Silakan coba lagi.';
  }
  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return 'Popup browser diblokir. Izinkan popup untuk situs ini agar dapat masuk dengan Google.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Username/email atau kata sandi tidak sesuai. Periksa kembali kredensial Anda.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Email perusahaan ini sudah terdaftar. Silakan masuk menggunakan tab Masuk Akun.';
  }
  if (code === 'auth/weak-password') {
    return 'Kata sandi minimal terdiri dari 6 karakter.';
  }
  if (code === 'auth/invalid-email') {
    return 'Format email atau username tidak valid.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Terlalu banyak percobaan login. Silakan tunggu beberapa saat sebelum mencoba lagi.';
  }
  return msg || 'Terjadi kesalahan saat autentikasi.';
}

export function LoginPage({
  initialRole = 'customer',
  onBackToLanding,
  onAuthStart,
  onAuthAbort,
  onFirebaseAuthSuccess,
}: LoginPageProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<PortalRoleId>(initialRole);
  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Login credentials (Email / Username + Password)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Corporate registration fields (Customer only)
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [nibNumber, setNibNumber] = useState('');
  const [sectorId, setSectorId] = useState(INDUSTRY_SECTORS[0].id);
  const [picName, setPicName] = useState('');
  const [picPhone, setPicPhone] = useState('');
  const [siteAddress, setSiteAddress] = useState('');

  const activeRole =
    PORTAL_ROLES.find((r) => r.id === selectedRoleId) ?? PORTAL_ROLES[0];
  const activeSector =
    INDUSTRY_SECTORS.find((s) => s.id === sectorId) ?? INDUSTRY_SECTORS[0];
  const isCustomerRole = selectedRoleId === 'customer';

  const handleRoleSwitch = (roleId: PortalRoleId) => {
    setSelectedRoleId(roleId);
    setAuthError(null);
    setAuthNotice(null);
    if (roleId !== 'customer' && authTab === 'register') {
      setAuthTab('login');
    }
  };

  const handleCredentialLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setAuthError('Masukkan username atau email terdaftar Anda.');
      return;
    }
    if (!password) {
      setAuthError('Masukkan kata sandi akun Anda.');
      return;
    }

    const resolvedEmail = resolveIdentifierToEmail(cleanIdentifier);
    const matchedSeed = DEMO_USERS.find(
      (u) =>
        u.email.toLowerCase() === resolvedEmail ||
        u.username?.toLowerCase() === cleanIdentifier.toLowerCase()
    );

    if (matchedSeed) {
      if (isCustomerRole && matchedSeed.roleId !== 'customer') {
        setAuthError(
          'Akun ini adalah akun internal laboratorium. Pilih peran Admin, Manajer Teknis, atau Kepala Balai di panel kiri.'
        );
        return;
      }
      if (!isCustomerRole && matchedSeed.roleId === 'customer') {
        setAuthError(
          'Akun pelanggan tidak memiliki akses ke portal internal laboratorium.'
        );
        return;
      }
    }

    onAuthStart?.();
    setIsAuthenticating(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, resolvedEmail, password);
      const effectiveRole = matchedSeed?.roleId ?? selectedRoleId;
      await onFirebaseAuthSuccess(credential.user, effectiveRole);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';

      // Auto-provision seeded database user in Firebase Auth on very first login if password matches seed
      if (
        (code === 'auth/user-not-found' || code === 'auth/invalid-credential') &&
        matchedSeed &&
        password === matchedSeed.password
      ) {
        try {
          const created = await createUserWithEmailAndPassword(
            auth,
            matchedSeed.email,
            matchedSeed.password
          );
          await updateProfile(created.user, { displayName: matchedSeed.name });
          try {
            await sendEmailVerification(created.user);
          } catch {
            // Non-blocking if email verification delivery is unavailable for internal domains
          }
          await onFirebaseAuthSuccess(created.user, matchedSeed.roleId, matchedSeed);
          return;
        } catch (provisionErr) {
          onAuthAbort?.();
          setAuthError(mapFirebaseAuthError(provisionErr));
          setIsAuthenticating(false);
          return;
        }
      }

      onAuthAbort?.();
      setAuthError(mapFirebaseAuthError(err));
      setIsAuthenticating(false);
    }
  };

  const handlePasswordReset = async () => {
    setAuthError(null);
    setAuthNotice(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setAuthError('Masukkan username atau email terlebih dahulu untuk mengatur ulang kata sandi.');
      return;
    }

    const resolvedEmail = resolveIdentifierToEmail(cleanIdentifier);
    setIsAuthenticating(true);
    try {
      await sendPasswordResetEmail(auth, resolvedEmail);
      setAuthNotice(`Tautan reset kata sandi telah dikirim ke ${resolvedEmail}.`);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const executeGoogleCustomerSignIn = async (corporateOverride?: Partial<DemoUser>) => {
    if (!isCustomerRole && !corporateOverride) return;
    setAuthError(null);
    setAuthNotice(null);
    onAuthStart?.();
    setIsAuthenticating(true);
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      await onFirebaseAuthSuccess(credential.user, 'customer', corporateOverride);
    } catch (err) {
      onAuthAbort?.();
      setAuthError(mapFirebaseAuthError(err));
      setIsAuthenticating(false);
    }
  };

  const validateCorporateProfile = (): Partial<DemoUser> | null => {
    if (companyName.trim().length < 3) {
      setAuthError('Nama perusahaan atau badan usaha minimal 3 karakter.');
      return null;
    }
    const digitsOnly = nibNumber.replace(/\D/g, '');
    if (digitsOnly.length < 13) {
      setAuthError('Nomor NIB / NPWP minimal terdiri dari 13 digit angka.');
      return null;
    }
    if (picName.trim().length < 2) {
      setAuthError('Masukkan nama lengkap penanggung jawab HSE.');
      return null;
    }
    const cleanUsername = regUsername.trim().toLowerCase();
    if (cleanUsername && cleanUsername.length < 3) {
      setAuthError('Username minimal terdiri dari 3 karakter.');
      return null;
    }
    return {
      username: cleanUsername || undefined,
      companyName: companyName.trim(),
      nibOrNip: nibNumber.trim(),
      sectorId,
      name: picName.trim(),
      phone: picPhone.trim() || '0812-0000-0000',
      address: siteAddress.trim() || 'Alamat operasional perusahaan terdaftar',
    };
  };

  const handleRegisterWithEmail = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);

    const profilePatch = validateCorporateProfile();
    if (!profilePatch) return;

    if (!regEmail.trim() || !regEmail.includes('@')) {
      setAuthError('Masukkan alamat email perusahaan yang valid.');
      return;
    }
    if (regPassword.length < 6) {
      setAuthError('Kata sandi minimal terdiri dari 6 karakter.');
      return;
    }

    onAuthStart?.();
    setIsAuthenticating(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        regEmail.trim().toLowerCase(),
        regPassword
      );
      await updateProfile(cred.user, { displayName: picName.trim() });
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // Non-blocking courtesy verification email
      }
      await onFirebaseAuthSuccess(cred.user, 'customer', {
        ...profilePatch,
        email: regEmail.trim().toLowerCase(),
      });
    } catch (err) {
      onAuthAbort?.();
      setAuthError(mapFirebaseAuthError(err));
      setIsAuthenticating(false);
    }
  };

  const handleRegisterWithGoogle = async () => {
    setAuthError(null);
    setAuthNotice(null);
    const profilePatch = validateCorporateProfile();
    if (!profilePatch) return;
    await executeGoogleCustomerSignIn(profilePatch);
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-12">
      {/* LEFT PANEL: Deep Slate Navy Context & Role Authority */}
      <aside className="flex flex-col justify-between bg-slate-900 px-6 py-8 text-slate-100 sm:px-10 lg:col-span-5 lg:px-12 lg:py-10">
        <div>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBackToLanding}
              className="font-display text-lg font-bold tracking-tight text-white hover:text-cyan-300 transition-colors cursor-pointer"
            >
              SmartLIMS
            </button>
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Kembali ke Beranda</span>
            </button>
          </div>

          <div className="mt-10 lg:mt-14">
            <p className="font-mono text-xs text-cyan-400">
              Firebase Auth &amp; Cloud Firestore · ISO/IEC 17025
            </p>
            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl text-balance">
              Masuk ke Layanan Permohonan Sampling &amp; LIMS Terintegrasi
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Seluruh permohonan, kuota tim lapangan, kaji ulang ISO 17025, dan audit log disimpan
              secara real-time di database terenkripsi.
            </p>
          </div>

          {/* Role Selector */}
          <div className="mt-8">
            <p className="text-xs font-medium text-slate-400">Pilih Portal Masuk</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {PORTAL_ROLES.map((role) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleSwitch(role.id)}
                    className={`min-h-[42px] rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/15 text-white'
                        : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="block truncate font-semibold">{role.shortTitle}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                      {role.category === 'external' ? 'Eksternal' : 'Internal Lab'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Role Privileges */}
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="font-mono text-[11px] text-emerald-400">{activeRole.outputBadge}</p>
            <h2 className="mt-1 font-display text-base font-semibold text-white">
              {activeRole.label}
            </h2>
            <ul className="mt-3.5 space-y-2.5">
              {activeRole.capabilities.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-2.5 border-t border-slate-800 pt-5 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          <span>Enkripsi TLS 1.3 · Aturan Keamanan Firestore Tervalidasi</span>
        </div>
      </aside>

      {/* RIGHT PANEL: Production Role-Specific Auth */}
      <main className="flex flex-col justify-center bg-white px-5 py-10 sm:px-10 lg:col-span-7 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              {!isCustomerRole
                ? `Masuk ${activeRole.shortTitle}`
                : authTab === 'login'
                  ? 'Masuk Portal Pelanggan'
                  : 'Registrasi Badan Usaha'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {!isCustomerRole
                ? `Autentikasi kredensial internal untuk ${activeRole.label}`
                : authTab === 'login'
                  ? 'Masuk dengan Email / Username perusahaan atau akun Google Anda'
                  : 'Daftarkan profil badan usaha dengan Email atau akun Google'}
            </p>
          </div>

          {/* Only Customers can register publicly; Internal Lab roles use seeded credentials */}
          {isCustomerRole && (
            <div
              role="tablist"
              aria-label="Mode autentikasi pelanggan"
              className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'login'}
                onClick={() => {
                  setAuthTab('login');
                  setAuthError(null);
                  setAuthNotice(null);
                }}
                className={`min-h-[40px] rounded-md px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  authTab === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk Akun
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'register'}
                onClick={() => {
                  setAuthTab('register');
                  setAuthError(null);
                  setAuthNotice(null);
                }}
                className={`min-h-[40px] rounded-md px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  authTab === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daftar Badan Usaha
              </button>
            </div>
          )}

          {authTab === 'login' || !isCustomerRole ? (
            <div className="mt-6 space-y-5">
              <form onSubmit={handleCredentialLogin} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    {isCustomerRole ? 'Username atau Email Perusahaan' : 'Username atau Email Instansi'}
                  </label>
                  <div className="relative mt-1.5">
                    <UserIcon
                      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="login-identifier"
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={
                        isCustomerRole
                          ? 'pelanggan atau email@perusahaan.co.id'
                          : selectedRoleId === 'admin'
                            ? 'admin atau admin@smartlims.id'
                            : selectedRoleId === 'technical_manager'
                              ? 'manajerteknis atau teknis@smartlims.id'
                              : 'kepalabalai atau pimpinan@smartlims.id'
                      }
                      className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="text-xs font-medium text-cyan-700 hover:underline cursor-pointer"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <Lock
                      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-11 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                      className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
                  >
                    {authError}
                  </div>
                )}

                {authNotice && (
                  <div
                    role="status"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900"
                  >
                    {authNotice}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400 cursor-pointer"
                >
                  <KeyRound className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  <span>
                    {isAuthenticating
                      ? 'Memverifikasi Kredensial...'
                      : `Masuk ke Portal ${activeRole.shortTitle}`}
                  </span>
                </button>
              </form>

              {/* Google Sign-In option ONLY for Pelanggan / HSE */}
              {isCustomerRole && (
                <>
                  <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-slate-200" />
                    <span className="mx-3 shrink-0 text-xs text-slate-400">
                      atau masuk dengan Google
                    </span>
                    <div className="flex-grow border-t border-slate-200" />
                  </div>

                  <button
                    type="button"
                    disabled={isAuthenticating}
                    onClick={() => executeGoogleCustomerSignIn()}
                    className="flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                    <span>Masuk dengan Google (Pelanggan)</span>
                  </button>
                </>
              )}

              {!isCustomerRole && (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                  Akses internal laboratorium menggunakan akun ter-seed di database tanpa autentikasi
                  Google publik.
                </p>
              )}
            </div>
          ) : (
            /* Customer Corporate Registration (Email/Password OR Google) */
            <form onSubmit={handleRegisterWithEmail} noValidate className="mt-6 space-y-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-username"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Username
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="cth: hse_perusahaan"
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Email Perusahaan
                  </label>
                  <div className="relative mt-1">
                    <Mail
                      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="hse@perusahaan.co.id"
                      className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Kata Sandi Akun (minimal 6 karakter)
                </label>
                <div className="relative mt-1">
                  <input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Buat kata sandi"
                    className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white py-2 pr-10 pl-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((p) => !p)}
                    aria-label={showRegPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-company"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Nama Badan Usaha / Perusahaan
                </label>
                <div className="relative mt-1">
                  <Building2
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="reg-company"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Contoh: PT Nusantara Manufaktur Sejahtera"
                    className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-nib"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Nomor NIB / NPWP
                  </label>
                  <input
                    id="reg-nib"
                    type="text"
                    inputMode="numeric"
                    value={nibNumber}
                    onChange={(e) => setNibNumber(e.target.value)}
                    placeholder="13 – 16 digit"
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-pic"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Nama PJ Teknis (HSE)
                  </label>
                  <input
                    id="reg-pic"
                    type="text"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    placeholder="Nama lengkap PJ"
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-sector"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Sektor Industri
                </label>
                <select
                  id="reg-sector"
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                >
                  {INDUSTRY_SECTORS.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Rekomendasi parameter terkait:{' '}
                  <span className="font-medium text-slate-700">{activeSector.extraParam}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-phone"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Nomor Telepon / WA
                  </label>
                  <input
                    id="reg-phone"
                    type="text"
                    value={picPhone}
                    onChange={(e) => setPicPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-address"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Alamat Lokasi Pabrik
                  </label>
                  <input
                    id="reg-address"
                    type="text"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    placeholder="Kawasan Industri / Kota"
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                  />
                </div>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
                >
                  {authError}
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400 cursor-pointer"
                >
                  <Mail className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  <span>
                    {isAuthenticating
                      ? 'Mendaftarkan Akun...'
                      : 'Daftar dengan Email & Kata Sandi'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isAuthenticating}
                  onClick={handleRegisterWithGoogle}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                  <span>Simpan Profil &amp; Daftar dengan Google</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
