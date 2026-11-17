import { MatrixType, PortalRoleId } from '../data/limsPreviewData';

export type RequestStatus = 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'REJECTED';

export interface DemoUser {
  id: string;
  username?: string;
  email: string;
  password: string;
  name: string;
  roleId: PortalRoleId;
  roleTitle: string;
  companyName: string;
  nibOrNip: string;
  sectorId?: string;
  phone: string;
  address: string;
}

export interface SamplingPointItem {
  id: string;
  pointName: string;
  matrixType: MatrixType;
  regulationId: string;
  regulationCode: string;
  latitude: string;
  longitude: string;
  selectedParameterCodes: string[];
  pointCost: number;
}

export interface KajiUlangReview {
  methodAvailable: boolean;
  equipmentCalibrated: boolean;
  consumablesReady: boolean;
  personnelCompetent: boolean;
  assignedSamplerId: string;
  assignedSamplerName: string;
  reviewerName: string;
  reviewedAt: string;
  technicalNotes: string;
  decision: 'PASS' | 'FAIL';
}

export interface SamplingRequest {
  id: string;
  trackingCode: string;
  companyId: string;
  companyName: string;
  nibNumber: string;
  sectorId: string;
  picName: string;
  picEmail: string;
  picPhone: string;
  siteAddress: string;
  scheduledDate: string;
  points: SamplingPointItem[];
  labSubtotal: number;
  transportFee: number;
  ppnAmount: number;
  totalEstimatedCost: number;
  status: RequestStatus;
  rejectionReason?: string;
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  kajiUlang?: KajiUlangReview;
}

export interface SamplerTeam {
  id: string;
  name: string;
  bnspCert: string;
  specialization: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  trackingCode: string;
  action: string;
  detail: string;
}

export interface CalendarCapacityDay {
  date: string;
  dayLabel: string;
  dateLabel: string;
  maxCapacity: number;
  isLocked: boolean;
  equipmentNote: string;
}
