import { User } from 'firebase/auth';
import {
  Unsubscribe,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  DEMO_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CALENDAR_DAYS,
  INITIAL_SAMPLING_REQUESTS,
  SAMPLER_TEAMS,
  resolveIdentifierToEmail,
} from '../data/limsMockDatabase';
import { PortalRoleId } from '../data/limsPreviewData';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  BOOTSTRAPPED_ADMIN_EMAILS,
  OperationType,
  db,
  handleFirestoreError,
} from '../lib/firebase';
import {
  AuditLogEntry,
  CalendarCapacityDay,
  DemoUser,
  KajiUlangReview,
  SamplerTeam,
  SamplingRequest,
} from '../types/lims';

export function formatNowTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
}

export function isBootstrappedAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && BOOTSTRAPPED_ADMIN_EMAILS.includes(email.toLowerCase()));
}

export function isBootstrappedAdminUser(firebaseUser: User): boolean {
  const email = (firebaseUser.email || '').toLowerCase();
  if (!email) return false;
  if (email === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    return firebaseUser.emailVerified;
  }
  const hasPasswordProvider = firebaseUser.providerData.some(
    (p) => p.providerId === 'password'
  );
  return (
    BOOTSTRAPPED_ADMIN_EMAILS.includes(email) &&
    (hasPasswordProvider || firebaseUser.emailVerified)
  );
}

export async function checkIsAdminUser(firebaseUser: User): Promise<boolean> {
  if (isBootstrappedAdminUser(firebaseUser)) {
    return true;
  }
  try {
    const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
    return adminSnap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `admins/${firebaseUser.uid}`);
  }
}

const PENDING_CORPORATE_STORAGE_PREFIX = 'smartlims_pending_corporate_';
const USERNAME_CACHE_KEY = 'smartlims_username_email_cache';

export function isValidUsernameFormat(username: string): boolean {
  return /^[a-z0-9_-]{3,64}$/.test(username.trim().toLowerCase());
}

function saveLocalUsernameEmail(username: string, email: string): void {
  try {
    const raw = localStorage.getItem(USERNAME_CACHE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[username.toLowerCase()] = email.toLowerCase();
    localStorage.setItem(USERNAME_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

function loadLocalUsernameEmail(username: string): string | null {
  try {
    const raw = localStorage.getItem(USERNAME_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[username.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const clean = username.trim().toLowerCase();
  if (!isValidUsernameFormat(clean)) return false;
  if (DEMO_USERS.some((u) => u.username?.toLowerCase() === clean)) {
    return false;
  }
  try {
    const snap = await getDoc(doc(db, 'usernames', clean));
    return !snap.exists();
  } catch {
    return true;
  }
}

export async function registerUsernameLookup(
  uid: string,
  username: string,
  email: string
): Promise<void> {
  const clean = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidUsernameFormat(clean) || !normalizedEmail) return;

  saveLocalUsernameEmail(clean, normalizedEmail);
  try {
    const ref = doc(db, 'usernames', clean);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        uid,
        username: clean,
        email: normalizedEmail,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Unable to index username lookup:', err);
  }
}

export async function resolveLoginIdentifierToEmail(
  identifier: string
): Promise<string> {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return '';
  if (clean.includes('@')) return clean;

  const matchedSeed = DEMO_USERS.find(
    (u) => u.username?.toLowerCase() === clean
  );
  if (matchedSeed) return matchedSeed.email.toLowerCase();

  if (isValidUsernameFormat(clean)) {
    try {
      const snap = await getDoc(doc(db, 'usernames', clean));
      if (snap.exists()) {
        const emailVal = String(snap.data().email || '').trim().toLowerCase();
        if (emailVal) {
          saveLocalUsernameEmail(clean, emailVal);
          return emailVal;
        }
      }
    } catch {
      // Fall through to local cache / fallback
    }
  }

  const cached = loadLocalUsernameEmail(clean);
  if (cached) return cached;

  return resolveIdentifierToEmail(clean);
}

export function savePendingCorporateProfile(
  uid: string,
  profile: Partial<DemoUser>
): void {
  try {
    localStorage.setItem(
      `${PENDING_CORPORATE_STORAGE_PREFIX}${uid}`,
      JSON.stringify(profile)
    );
  } catch {
    // Ignore storage unavailability
  }
}

export function loadPendingCorporateProfile(
  uid: string
): Partial<DemoUser> | undefined {
  try {
    const raw = localStorage.getItem(`${PENDING_CORPORATE_STORAGE_PREFIX}${uid}`);
    if (!raw) return undefined;
    return JSON.parse(raw) as Partial<DemoUser>;
  } catch {
    return undefined;
  }
}

export function clearPendingCorporateProfile(uid: string): void {
  try {
    localStorage.removeItem(`${PENDING_CORPORATE_STORAGE_PREFIX}${uid}`);
  } catch {
    // Ignore storage unavailability
  }
}

export async function syncAndLoadUserProfile(
  firebaseUser: User,
  desiredRole: PortalRoleId,
  corporateOverride?: Partial<DemoUser>
): Promise<{ user: DemoUser; isAdmin: boolean }> {
  const isAdmin = await checkIsAdminUser(firebaseUser);
  const userPath = `users/${firebaseUser.uid}`;
  const userRef = doc(db, 'users', firebaseUser.uid);

  const normalizedEmail = (firebaseUser.email || '').toLowerCase();
  const matchedSeedUser = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );

  const effectiveOverride =
    corporateOverride ?? loadPendingCorporateProfile(firebaseUser.uid);

  try {
    const snap = await getDoc(userRef);
    const seedTemplate = matchedSeedUser ?? (isAdmin ? DEMO_USERS[1] : undefined);
    const effectiveRole: PortalRoleId = isAdmin
      ? matchedSeedUser?.roleId ?? desiredRole
      : 'customer';

    if (!snap.exists()) {
      const profilePayload: Record<string, unknown> = {
        uid: firebaseUser.uid,
        email: (firebaseUser.email || seedTemplate?.email || '').slice(0, 200),
        name: (
          effectiveOverride?.name ||
          firebaseUser.displayName ||
          seedTemplate?.name ||
          'Penanggung Jawab HSE'
        ).slice(0, 150),
        role: effectiveRole,
        roleTitle: (
          matchedSeedUser?.roleTitle ||
          (isAdmin ? 'Admin Lab & Koordinator Kaji Ulang' : 'Pelanggan / HSE Officer')
        ).slice(0, 120),
        companyName: (
          effectiveOverride?.companyName ||
          seedTemplate?.companyName ||
          'Badan Usaha Terdaftar'
        ).slice(0, 200),
        nibOrNip: (effectiveOverride?.nibOrNip || seedTemplate?.nibOrNip || '').slice(0, 64),
        sectorId: (effectiveOverride?.sectorId || seedTemplate?.sectorId || '').slice(
          0,
          64
        ),
        phone: (effectiveOverride?.phone || seedTemplate?.phone || '').slice(0, 40),
        address: (effectiveOverride?.address || seedTemplate?.address || '').slice(0, 300),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const usernameVal = effectiveOverride?.username || seedTemplate?.username;
      if (usernameVal && usernameVal.length >= 3) {
        profilePayload.username = usernameVal.slice(0, 64);
      }

      await setDoc(userRef, profilePayload);
      clearPendingCorporateProfile(firebaseUser.uid);

      if (usernameVal && isValidUsernameFormat(usernameVal)) {
        await registerUsernameLookup(
          firebaseUser.uid,
          usernameVal,
          String(profilePayload.email)
        );
      }

      if (isBootstrappedAdminUser(firebaseUser)) {
        await setDoc(doc(db, 'admins', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: firebaseUser.email || BOOTSTRAPPED_ADMIN_EMAIL,
          grantedAt: serverTimestamp(),
        });
      }

      return {
        isAdmin,
        user: {
          id: firebaseUser.uid,
          username: usernameVal,
          email: String(profilePayload.email),
          password: '',
          name: String(profilePayload.name),
          roleId: effectiveRole,
          roleTitle: String(profilePayload.roleTitle),
          companyName: String(profilePayload.companyName),
          nibOrNip: String(profilePayload.nibOrNip),
          sectorId: String(profilePayload.sectorId),
          phone: String(profilePayload.phone),
          address: String(profilePayload.address),
        },
      };
    }

    clearPendingCorporateProfile(firebaseUser.uid);
    const existing = snap.data();
    const resolvedRole = (existing.role as PortalRoleId) || effectiveRole;
    return {
      isAdmin: isAdmin || resolvedRole !== 'customer',
      user: {
        id: firebaseUser.uid,
        username: existing.username ? String(existing.username) : matchedSeedUser?.username,
        email: String(existing.email || firebaseUser.email || ''),
        password: '',
        name: String(existing.name || firebaseUser.displayName || seedTemplate?.name || ''),
        roleId: resolvedRole,
        roleTitle: String(
          existing.roleTitle ||
            seedTemplate?.roleTitle ||
            'Pelanggan / HSE Officer'
        ),
        companyName: String(existing.companyName || seedTemplate?.companyName || ''),
        nibOrNip: String(existing.nibOrNip || seedTemplate?.nibOrNip || ''),
        sectorId: String(existing.sectorId || seedTemplate?.sectorId || ''),
        phone: String(existing.phone || seedTemplate?.phone || ''),
        address: String(existing.address || seedTemplate?.address || ''),
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function seedInitialLimsData(
  firebaseUser: User,
  isAdmin: boolean
): Promise<void> {
  if (isAdmin) {
    // 0. Seed all 4 role user profiles (Pelanggan, Admin, Manajer Teknis, Kepala Balai) directly to /users
    try {
      const batch = writeBatch(db);
      let hasUserSeed = false;
      for (const seedUser of DEMO_USERS) {
        const seedDocId = `seed-${seedUser.id}`;
        const existingSnap = await getDoc(doc(db, 'users', seedDocId));
        if (!existingSnap.exists()) {
          hasUserSeed = true;
          batch.set(doc(db, 'users', seedDocId), {
            uid: seedDocId,
            username: seedUser.username || seedUser.id,
            email: seedUser.email,
            name: seedUser.name,
            role: seedUser.roleId,
            roleTitle: seedUser.roleTitle,
            companyName: seedUser.companyName,
            nibOrNip: seedUser.nibOrNip,
            sectorId: seedUser.sectorId || 'tekstil',
            phone: seedUser.phone,
            address: seedUser.address,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      if (hasUserSeed) {
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }

    // 1. Seed calendar_days if empty
    try {
      const calSnap = await getDocs(collection(db, 'calendar_days'));
      if (calSnap.empty) {
        const batch = writeBatch(db);
        for (const day of INITIAL_CALENDAR_DAYS) {
          batch.set(doc(db, 'calendar_days', day.date), {
            date: day.date,
            dayLabel: day.dayLabel,
            dateLabel: day.dateLabel,
            maxCapacity: day.maxCapacity,
            isLocked: day.isLocked,
            equipmentNote: day.equipmentNote,
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'calendar_days');
    }

    // 2. Seed sampler_teams if empty
    try {
      const teamSnap = await getDocs(collection(db, 'sampler_teams'));
      if (teamSnap.empty) {
        const batch = writeBatch(db);
        for (const team of SAMPLER_TEAMS) {
          batch.set(doc(db, 'sampler_teams', team.id), team);
        }
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sampler_teams');
    }

    // 3. Seed sampling_requests if empty
    try {
      const reqSnap = await getDocs(collection(db, 'sampling_requests'));
      if (reqSnap.empty) {
        const batch = writeBatch(db);
        for (const req of INITIAL_SAMPLING_REQUESTS) {
          const payload: Record<string, unknown> = {
            ownerUid:
              req.companyId === 'usr-cust-01' ? firebaseUser.uid : 'seed-other-tenant',
            trackingCode: req.trackingCode,
            companyId: req.companyId === 'usr-cust-01' ? firebaseUser.uid : req.companyId,
            companyName: req.companyName,
            nibNumber: req.nibNumber,
            sectorId: req.sectorId,
            picName: req.picName,
            picEmail: req.picEmail,
            picPhone: req.picPhone,
            siteAddress: req.siteAddress,
            scheduledDate: req.scheduledDate,
            points: req.points,
            labSubtotal: req.labSubtotal,
            transportFee: req.transportFee,
            ppnAmount: req.ppnAmount,
            totalEstimatedCost: req.totalEstimatedCost,
            status: req.status,
            createdAtLabel: req.createdAt,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (req.verifiedAt) payload.verifiedAt = req.verifiedAt;
          if (req.verifiedBy) payload.verifiedBy = req.verifiedBy;
          if (req.rejectionReason) payload.rejectionReason = req.rejectionReason;
          if (req.kajiUlang) payload.kajiUlang = req.kajiUlang;

          batch.set(doc(db, 'sampling_requests', req.id), payload);
        }
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sampling_requests');
    }

    // 4. Seed audit_logs if empty
    try {
      const logSnap = await getDocs(collection(db, 'audit_logs'));
      if (logSnap.empty) {
        const batch = writeBatch(db);
        for (const log of INITIAL_AUDIT_LOGS) {
          batch.set(doc(db, 'audit_logs', log.id), {
            actorUid: firebaseUser.uid,
            timestampLabel: log.timestamp,
            actorName: log.actorName,
            actorRole: log.actorRole,
            trackingCode: log.trackingCode,
            action: log.action,
            detail: log.detail,
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'audit_logs');
    }
    return;
  }

  // Non-admin demo customer: seed 1 SUBMITTED starter request ONLY for the built-in demo customer account
  if ((firebaseUser.email || '').toLowerCase() !== 'hse@nusantaratekstil.co.id') {
    return;
  }

  try {
    const mySnap = await getDocs(
      query(collection(db, 'sampling_requests'), where('ownerUid', '==', firebaseUser.uid))
    );
    if (mySnap.empty) {
      const starter = INITIAL_SAMPLING_REQUESTS[0];
      const docId = `req-${firebaseUser.uid.slice(0, 10)}-0042`;
      await setDoc(doc(db, 'sampling_requests', docId), {
        ownerUid: firebaseUser.uid,
        trackingCode: starter.trackingCode,
        companyId: firebaseUser.uid,
        companyName: starter.companyName,
        nibNumber: starter.nibNumber,
        sectorId: starter.sectorId,
        picName: firebaseUser.displayName || starter.picName,
        picEmail: firebaseUser.email || starter.picEmail,
        picPhone: starter.picPhone,
        siteAddress: starter.siteAddress,
        scheduledDate: starter.scheduledDate,
        points: starter.points,
        labSubtotal: starter.labSubtotal,
        transportFee: starter.transportFee,
        ppnAmount: starter.ppnAmount,
        totalEstimatedCost: starter.totalEstimatedCost,
        status: 'SUBMITTED',
        createdAtLabel: starter.createdAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'sampling_requests');
  }
}

export function subscribeUserDirectory(
  isAdmin: boolean,
  onData: (users: DemoUser[]) => void
): Unsubscribe {
  if (!isAdmin) {
    onData([]);
    return () => {};
  }
  const path = 'users';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: DemoUser[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          username: data.username ? String(data.username) : undefined,
          email: String(data.email || ''),
          password: '',
          name: String(data.name || ''),
          roleId: (data.role as PortalRoleId) || 'customer',
          roleTitle: String(data.roleTitle || ''),
          companyName: String(data.companyName || ''),
          nibOrNip: String(data.nibOrNip || ''),
          sectorId: data.sectorId ? String(data.sectorId) : undefined,
          phone: String(data.phone || ''),
          address: String(data.address || ''),
        };
      });
      const roleRank: Record<PortalRoleId, number> = {
        admin: 0,
        technical_manager: 1,
        executive: 2,
        customer: 3,
      };
      items.sort((a, b) => {
        const rankDiff = (roleRank[a.roleId] ?? 9) - (roleRank[b.roleId] ?? 9);
        return rankDiff !== 0 ? rankDiff : a.name.localeCompare(b.name);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeSamplingRequests(
  uid: string,
  isAdmin: boolean,
  onData: (requests: SamplingRequest[]) => void
): Unsubscribe {
  const path = 'sampling_requests';
  const ref = isAdmin
    ? collection(db, path)
    : query(collection(db, path), where('ownerUid', '==', uid));

  return onSnapshot(
    ref,
    (snapshot) => {
      const items: SamplingRequest[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          trackingCode: String(data.trackingCode || ''),
          companyId: String(data.companyId || data.ownerUid || ''),
          companyName: String(data.companyName || ''),
          nibNumber: String(data.nibNumber || ''),
          sectorId: String(data.sectorId || 'tekstil'),
          picName: String(data.picName || ''),
          picEmail: String(data.picEmail || ''),
          picPhone: String(data.picPhone || ''),
          siteAddress: String(data.siteAddress || ''),
          scheduledDate: String(data.scheduledDate || ''),
          points: Array.isArray(data.points) ? data.points : [],
          labSubtotal: Number(data.labSubtotal || 0),
          transportFee: Number(data.transportFee || 0),
          ppnAmount: Number(data.ppnAmount || 0),
          totalEstimatedCost: Number(data.totalEstimatedCost || 0),
          status: data.status || 'SUBMITTED',
          rejectionReason: data.rejectionReason ? String(data.rejectionReason) : undefined,
          createdAt: String(data.createdAtLabel || ''),
          verifiedAt: data.verifiedAt ? String(data.verifiedAt) : undefined,
          verifiedBy: data.verifiedBy ? String(data.verifiedBy) : undefined,
          kajiUlang: data.kajiUlang as KajiUlangReview | undefined,
        };
      });

      items.sort((a, b) => b.trackingCode.localeCompare(a.trackingCode));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeCalendarDays(
  onData: (days: CalendarCapacityDay[]) => void
): Unsubscribe {
  const path = 'calendar_days';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      if (snapshot.empty) {
        onData(INITIAL_CALENDAR_DAYS);
        return;
      }
      const items: CalendarCapacityDay[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          date: String(data.date || d.id),
          dayLabel: String(data.dayLabel || ''),
          dateLabel: String(data.dateLabel || ''),
          maxCapacity: Number(data.maxCapacity || 5),
          isLocked: Boolean(data.isLocked),
          equipmentNote: String(data.equipmentNote || ''),
        };
      });
      items.sort((a, b) => a.date.localeCompare(b.date));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeSamplerTeams(
  onData: (teams: SamplerTeam[]) => void
): Unsubscribe {
  const path = 'sampler_teams';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      if (snapshot.empty) {
        onData(SAMPLER_TEAMS);
        return;
      }
      const items: SamplerTeam[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          name: String(data.name || ''),
          bnspCert: String(data.bnspCert || ''),
          specialization: String(data.specialization || ''),
        };
      });
      items.sort((a, b) => a.id.localeCompare(b.id));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAuditLogs(
  isAdmin: boolean,
  onData: (logs: AuditLogEntry[]) => void
): Unsubscribe {
  if (!isAdmin) {
    onData([]);
    return () => {};
  }
  const path = 'audit_logs';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: AuditLogEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          timestamp: String(data.timestampLabel || ''),
          actorName: String(data.actorName || ''),
          actorRole: String(data.actorRole || ''),
          trackingCode: String(data.trackingCode || ''),
          action: String(data.action || ''),
          detail: String(data.detail || ''),
        };
      });
      items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function createSamplingRequestInDb(
  newReq: SamplingRequest,
  ownerUid: string
): Promise<void> {
  const reqPath = `sampling_requests/${newReq.id}`;
  const logId = `log-${Date.now()}`;

  try {
    await setDoc(doc(db, 'sampling_requests', newReq.id), {
      ownerUid,
      trackingCode: newReq.trackingCode.slice(0, 30),
      companyId: ownerUid,
      companyName: newReq.companyName.slice(0, 200),
      nibNumber: newReq.nibNumber.slice(0, 64),
      sectorId: newReq.sectorId.slice(0, 64),
      picName: newReq.picName.slice(0, 150),
      picEmail: newReq.picEmail.slice(0, 200),
      picPhone: newReq.picPhone.slice(0, 40),
      siteAddress: newReq.siteAddress.slice(0, 350),
      scheduledDate: newReq.scheduledDate,
      points: newReq.points.slice(0, 20),
      labSubtotal: newReq.labSubtotal,
      transportFee: newReq.transportFee,
      ppnAmount: newReq.ppnAmount,
      totalEstimatedCost: newReq.totalEstimatedCost,
      status: 'SUBMITTED',
      createdAtLabel: newReq.createdAt.slice(0, 40),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'audit_logs', logId), {
      actorUid: ownerUid,
      timestampLabel: newReq.createdAt.slice(0, 40),
      actorName: newReq.picName.slice(0, 150),
      actorRole: 'Pelanggan / HSE',
      trackingCode: newReq.trackingCode.slice(0, 30),
      action: 'SUBMITTED',
      detail: `Pengajuan baru (${newReq.points.length} titik sampling) untuk jadwal ${newReq.scheduledDate}.`.slice(
        0,
        500
      ),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, reqPath);
  }
}

export async function resubmitSamplingRequestInDb(
  updatedReq: SamplingRequest,
  actorUid: string
): Promise<void> {
  const ts = formatNowTimestamp();
  const reqPath = `sampling_requests/${updatedReq.id}`;
  const logId = `log-${Date.now()}`;

  try {
    await updateDoc(doc(db, 'sampling_requests', updatedReq.id), {
      companyName: updatedReq.companyName.slice(0, 200),
      nibNumber: updatedReq.nibNumber.slice(0, 64),
      sectorId: updatedReq.sectorId.slice(0, 64),
      picName: updatedReq.picName.slice(0, 150),
      picPhone: updatedReq.picPhone.slice(0, 40),
      siteAddress: updatedReq.siteAddress.slice(0, 350),
      scheduledDate: updatedReq.scheduledDate,
      points: updatedReq.points.slice(0, 20),
      labSubtotal: updatedReq.labSubtotal,
      transportFee: updatedReq.transportFee,
      ppnAmount: updatedReq.ppnAmount,
      totalEstimatedCost: updatedReq.totalEstimatedCost,
      status: 'SUBMITTED',
      rejectionReason: '',
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'audit_logs', logId), {
      actorUid,
      timestampLabel: ts,
      actorName: updatedReq.picName.slice(0, 150),
      actorRole: 'Pelanggan / HSE',
      trackingCode: updatedReq.trackingCode.slice(0, 30),
      action: 'SUBMITTED',
      detail: `Revisi permohonan & jadwal (${updatedReq.points.length} titik sampling) diajukan ulang untuk ${updatedReq.scheduledDate}.`.slice(
        0,
        500
      ),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, reqPath);
  }
}

export async function verifySamplingRequestInDb(
  req: SamplingRequest,
  verifierName: string,
  actorUid: string
): Promise<void> {
  const ts = formatNowTimestamp();
  const reqPath = `sampling_requests/${req.id}`;

  try {
    await updateDoc(doc(db, 'sampling_requests', req.id), {
      status: 'VERIFIED',
      verifiedAt: ts,
      verifiedBy: verifierName.slice(0, 150),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'audit_logs', `log-${Date.now()}`), {
      actorUid,
      timestampLabel: ts,
      actorName: verifierName.slice(0, 150),
      actorRole: 'Admin Lab',
      trackingCode: req.trackingCode.slice(0, 30),
      action: 'VERIFIED',
      detail: `Verifikasi kelengkapan parameter dan penguncian slot kalender ${req.scheduledDate}.`.slice(
        0,
        500
      ),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, reqPath);
  }
}

export async function rejectSamplingRequestInDb(
  req: SamplingRequest,
  reason: string,
  actorName: string,
  actorUid: string,
  actorRole = 'Admin Lab'
): Promise<void> {
  const ts = formatNowTimestamp();
  const reqPath = `sampling_requests/${req.id}`;

  try {
    await updateDoc(doc(db, 'sampling_requests', req.id), {
      status: 'REJECTED',
      rejectionReason: reason.slice(0, 500),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'audit_logs', `log-${Date.now()}`), {
      actorUid,
      timestampLabel: ts,
      actorName: actorName.slice(0, 150),
      actorRole: actorRole.slice(0, 100),
      trackingCode: req.trackingCode.slice(0, 30),
      action: 'REVISION_REQUESTED',
      detail: `Permohonan dikembalikan untuk revisi: ${reason}`.slice(0, 500),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, reqPath);
  }
}

export async function approveKajiUlangInDb(
  req: SamplingRequest,
  review: KajiUlangReview,
  actorUid: string
): Promise<void> {
  const reqPath = `sampling_requests/${req.id}`;
  try {
    await updateDoc(doc(db, 'sampling_requests', req.id), {
      status: 'APPROVED',
      verifiedAt: (req.verifiedAt || review.reviewedAt).slice(0, 40),
      verifiedBy: (req.verifiedBy || review.reviewerName).slice(0, 150),
      kajiUlang: {
        ...review,
        technicalNotes: review.technicalNotes.slice(0, 600),
      },
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'audit_logs', `log-${Date.now()}`), {
      actorUid,
      timestampLabel: review.reviewedAt.slice(0, 40),
      actorName: review.reviewerName.slice(0, 150),
      actorRole: 'Manajer Teknis / Kaji Ulang',
      trackingCode: req.trackingCode.slice(0, 30),
      action: 'ISO_17025_APPROVED',
      detail: `Kaji Ulang Klausul 7.1 disetujui. SPK diterbitkan ke ${review.assignedSamplerName}.`.slice(
        0,
        500
      ),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, reqPath);
  }
}

export async function updateCalendarDayInDb(
  date: string,
  patch: Partial<CalendarCapacityDay>
): Promise<void> {
  const dayPath = `calendar_days/${date}`;
  try {
    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (typeof patch.maxCapacity === 'number') updatePayload.maxCapacity = patch.maxCapacity;
    if (typeof patch.isLocked === 'boolean') updatePayload.isLocked = patch.isLocked;
    if (typeof patch.equipmentNote === 'string') {
      updatePayload.equipmentNote = patch.equipmentNote.slice(0, 250);
    }
    await updateDoc(doc(db, 'calendar_days', date), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, dayPath);
  }
}
