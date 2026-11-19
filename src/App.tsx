import { useEffect, useRef, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { AdminPortal } from './components/AdminPortal';
import { CustomerPortal } from './components/CustomerPortal';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { PublicAiChatbot } from './components/PublicAiChatbot';
import { DEMO_USERS, INITIAL_CALENDAR_DAYS, SAMPLER_TEAMS } from './data/limsMockDatabase';
import { PortalRoleId } from './data/limsPreviewData';
import { auth } from './lib/firebase';
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

type PageView = 'landing' | 'login' | 'portal';

function isUserAuthAllowed(fbUser: User): boolean {
  const email = (fbUser.email || '').toLowerCase();
  const isSeededAccount = DEMO_USERS.some((u) => u.email.toLowerCase() === email);
  const isPasswordProvider = fbUser.providerData.some(
    (p) => p.providerId === 'password'
  );
  return fbUser.emailVerified || (isSeededAccount && isPasswordProvider);
}

export default function App() {
  const [view, setView] = useState<PageView>(() =>
    window.location.hash === '#login' ? 'login' : 'landing'
  );
  const [selectedRole, setSelectedRole] = useState<PortalRoleId>('customer');

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
    setView('portal');
    window.location.hash = user.roleId === 'customer' ? 'portal-pelanggan' : 'portal-internal';
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  // Restore session on reload via Firebase onAuthStateChanged
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
          const { user, isAdmin } = await syncAndLoadUserProfile(
            fbUser,
            pending?.role ?? selectedRole,
            pending?.override
          );
          await seedInitialLimsData(fbUser, isAdmin);
          pendingProfileRef.current = null;
          setCurrentUser(user);
          setIsAdminUser(isAdmin);
          if (
            window.location.hash === '#portal-internal' ||
            window.location.hash === '#portal-admin' ||
            window.location.hash === '#portal-pelanggan'
          ) {
            setView('portal');
          }
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

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#login' && !currentUser) {
        setView('login');
      } else if (window.location.hash === '' && !currentUser) {
        setView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser]);

  const navigateToLogin = (preselectedRole: PortalRoleId = 'customer') => {
    setSelectedRole(preselectedRole);
    setView('login');
    window.location.hash = 'login';
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const navigateToLanding = () => {
    setView('landing');
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'auto' });
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
    setView('login');
    window.location.hash = 'login';
    window.scrollTo({ top: 0, behavior: 'auto' });
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

  if (view === 'portal' && currentUser && firebaseUser) {
    if (currentUser.roleId === 'customer' || !isAdminUser) {
      return (
        <CustomerPortal
          currentUser={currentUser}
          requests={requests}
          calendarDays={calendarDays}
          onAddRequest={handleAddRequest}
          onUpdateRequest={handleResubmitRequest}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <AdminPortal
        currentUser={currentUser}
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
    );
  }

  if (view === 'login') {
    return (
      <>
        <LoginPage
          initialRole={selectedRole}
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
  }

  return (
    <>
      <LandingPage onNavigateLogin={navigateToLogin} />
      <PublicAiChatbot pageContext="landing" />
    </>
  );
}
