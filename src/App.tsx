import { useEffect, useRef, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { AdminPortal } from './components/AdminPortal';
import { CustomerPortal } from './components/CustomerPortal';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { PublicAiChatbot } from './components/PublicAiChatbot';
import { DEMO_USERS, INITIAL_CALENDAR_DAYS, SAMPLER_TEAMS } from './data/limsMockDatabase';
import { PortalRoleId } from './data/limsPreviewData';
import { auth } from './lib/firebase';
import {
  ADMIN_SLUG_TO_TAB,
  CUSTOMER_SLUG_TO_TAB,
  PUBLIC_ROUTES,
  getDefaultPortalPath,
  getRouteDocumentTitle,
  isPathAllowedForUser,
} from './routes';
import {
  approveKajiUlangInDb,
  createSamplingRequestInDb,
  rejectSamplingRequestInDb,
  resubmitSamplingRequestInDb,
  seedInitialLimsData,
  subscribeAuditLogs,
  subscribeCalendarDays,
  subscribeSamplerTeams,
  subscribeSamplingRequests,
  subscribeUserDirectory,
  syncAndLoadUserProfile,
  updateCalendarDayInDb,
  verifySamplingRequestInDb,
} from './services/limsFirestore';
import {
  AuditLogEntry,
  CalendarCapacityDay,
  DemoUser,
  KajiUlangReview,
  SamplerTeam,
  SamplingRequest,
} from './types/lims';

interface RedirectLocationState {
  from?: {
    pathname: string;
    search?: string;
    hash?: string;
  };
}

function isUserAuthAllowed(fbUser: User): boolean {
  const email = (fbUser.email || '').toLowerCase();
  const isSeededAccount = DEMO_USERS.some((u) => u.email.toLowerCase() === email);
  const isPasswordProvider = fbUser.providerData.some(
    (p) => p.providerId === 'password'
  );
  return fbUser.emailVerified || (isSeededAccount && isPasswordProvider);
}

function SessionHydrationScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-slate-900">
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600"
          role="status"
          aria-label="Memulihkan sesi"
        />
        <div>
          <p className="font-display text-base font-bold tracking-tight text-slate-900">
            SmartLIMS
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Memulihkan sesi &amp; memverifikasi hak akses portal...
          </p>
        </div>
      </div>
    </div>
  );
}

interface CustomerRouteViewProps {
  authReady: boolean;
  firebaseUser: User | null;
  currentUser: DemoUser | null;
  isAdminUser: boolean;
  requests: SamplingRequest[];
  calendarDays: CalendarCapacityDay[];
  onAddRequest: (req: SamplingRequest) => Promise<void>;
  onUpdateRequest: (req: SamplingRequest) => Promise<void>;
  onLogout: () => Promise<void>;
}

function CustomerRouteView({
  authReady,
  firebaseUser,
  currentUser,
  isAdminUser,
  requests,
  calendarDays,
  onAddRequest,
  onUpdateRequest,
  onLogout,
}: CustomerRouteViewProps) {
  const { tab } = useParams<{ tab: string }>();
  const location = useLocation();

  if (!authReady) {
    return <SessionHydrationScreen />;
  }

  if (!firebaseUser || !isUserAuthAllowed(firebaseUser) || !currentUser) {
    return <Navigate to={PUBLIC_ROUTES.login} state={{ from: location }} replace />;
  }

  if (currentUser.roleId !== 'customer' && isAdminUser) {
    return (
      <Navigate
        to={getDefaultPortalPath(currentUser.roleId, isAdminUser)}
        replace
      />
    );
  }

  const mappedTab = tab ? CUSTOMER_SLUG_TO_TAB[tab] : undefined;
  if (!mappedTab) {
    return <Navigate to="/pelanggan/dashboard" replace />;
  }

  return (
    <CustomerPortal
      activeTab={mappedTab}
      currentUser={currentUser}
      requests={requests}
      calendarDays={calendarDays}
      onAddRequest={onAddRequest}
      onUpdateRequest={onUpdateRequest}
      onLogout={onLogout}
    />
  );
}

interface AdminRouteViewProps {
  authReady: boolean;
  firebaseUser: User | null;
  currentUser: DemoUser | null;
  isAdminUser: boolean;
  requests: SamplingRequest[];
  calendarDays: CalendarCapacityDay[];
  auditLogs: AuditLogEntry[];
  usersDirectory: DemoUser[];
  samplerTeams: SamplerTeam[];
  onVerifyRequest: (requestId: string, verifierName: string) => Promise<void>;
  onRejectRequest: (
    requestId: string,
    reason: string,
    actorName: string
  ) => Promise<void>;
  onApproveKajiUlang: (
    requestId: string,
    review: KajiUlangReview
  ) => Promise<void>;
  onUpdateCalendarDay: (
    date: string,
    patch: Partial<CalendarCapacityDay>
  ) => Promise<void>;
  onLogout: () => Promise<void>;
}

function AdminRouteView({
  authReady,
  firebaseUser,
  currentUser,
  isAdminUser,
  requests,
  calendarDays,
  auditLogs,
  usersDirectory,
  samplerTeams,
  onVerifyRequest,
  onRejectRequest,
  onApproveKajiUlang,
  onUpdateCalendarDay,
  onLogout,
}: AdminRouteViewProps) {
  const { tab } = useParams<{ tab: string }>();
  const location = useLocation();

  if (!authReady) {
    return <SessionHydrationScreen />;
  }

  if (!firebaseUser || !isUserAuthAllowed(firebaseUser) || !currentUser) {
    return (
      <Navigate
        to={`${PUBLIC_ROUTES.login}?portal=internal`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (currentUser.roleId === 'customer' || !isAdminUser) {
    return <Navigate to="/pelanggan/dashboard" replace />;
  }

  const mappedTab = tab ? ADMIN_SLUG_TO_TAB[tab] : undefined;
  if (!mappedTab) {
    return (
      <Navigate
        to={getDefaultPortalPath(currentUser.roleId, isAdminUser)}
        replace
      />
    );
  }

  return (
    <AdminPortal
      activeTab={mappedTab}
      currentUser={currentUser}
      requests={requests}
      calendarDays={calendarDays}
      auditLogs={auditLogs}
      usersDirectory={usersDirectory}
      samplerTeams={samplerTeams}
      onVerifyRequest={onVerifyRequest}
      onRejectRequest={onRejectRequest}
      onApproveKajiUlang={onApproveKajiUlang}
      onUpdateCalendarDay={onUpdateCalendarDay}
      onLogout={onLogout}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Firebase Auth & Profile State
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  const pendingProfileRef = useRef<{
    role: PortalRoleId;
    override?: Partial<DemoUser>;
  } | null>(null);
  const currentUserRef = useRef<DemoUser | null>(null);
  currentUserRef.current = currentUser;
  const isInteractiveLoginRef = useRef(false);

  // Firestore Live Collections
  const [requests, setRequests] = useState<SamplingRequest[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarCapacityDay[]>(
    INITIAL_CALENDAR_DAYS
  );
  const [samplerTeams, setSamplerTeams] = useState<SamplerTeam[]>(SAMPLER_TEAMS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [usersDirectory, setUsersDirectory] = useState<DemoUser[]>([]);

  // Update browser document title & scroll to top on route pathname change
  useEffect(() => {
    document.title = getRouteDocumentTitle(location.pathname);
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location.pathname, location.hash]);

  // Migrate legacy hash URLs (#login, #portal-pelanggan, #portal-internal) cleanly
  useEffect(() => {
    if (location.pathname !== '/') return;
    if (location.hash === '#login') {
      navigate(PUBLIC_ROUTES.login, { replace: true });
    } else if (location.hash === '#portal-pelanggan') {
      navigate('/pelanggan/dashboard', { replace: true });
    } else if (
      location.hash === '#portal-internal' ||
      location.hash === '#portal-admin'
    ) {
      navigate('/internal/dashboard', { replace: true });
    }
  }, [location.pathname, location.hash, navigate]);

  const isAuthenticatedSession = Boolean(
    authReady && firebaseUser && isUserAuthAllowed(firebaseUser) && currentUser
  );

  const completeAuthenticatedSignIn = async (
    fbUser: User,
    desiredRole: PortalRoleId,
    corporateOverride?: Partial<DemoUser>
  ) => {
    const { user, isAdmin } = await syncAndLoadUserProfile(
      fbUser,
      desiredRole,
      corporateOverride
    );
    await seedInitialLimsData(fbUser, isAdmin);
    setFirebaseUser(fbUser);
    setCurrentUser(user);
    setIsAdminUser(isAdmin);

    const state = location.state as RedirectLocationState | null;
    const intended = state?.from;
    const defaultTarget = getDefaultPortalPath(user.roleId, isAdmin);

    if (
      intended?.pathname &&
      isPathAllowedForUser(intended.pathname, user.roleId, isAdmin)
    ) {
      navigate(
        `${intended.pathname}${intended.search ?? ''}${intended.hash ?? ''}`,
        { replace: true }
      );
    } else {
      navigate(defaultTarget, { replace: true });
    }
  };

  // Restore session on reload (F5) via Firebase onAuthStateChanged BEFORE marking authReady
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (isInteractiveLoginRef.current) {
        setAuthReady(true);
        return;
      }

      if (fbUser && isUserAuthAllowed(fbUser) && !currentUserRef.current) {
        try {
          const pending = pendingProfileRef.current;
          const inferredRole: PortalRoleId =
            pending?.role ??
            (window.location.pathname.startsWith('/internal') ? 'admin' : 'customer');
          const { user, isAdmin } = await syncAndLoadUserProfile(
            fbUser,
            inferredRole,
            pending?.override
          );
          await seedInitialLimsData(fbUser, isAdmin);
          pendingProfileRef.current = null;
          setCurrentUser(user);
          setIsAdminUser(isAdmin);
        } catch (err) {
          console.error('Failed to restore session:', err);
        }
      }

      if (!fbUser) {
        setCurrentUser(null);
        setIsAdminUser(false);
        setRequests([]);
        setAuditLogs([]);
        setUsersDirectory([]);
      }
      setAuthReady(true);
    });

    return () => unsubAuth();
  }, []);

  // Attach real-time Firestore listeners ONLY when auth is ready & user is authenticated
  useEffect(() => {
    if (!authReady || !firebaseUser || !isUserAuthAllowed(firebaseUser) || !currentUser) {
      return;
    }

    const unsubRequests = subscribeSamplingRequests(
      firebaseUser.uid,
      isAdminUser,
      setRequests
    );
    const unsubCalendar = subscribeCalendarDays(setCalendarDays);
    const unsubTeams = subscribeSamplerTeams(setSamplerTeams);
    const unsubLogs = subscribeAuditLogs(isAdminUser, setAuditLogs);
    const unsubUsers = subscribeUserDirectory(isAdminUser, setUsersDirectory);

    return () => {
      unsubRequests();
      unsubCalendar();
      unsubTeams();
      unsubLogs();
      unsubUsers();
    };
  }, [authReady, firebaseUser, currentUser, isAdminUser]);

  const navigateToLogin = (preselectedRole: PortalRoleId = 'customer') => {
    if (isAuthenticatedSession && currentUser) {
      navigate(getDefaultPortalPath(currentUser.roleId, isAdminUser));
      return;
    }

    if (preselectedRole !== 'customer') {
      navigate(`${PUBLIC_ROUTES.login}?portal=internal`);
    } else {
      navigate(PUBLIC_ROUTES.login);
    }
  };

  const navigateToLanding = () => {
    navigate(PUBLIC_ROUTES.landing);
  };

  const handleFirebaseAuthSuccess = async (
    fbUser: User,
    desiredRole: PortalRoleId,
    corporateOverride?: Partial<DemoUser>
  ) => {
    pendingProfileRef.current = { role: desiredRole, override: corporateOverride };
    try {
      await completeAuthenticatedSignIn(fbUser, desiredRole, corporateOverride);
      pendingProfileRef.current = null;
    } finally {
      isInteractiveLoginRef.current = false;
    }
  };

  const handleLogout = async () => {
    pendingProfileRef.current = null;
    await signOut(auth);
    setCurrentUser(null);
    setIsAdminUser(false);
    navigate(PUBLIC_ROUTES.login, { replace: true });
  };

  const handleAddRequest = async (newReq: SamplingRequest) => {
    if (!firebaseUser) return;
    await createSamplingRequestInDb(newReq, firebaseUser.uid);
  };

  const handleResubmitRequest = async (updatedReq: SamplingRequest) => {
    if (!firebaseUser) return;
    await resubmitSamplingRequestInDb(updatedReq, firebaseUser.uid);
  };

  const handleVerifyRequest = async (requestId: string, verifierName: string) => {
    if (!firebaseUser) return;
    const target = requests.find((r) => r.id === requestId);
    if (!target) return;
    await verifySamplingRequestInDb(target, verifierName, firebaseUser.uid);
  };

  const handleRejectRequest = async (
    requestId: string,
    reason: string,
    actorName: string
  ) => {
    if (!firebaseUser) return;
    const target = requests.find((r) => r.id === requestId);
    if (!target) return;
    await rejectSamplingRequestInDb(
      target,
      reason,
      actorName,
      firebaseUser.uid,
      currentUser?.roleTitle || 'Admin Lab'
    );
  };

  const handleApproveKajiUlang = async (
    requestId: string,
    review: KajiUlangReview
  ) => {
    if (!firebaseUser) return;
    const target = requests.find((r) => r.id === requestId);
    if (!target) return;
    await approveKajiUlangInDb(target, review, firebaseUser.uid);
  };

  const handleUpdateCalendarDay = async (
    date: string,
    patch: Partial<CalendarCapacityDay>
  ) => {
    await updateCalendarDayInDb(date, patch);
  };

  const renderAuthPage = (initialTab: 'login' | 'register') => {
    if (isAuthenticatedSession && currentUser) {
      const state = location.state as RedirectLocationState | null;
      const intended = state?.from;
      const target =
        intended?.pathname &&
        isPathAllowedForUser(intended.pathname, currentUser.roleId, isAdminUser)
          ? `${intended.pathname}${intended.search ?? ''}${intended.hash ?? ''}`
          : getDefaultPortalPath(currentUser.roleId, isAdminUser);
      return <Navigate to={target} replace />;
    }

    return (
      <>
        <LoginPage
          initialTab={initialTab}
          onBackToLanding={navigateToLanding}
          onAuthStart={() => {
            isInteractiveLoginRef.current = true;
          }}
          onAuthAbort={() => {
            isInteractiveLoginRef.current = false;
          }}
          onFirebaseAuthSuccess={handleFirebaseAuthSuccess}
        />
        <PublicAiChatbot pageContext="login" />
      </>
    );
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path={PUBLIC_ROUTES.landing}
        element={
          <>
            <LandingPage onNavigateLogin={navigateToLogin} />
            <PublicAiChatbot pageContext="landing" />
          </>
        }
      />
      <Route path={PUBLIC_ROUTES.login} element={renderAuthPage('login')} />
      <Route path={PUBLIC_ROUTES.register} element={renderAuthPage('register')} />

      {/* Customer Portal Routes */}
      <Route
        path="/pelanggan"
        element={<Navigate to="/pelanggan/dashboard" replace />}
      />
      <Route
        path="/pelanggan/:tab"
        element={
          <CustomerRouteView
            authReady={authReady}
            firebaseUser={firebaseUser}
            currentUser={currentUser}
            isAdminUser={isAdminUser}
            requests={requests}
            calendarDays={calendarDays}
            onAddRequest={handleAddRequest}
            onUpdateRequest={handleResubmitRequest}
            onLogout={handleLogout}
          />
        }
      />

      {/* Internal Lab Portal Routes */}
      <Route
        path="/internal"
        element={
          !authReady ? (
            <SessionHydrationScreen />
          ) : isAuthenticatedSession && currentUser ? (
            <Navigate
              to={getDefaultPortalPath(currentUser.roleId, isAdminUser)}
              replace
            />
          ) : (
            <Navigate to={`${PUBLIC_ROUTES.login}?portal=internal`} replace />
          )
        }
      />
      <Route
        path="/internal/:tab"
        element={
          <AdminRouteView
            authReady={authReady}
            firebaseUser={firebaseUser}
            currentUser={currentUser}
            isAdminUser={isAdminUser}
            requests={requests}
            calendarDays={calendarDays}
            auditLogs={auditLogs}
            usersDirectory={usersDirectory}
            samplerTeams={samplerTeams}
            onVerifyRequest={handleVerifyRequest}
            onRejectRequest={handleRejectRequest}
            onApproveKajiUlang={handleApproveKajiUlang}
            onUpdateCalendarDay={handleUpdateCalendarDay}
            onLogout={handleLogout}
          />
        }
      />

      {/* Fallback for unknown paths */}
      <Route
        path="*"
        element={
          !authReady ? (
            <SessionHydrationScreen />
          ) : isAuthenticatedSession && currentUser ? (
            <Navigate
              to={getDefaultPortalPath(currentUser.roleId, isAdminUser)}
              replace
            />
          ) : (
            <Navigate to={PUBLIC_ROUTES.landing} replace />
          )
        }
      />
    </Routes>
  );
}
