import { FormEvent, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DEMO_USERS } from '../data/limsMockDatabase';
import {
  INDUSTRY_SECTORS,
  PORTAL_ROLES,
  PortalRoleId,
} from '../data/limsPreviewData';
import { auth } from '../lib/firebase';
import { PUBLIC_ROUTES } from '../routes';
import {
  checkUsernameAvailable,
  isValidUsernameFormat,
  loadPendingCorporateProfile,
  registerUsernameLookup,
  resolveLoginIdentifierToEmail,
  savePendingCorporateProfile,
} from '../services/limsFirestore';
import { DemoUser } from '../types/lims';

type AuthTab = 'login' | 'register';

interface LoginPageProps {
  initialRole?: PortalRoleId;
  initialTab?: AuthTab;
  onBackToLanding: () => void;
  onAuthStart?: () => void;
  onAuthAbort?: () => void;
  onFirebaseAuthSuccess: (
    firebaseUser: User,
    desiredRole: PortalRoleId,
    corporateOverride?: Partial<DemoUser>
  ) => Promise<void>;
}

function mapFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  const msg = err instanceof Error ? err.message : String(err);

  if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
    return 'Metode login Email/Password belum diaktifkan di Firebase Console (Authentication > Sign-in method > Email/Password) untuk proyek caramel-quiz-r41j7.';
  }
  if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
    const currentHost =
      typeof window !== 'undefined' && window.location.hostname
        ? window.location.hostname
        : 'domain ini';
    return `Domain "${currentHost}" belum didaftarkan di Firebase Authentication. Tambahkan domain tersebut di Firebase Console → Authentication → Settings → Authorized domains.`;
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
  initialTab = 'login',
  onBackToLanding,
  onAuthStart,
  onAuthAbort,
  onFirebaseAuthSuccess,
}: LoginPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portalQuery = searchParams.get('portal');

  const resolvedInitialRole: PortalRoleId =
    initialTab === 'register'
      ? 'customer'
      : portalQuery === 'internal'
        ? 'admin'
        : portalQuery === 'pelanggan'
          ? 'customer'
          : initialRole;

  const [selectedRoleId, setSelectedRoleId] = useState<PortalRoleId>(resolvedInitialRole);
  const [authTab, setAuthTab] = useState<AuthTab>(initialTab);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Keep local tab & portal role synchronized with browser URL (Back/Forward/F5)
  useEffect(() => {
    setAuthTab(initialTab);
    if (initialTab === 'register') {
      setSelectedRoleId('customer');
    } else if (portalQuery === 'internal') {
      setSelectedRoleId((prev) => (prev === 'customer' ? 'admin' : prev));
    } else if (portalQuery === 'pelanggan') {
      setSelectedRoleId('customer');
    }
  }, [initialTab, portalQuery]);

  // Login credentials (Email / Username + Password)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Corporate registration fields (Customer only)
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [nibNumber, setNibNumber] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [customSector, setCustomSector] = useState('');
  const [picName, setPicName] = useState('');
  const [picPhone, setPicPhone] = useState('');
  const [siteAddress, setSiteAddress] = useState('');

  // Email verification gate state
  const [pendingVerificationUser, setPendingVerificationUser] = useState<User | null>(null);
  const [pendingCorporateOverride, setPendingCorporateOverride] = useState<
    Partial<DemoUser> | undefined
  >(undefined);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);

  const activeRole =
    PORTAL_ROLES.find((r) => r.id === selectedRoleId) ?? PORTAL_ROLES[0];
  const activeSector = INDUSTRY_SECTORS.find((s) => s.id === sectorId) ?? null;
  const isCustomerRole = selectedRoleId === 'customer';

  const isSeededDemoEmail = (email?: string | null) =>
    DEMO_USERS.some((u) => u.email.toLowerCase() === (email || '').toLowerCase());

  useEffect(() => {
    const current = auth.currentUser;
    if (current && !current.emailVerified && !isSeededDemoEmail(current.email)) {
      setPendingVerificationUser(current);
      setPendingCorporateOverride(loadPendingCorporateProfile(current.uid));
      setAuthNotice(
        `Akun ${current.email ?? ''} menunggu verifikasi email sebelum dapat masuk ke portal.`
      );
    }
  }, []);

  const promptEmailVerification = async (
    fbUser: User,
    corporateOverride?: Partial<DemoUser>
  ) => {
    onAuthAbort?.();
    setIsAuthenticating(false);
    setPendingVerificationUser(fbUser);
    setPendingCorporateOverride(corporateOverride);
    setAuthError(null);
    try {
      await sendEmailVerification(fbUser, {
        url:
          typeof window !== 'undefined'
            ? `${window.location.origin}/login`
            : 'https://smart-lims-sda.vercel.app/login',
      });
      setAuthNotice(
        `Tautan verifikasi email telah dikirim ke ${fbUser.email ?? 'email Anda'}. Buka kotak masuk atau folder Spam, klik tautan verifikasi, lalu tekan tombol konfirmasi di bawah.`
      );
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/too-many-requests') {
        setAuthNotice(
          `Email verifikasi sudah dikirimkan sebelumnya ke ${fbUser.email ?? 'email Anda'}. Periksa kotak masuk atau folder Spam, lalu tekan tombol konfirmasi setelah memverifikasi.`
        );
      } else {
        setAuthError(mapFirebaseAuthError(err));
      }
    }
  };

  const handleCheckEmailVerified = async () => {
    if (!pendingVerificationUser) return;
    setAuthError(null);
    setAuthNotice(null);
    setIsCheckingVerification(true);
    try {
      await pendingVerificationUser.reload();
      await pendingVerificationUser.getIdToken(true);
      const refreshedUser = auth.currentUser ?? pendingVerificationUser;

      if (refreshedUser.emailVerified) {
        onAuthStart?.();
        const profileData =
          pendingCorporateOverride ?? loadPendingCorporateProfile(refreshedUser.uid);
        await onFirebaseAuthSuccess(refreshedUser, 'customer', profileData);
        return;
      }

      setAuthError(
        'Email belum terverifikasi. Pastikan Anda sudah mengklik tautan verifikasi di kotak masuk atau folder Spam email Anda, lalu coba lagi.'
      );
    } catch (err) {
      onAuthAbort?.();
      setAuthError(mapFirebaseAuthError(err));
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!pendingVerificationUser) return;
    setAuthError(null);
    setAuthNotice(null);
    setIsCheckingVerification(true);
    try {
      await sendEmailVerification(pendingVerificationUser, {
        url:
          typeof window !== 'undefined'
            ? `${window.location.origin}/login`
            : 'https://smart-lims-sda.vercel.app/login',
      });
      setAuthNotice(
        `Tautan verifikasi baru telah dikirim ulang ke ${pendingVerificationUser.email ?? 'email Anda'}.`
      );
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleCancelVerification = async () => {
    setAuthError(null);
    setAuthNotice(null);
    try {
      await signOut(auth);
    } catch {
      // Ignore signOut failure on fallback reset
    }
    setPendingVerificationUser(null);
    setPendingCorporateOverride(undefined);
    onAuthAbort?.();
  };

  const handleRoleSwitch = (roleId: PortalRoleId) => {
    setSelectedRoleId(roleId);
    setAuthError(null);
    setAuthNotice(null);
    if (roleId !== 'customer') {
      setAuthTab('login');
      navigate(`${PUBLIC_ROUTES.login}?portal=internal`);
    } else if (authTab === 'register') {
      navigate(PUBLIC_ROUTES.register);
    } else {
      navigate(PUBLIC_ROUTES.login);
    }
  };

  const handleAuthTabSwitch = (nextTab: AuthTab) => {
    setAuthTab(nextTab);
    setAuthError(null);
    setAuthNotice(null);
    if (nextTab === 'register') {
      setSelectedRoleId('customer');
      navigate(PUBLIC_ROUTES.register);
    } else {
      navigate(
        selectedRoleId !== 'customer'
          ? `${PUBLIC_ROUTES.login}?portal=internal`
          : PUBLIC_ROUTES.login
      );
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

    onAuthStart?.();
    setIsAuthenticating(true);
    let matchedSeed: DemoUser | undefined;
    try {
      const resolvedEmail = await resolveLoginIdentifierToEmail(cleanIdentifier);
      matchedSeed = DEMO_USERS.find(
        (u) =>
          u.email.toLowerCase() === resolvedEmail ||
          u.username?.toLowerCase() === cleanIdentifier.toLowerCase()
      );

      if (matchedSeed) {
        if (isCustomerRole && matchedSeed.roleId !== 'customer') {
          onAuthAbort?.();
          setIsAuthenticating(false);
          setAuthError(
            'Akun ini adalah akun internal laboratorium. Pilih portal Internal Lab di panel kiri.'
          );
          return;
        }
        if (!isCustomerRole && matchedSeed.roleId === 'customer') {
          onAuthAbort?.();
          setIsAuthenticating(false);
          setAuthError(
            'Akun pelanggan tidak memiliki akses ke portal internal laboratorium.'
          );
          return;
        }
      }
      const credential = await signInWithEmailAndPassword(auth, resolvedEmail, password);
      if (!credential.user.emailVerified && !isSeededDemoEmail(credential.user.email)) {
        await promptEmailVerification(
          credential.user,
          loadPendingCorporateProfile(credential.user.uid)
        );
        return;
      }
      const effectiveRole = matchedSeed?.roleId ?? selectedRoleId;
      await onFirebaseAuthSuccess(
        credential.user,
        effectiveRole,
        matchedSeed ?? loadPendingCorporateProfile(credential.user.uid)
      );
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

    setIsAuthenticating(true);
    try {
      const resolvedEmail = await resolveLoginIdentifierToEmail(cleanIdentifier);
      await sendPasswordResetEmail(auth, resolvedEmail);
      setAuthNotice(`Tautan reset kata sandi telah dikirim ke ${resolvedEmail}.`);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const validateCorporateProfile = (): Partial<DemoUser> | null => {
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setAuthError('Masukkan alamat email perusahaan yang valid (wajib diisi untuk verifikasi).');
      return null;
    }
    const cleanUsername = regUsername.trim().toLowerCase();
    if (!cleanUsername) {
      setAuthError('Username wajib diisi karena dapat digunakan untuk login.');
      return null;
    }
    if (!isValidUsernameFormat(cleanUsername)) {
      setAuthError(
        'Username minimal 3 karakter dan hanya boleh menggunakan huruf kecil, angka, tanda hubung (-), atau garis bawah (_).'
      );
      return null;
    }
    if (regPassword.length < 6) {
      setAuthError('Kata sandi akun minimal terdiri dari 6 karakter.');
      return null;
    }
    if (!regConfirmPassword) {
      setAuthError('Konfirmasi kata sandi wajib diisi untuk memverifikasi kata sandi.');
      return null;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError('Konfirmasi kata sandi tidak cocok dengan kata sandi yang dimasukkan.');
      return null;
    }
    if (companyName.trim().length < 3) {
      setAuthError('Nama badan usaha / perusahaan wajib diisi (minimal 3 karakter).');
      return null;
    }
    const trimmedNib = nibNumber.trim();
    if (trimmedNib) {
      const digitsOnly = trimmedNib.replace(/\D/g, '');
      if (digitsOnly.length < 13) {
        setAuthError('Jika diisi, nomor NIB / NPWP minimal terdiri dari 13 digit angka.');
        return null;
      }
    }
    if (picName.trim().length < 2) {
      setAuthError('Nama lengkap PJ Teknis (HSE) wajib diisi.');
      return null;
    }
    if (!sectorId) {
      setAuthError('Pilih sektor industri perusahaan terlebih dahulu.');
      return null;
    }
    if (sectorId === 'lainnya' && customSector.trim().length < 3) {
      setAuthError('Tuliskan sektor industri perusahaan Anda (minimal 3 karakter).');
      return null;
    }
    const phoneDigits = picPhone.replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      setAuthError('Nomor telepon / WhatsApp aktif wajib diisi (minimal 8 digit).');
      return null;
    }
    if (siteAddress.trim().length < 5) {
      setAuthError('Alamat lokasi pabrik / operasional wajib diisi.');
      return null;
    }

    const resolvedSectorId =
      sectorId === 'lainnya' ? customSector.trim().slice(0, 64) : sectorId;

    return {
      username: cleanUsername,
      companyName: companyName.trim(),
      nibOrNip: trimmedNib,
      sectorId: resolvedSectorId,
      name: picName.trim(),
      phone: picPhone.trim(),
      address: siteAddress.trim(),
    };
  };

  const handleRegisterWithEmail = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);

    const profilePatch = validateCorporateProfile();
    if (!profilePatch || !profilePatch.username) return;

    const normalizedEmail = regEmail.trim().toLowerCase();
    const cleanUsername = profilePatch.username;

    onAuthStart?.();
    setIsAuthenticating(true);
    try {
      const available = await checkUsernameAvailable(cleanUsername);
      if (!available) {
        onAuthAbort?.();
        setIsAuthenticating(false);
        setAuthError(
          `Username "${cleanUsername}" sudah terdaftar. Silakan gunakan username lain.`
        );
        return;
      }

      const cred = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        regPassword
      );
      await updateProfile(cred.user, { displayName: picName.trim() });
      await registerUsernameLookup(cred.user.uid, cleanUsername, normalizedEmail);
      const registeredProfile: Partial<DemoUser> = {
        ...profilePatch,
        email: normalizedEmail,
      };
      savePendingCorporateProfile(cred.user.uid, registeredProfile);
      await promptEmailVerification(cred.user, registeredProfile);
      return;
    } catch (err) {
      onAuthAbort?.();
      setAuthError(mapFirebaseAuthError(err));
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      {/* LEFT PANEL: Deep Slate Navy Context & Portal Selector (Fixed Width + Sticky Desktop) */}
      <aside className="flex w-full shrink-0 flex-col justify-between bg-slate-900 px-6 py-8 text-slate-100 sm:px-10 lg:sticky lg:top-0 lg:h-screen lg:w-[500px] xl:w-[580px] lg:overflow-y-auto lg:px-12 lg:py-10">
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

          <div className="mt-8 lg:mt-10">
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

          {/* Portal Entry Selector: Pelanggan vs Internal Lab */}
          <div className="mt-7">
            <p className="text-xs font-medium text-slate-400">Pilih Portal Masuk</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleRoleSwitch('customer')}
                className={`min-h-[48px] rounded-lg border px-3.5 py-2.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                  isCustomerRole
                    ? 'border-cyan-500 bg-cyan-500/15 text-white'
                    : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span className="block truncate font-semibold">Pelanggan</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                  Eksternal · HSE Perusahaan
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSwitch('admin')}
                className={`min-h-[48px] rounded-lg border px-3.5 py-2.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                  !isCustomerRole
                    ? 'border-cyan-500 bg-cyan-500/15 text-white'
                    : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span className="block truncate font-semibold">Internal Lab</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                  Admin · Teknis · Pimpinan
                </span>
              </button>
            </div>
          </div>

          {/* Active Portal Privileges */}
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            {isCustomerRole ? (
              <>
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
              </>
            ) : (
              <>
                <p className="font-mono text-[11px] text-emerald-400">
                  Verifikasi, Kaji Ulang ISO 17025, &amp; Eksekutif
                </p>
                <h2 className="mt-1 font-display text-base font-semibold text-white">
                  Portal Internal Laboratorium
                </h2>
                <ul className="mt-3.5 space-y-2.5">
                  {[
                    'Verifikasi berkas permohonan & manajemen kuota kalender tim (Admin Lab)',
                    'Kaji ulang permintaan ISO/IEC 17025 & penugasan tim BNSP (Manajer Teknis)',
                    'Penerbitan SPH final, SPK lapangan, & ringkasan eksekutif (Kepala Balai)',
                    'Hak akses otomatis disesuaikan berdasarkan akun internal yang masuk',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2.5 border-t border-slate-800 pt-5 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          <span>Enkripsi TLS 1.3 · Aturan Keamanan Firestore Tervalidasi</span>
        </div>
      </aside>

      {/* RIGHT PANEL: Production Role-Specific Auth */}
      <main className="flex flex-1 flex-col justify-center bg-white px-5 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {pendingVerificationUser ? (
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                <Mail className="h-6 w-6" aria-hidden="true" />
              </div>

              <div>
                <p className="font-mono text-xs font-medium text-cyan-700">
                  Verifikasi Email Diperlukan
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
                  Periksa Kotak Masuk Email Anda
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Kami telah mengirimkan tautan verifikasi ke{' '}
                  <span className="font-semibold text-slate-900">
                    {pendingVerificationUser.email}
                  </span>
                  . Klik tautan pada email tersebut untuk mengaktifkan akses portal pelanggan.
                </p>
              </div>

              {authNotice && (
                <div
                  role="status"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900"
                >
                  {authNotice}
                </div>
              )}

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
                  type="button"
                  disabled={isCheckingVerification}
                  onClick={handleCheckEmailVerified}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span>
                    {isCheckingVerification
                      ? 'Memeriksa Status Verifikasi...'
                      : 'Saya Sudah Verifikasi — Masuk Portal'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isCheckingVerification}
                  onClick={handleResendVerificationEmail}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                  <span>Kirim Ulang Email Verifikasi</span>
                </button>

                <button
                  type="button"
                  disabled={isCheckingVerification}
                  onClick={handleCancelVerification}
                  className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ganti Akun / Kembali ke Halaman Login</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                  {!isCustomerRole
                    ? 'Masuk Portal Internal Lab'
                    : authTab === 'login'
                      ? 'Masuk Portal Pelanggan'
                      : 'Registrasi Badan Usaha'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {!isCustomerRole
                    ? 'Masuk menggunakan username atau email instansi untuk Admin Lab, Manajer Teknis, atau Kepala Balai'
                    : authTab === 'login'
                      ? 'Masuk menggunakan username atau email badan usaha yang telah terdaftar dan terverifikasi'
                      : 'Lengkapi profil badan usaha dan verifikasi alamat email Anda untuk membuat akun pelanggan'}
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
                    onClick={() => handleAuthTabSwitch('login')}
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
                    onClick={() => handleAuthTabSwitch('register')}
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
                          : 'admin, manajerteknis, atau email@smartlims.id'
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
                      : isCustomerRole
                        ? 'Masuk ke Portal Pelanggan'
                        : 'Masuk ke Portal Internal Lab'}
                  </span>
                </button>
              </form>

              {isCustomerRole ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
                  <p>
                    Pelanggan yang belum memiliki akun wajib mendaftar melalui tab{' '}
                    <span className="font-semibold text-slate-800">Daftar Badan Usaha</span> dan
                    memverifikasi tautan yang dikirim ke kotak masuk email yang didaftarkan.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('register');
                      setAuthError(null);
                      setAuthNotice(null);
                    }}
                    className="mt-2 font-semibold text-cyan-700 hover:underline cursor-pointer"
                  >
                    Belum punya akun? Daftar Badan Usaha sekarang →
                  </button>
                </div>
              ) : (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                  Akses internal laboratorium menggunakan akun instansi ter-seed di database.
                </p>
              )}
            </div>
          ) : (
            /* Customer Corporate Registration (Email/Password + Mandatory Email Verification) */
            <form onSubmit={handleRegisterWithEmail} noValidate className="mt-6 space-y-3.5">
              <div className="flex items-center justify-between rounded-lg border border-cyan-100 bg-cyan-50/70 px-3 py-2 text-[11px] text-slate-700">
                <span>
                  Kolom bertanda <span className="font-bold text-rose-600">*</span> wajib diisi.
                </span>
                <span className="font-medium text-cyan-800">Verifikasi via Email</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Email Perusahaan <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <div className="relative mt-1">
                    <Mail
                      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="reg-email"
                      type="email"
                      required
                      aria-required="true"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="hse@perusahaan.co.id"
                      className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="reg-username"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Username <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    required
                    aria-required="true"
                    value={regUsername}
                    onChange={(e) =>
                      setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))
                    }
                    placeholder="cth: hse_perusahaan"
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                  />
                </div>
              </div>
              <p className="!mt-1 text-[11px] text-slate-500">
                Tautan verifikasi dikirim ke email di atas. Username (huruf kecil/angka/<code className="font-mono">_</code>/<code className="font-mono">-</code>) dapat dipakai untuk login.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Kata Sandi (min. 6 karakter){' '}
                    <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      aria-required="true"
                      autoComplete="new-password"
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
                    htmlFor="reg-confirm-password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Konfirmasi Kata Sandi{' '}
                    <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="reg-confirm-password"
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      aria-required="true"
                      autoComplete="new-password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi"
                      className={`min-h-[42px] w-full rounded-lg border bg-white py-2 pr-10 pl-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        regConfirmPassword && regPassword !== regConfirmPassword
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-slate-300 focus:border-cyan-600 focus:ring-cyan-600/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword((p) => !p)}
                      aria-label={
                        showRegConfirmPassword
                          ? 'Sembunyikan konfirmasi kata sandi'
                          : 'Lihat konfirmasi kata sandi'
                      }
                      className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showRegConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {regConfirmPassword && (
                <p
                  className={`!mt-1 text-[11px] font-medium ${
                    regPassword === regConfirmPassword ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {regPassword === regConfirmPassword
                    ? 'Kata sandi cocok.'
                    : 'Konfirmasi kata sandi belum cocok.'}
                </p>
              )}

              <div>
                <label
                  htmlFor="reg-company"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Nama Badan Usaha / Perusahaan{' '}
                  <span className="text-rose-600" aria-hidden="true">*</span>
                </label>
                <div className="relative mt-1">
                  <Building2
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="reg-company"
                    type="text"
                    required
                    aria-required="true"
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
                    Nomor NIB / NPWP{' '}
                    <span className="font-normal text-slate-400">(Opsional)</span>
                  </label>
                  <input
                    id="reg-nib"
                    type="text"
                    inputMode="numeric"
                    value={nibNumber}
                    onChange={(e) => setNibNumber(e.target.value)}
                    placeholder="13 – 16 digit (jika ada)"
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-pic"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Nama PJ Teknis (HSE){' '}
                    <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="reg-pic"
                    type="text"
                    required
                    aria-required="true"
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
                  Sektor Industri <span className="text-rose-600" aria-hidden="true">*</span>
                </label>
                <select
                  id="reg-sector"
                  required
                  aria-required="true"
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className={`mt-1 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20 ${
                    sectorId ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  <option value="" disabled>
                    -- Pilih Sektor Industri --
                  </option>
                  {INDUSTRY_SECTORS.map((sector) => (
                    <option key={sector.id} value={sector.id} className="text-slate-900">
                      {sector.label}
                    </option>
                  ))}
                  <option value="lainnya" className="text-slate-900">
                    Lainnya (Isi Sendiri / Kustom)
                  </option>
                </select>
                {activeSector && (
                  <p className="mt-1 text-xs text-slate-500">
                    Rekomendasi parameter terkait:{' '}
                    <span className="font-medium text-slate-700">{activeSector.extraParam}</span>
                  </p>
                )}
              </div>

              {sectorId === 'lainnya' && (
                <div>
                  <label
                    htmlFor="reg-custom-sector"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Sebutkan Sektor Industri{' '}
                    <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="reg-custom-sector"
                    type="text"
                    required
                    aria-required="true"
                    value={customSector}
                    onChange={(e) => setCustomSector(e.target.value)}
                    placeholder="Contoh: Industri Kimia, Farmasi, Pengolahan Limbah B3"
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-cyan-300 bg-cyan-50/30 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-phone"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Nomor Telepon / WA{' '}
                    <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="reg-phone"
                    type="text"
                    required
                    aria-required="true"
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
                    Alamat Lokasi Pabrik{' '}
                    <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="reg-address"
                    type="text"
                    required
                    aria-required="true"
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

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400 cursor-pointer"
                >
                  <Mail className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  <span>
                    {isAuthenticating
                      ? 'Mendaftarkan Akun & Mengirim Verifikasi...'
                      : 'Daftar & Kirim Email Verifikasi'}
                  </span>
                </button>
              </div>
            </form>
          )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
