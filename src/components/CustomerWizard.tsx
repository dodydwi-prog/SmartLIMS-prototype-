import { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  LocateFixed,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  INDUSTRY_SECTORS,
  MatrixType,
  REGULATION_PRESETS,
  formatRupiah,
} from '../data/limsPreviewData';
import { formatNowTimestamp } from '../services/limsFirestore';
import {
  CalendarCapacityDay,
  DemoUser,
  SamplingPointItem,
  SamplingRequest,
} from '../types/lims';

interface CustomerWizardProps {
  currentUser: DemoUser;
  calendarDays: CalendarCapacityDay[];
  existingRequests: SamplingRequest[];
  editingRequest?: SamplingRequest | null;
  initialDate?: string | null;
  onSubmitRequest: (newReq: SamplingRequest) => Promise<void> | void;
  onResubmitRequest?: (updatedReq: SamplingRequest) => Promise<void> | void;
  onCancel: () => void;
}

const WIZARD_STEPS = [
  { step: 1, label: 'Profil & PJ' },
  { step: 2, label: 'Tanggal & Kuota' },
  { step: 3, label: 'Titik Sampling' },
  { step: 4, label: 'Baku Mutu' },
  { step: 5, label: 'Ringkasan & Kirim' },
];

const MATRIX_OPTIONS: MatrixType[] = [
  'Air Limbah',
  'Udara Ambien',
  'Emisi Cerobong',
  'Air Bersih',
];

function getDefaultRegulationForMatrix(matrix: MatrixType) {
  return (
    REGULATION_PRESETS.find((r) => r.matrix === matrix) ?? REGULATION_PRESETS[0]
  );
}

function calculatePointCost(regId: string, selectedCodes: string[]): number {
  const reg = REGULATION_PRESETS.find((r) => r.id === regId);
  if (!reg) return 0;
  return reg.parameters
    .filter((p) => selectedCodes.includes(p.code))
    .reduce((sum, p) => sum + p.price, 0);
}

export function CustomerWizard({
  currentUser,
  calendarDays,
  existingRequests,
  editingRequest = null,
  initialDate = null,
  onSubmitRequest,
  onResubmitRequest,
  onCancel,
}: CustomerWizardProps) {
  const isEditMode = Boolean(editingRequest);
  const [step, setStep] = useState<number>(isEditMode ? 2 : 1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locatingPointId, setLocatingPointId] = useState<string | null>(null);

  // Step 1 state
  const [companyName, setCompanyName] = useState(
    editingRequest?.companyName ?? currentUser.companyName
  );
  const [nibNumber, setNibNumber] = useState(
    editingRequest?.nibNumber ?? currentUser.nibOrNip
  );
  const [sectorId, setSectorId] = useState(
    editingRequest?.sectorId ?? currentUser.sectorId ?? 'tekstil'
  );
  const [picName, setPicName] = useState(
    editingRequest?.picName ?? currentUser.name
  );
  const [picPhone, setPicPhone] = useState(
    editingRequest?.picPhone ?? currentUser.phone
  );
  const [siteAddress, setSiteAddress] = useState(
    editingRequest?.siteAddress ?? currentUser.address
  );

  const getUsedSlotsForDate = (date: string) =>
    existingRequests
      .filter(
        (r) =>
          r.scheduledDate === date &&
          r.status !== 'REJECTED' &&
          r.id !== editingRequest?.id
      )
      .reduce((sum, r) => sum + r.points.length, 0);

  // Step 2 state
  const firstAvailableDay = calendarDays.find((day) => {
    const used = getUsedSlotsForDate(day.date);
    return !day.isLocked && day.maxCapacity - used > 0;
  });
  const [scheduledDate, setScheduledDate] = useState<string>(
    editingRequest?.scheduledDate ??
      initialDate ??
      firstAvailableDay?.date ??
      calendarDays[0]?.date ??
      '2026-11-23'
  );

  // Step 3 & 4 state
  const defaultReg = getDefaultRegulationForMatrix('Air Limbah');
  const [points, setPoints] = useState<SamplingPointItem[]>(() =>
    editingRequest && editingRequest.points.length > 0
      ? editingRequest.points.map((pt) => ({
          ...pt,
          selectedParameterCodes: [...pt.selectedParameterCodes],
        }))
      : [
          {
            id: `pt-${Date.now()}`,
            pointName: 'Outlet IPAL Utama',
            matrixType: 'Air Limbah',
            regulationId: defaultReg.id,
            regulationCode: defaultReg.code,
            latitude: '-6.298140',
            longitude: '107.152410',
            selectedParameterCodes: defaultReg.parameters.map((p) => p.code),
            pointCost: calculatePointCost(
              defaultReg.id,
              defaultReg.parameters.map((p) => p.code)
            ),
          },
        ]
  );

  const activeSector =
    INDUSTRY_SECTORS.find((s) => s.id === sectorId) ?? INDUSTRY_SECTORS[0];

  const selectedDayInfo = calendarDays.find((d) => d.date === scheduledDate);
  const selectedDayRemaining = selectedDayInfo
    ? Math.max(0, selectedDayInfo.maxCapacity - getUsedSlotsForDate(selectedDayInfo.date))
    : 0;

  const labSubtotal = points.reduce((sum, pt) => sum + pt.pointCost, 0);
  const transportFee = editingRequest?.transportFee ?? 350000;
  const ppnAmount = Math.round((labSubtotal + transportFee) * 0.11);
  const totalEstimatedCost = labSubtotal + transportFee + ppnAmount;

  const handleAddPoint = () => {
    setStepError(null);
    if (selectedDayInfo && points.length >= selectedDayRemaining) {
      setStepError(
        `Sisa kuota pada ${selectedDayInfo.dateLabel} hanya ${selectedDayRemaining} titik. Kurangi titik atau pilih tanggal lain di Langkah 2.`
      );
      return;
    }
    const reg = getDefaultRegulationForMatrix('Udara Ambien');
    const codes = reg.parameters.map((p) => p.code);
    setPoints((prev) => [
      ...prev,
      {
        id: `pt-${Date.now()}-${prev.length + 1}`,
        pointName: `Titik Sampling #${prev.length + 1}`,
        matrixType: 'Udara Ambien',
        regulationId: reg.id,
        regulationCode: reg.code,
        latitude: '-6.297500',
        longitude: '107.151200',
        selectedParameterCodes: codes,
        pointCost: calculatePointCost(reg.id, codes),
      },
    ]);
  };

  const handleUseDeviceGps = (pointId: string) => {
    if (!navigator.geolocation) {
      setStepError('Browser tidak mendukung fitur Geolocation GPS.');
      return;
    }
    setStepError(null);
    setLocatingPointId(pointId);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setPoints((prev) =>
          prev.map((item) =>
            item.id === pointId ? { ...item, latitude: lat, longitude: lng } : item
          )
        );
        setLocatingPointId(null);
      },
      () => {
        setLocatingPointId(null);
        setStepError(
          'Gagal membaca koordinat GPS perangkat. Pastikan izin lokasi aktif atau isi koordinat secara manual.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleRemovePoint = (id: string) => {
    if (points.length <= 1) return;
    setStepError(null);
    setPoints((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePointMatrix = (id: string, matrix: MatrixType) => {
    const reg = getDefaultRegulationForMatrix(matrix);
    const codes = reg.parameters.map((p) => p.code);
    setPoints((prev) =>
      prev.map((pt) =>
        pt.id === id
          ? {
              ...pt,
              matrixType: matrix,
              regulationId: reg.id,
              regulationCode: reg.code,
              selectedParameterCodes: codes,
              pointCost: calculatePointCost(reg.id, codes),
            }
          : pt
      )
    );
  };

  const handleUpdatePointRegulation = (id: string, regId: string) => {
    const reg = REGULATION_PRESETS.find((r) => r.id === regId);
    if (!reg) return;
    const codes = reg.parameters.map((p) => p.code);
    setPoints((prev) =>
      prev.map((pt) =>
        pt.id === id
          ? {
              ...pt,
              matrixType: reg.matrix,
              regulationId: reg.id,
              regulationCode: reg.code,
              selectedParameterCodes: codes,
              pointCost: calculatePointCost(reg.id, codes),
            }
          : pt
      )
    );
  };

  const handleToggleParam = (pointId: string, paramCode: string) => {
    setPoints((prev) =>
      prev.map((pt) => {
        if (pt.id !== pointId) return pt;
        const exists = pt.selectedParameterCodes.includes(paramCode);
        const nextCodes = exists
          ? pt.selectedParameterCodes.filter((c) => c !== paramCode)
          : [...pt.selectedParameterCodes, paramCode];
        return {
          ...pt,
          selectedParameterCodes: nextCodes,
          pointCost: calculatePointCost(pt.regulationId, nextCodes),
        };
      })
    );
  };

  const validateBeforeSubmit = (): boolean => {
    if (!companyName.trim() || !picName.trim() || !siteAddress.trim()) {
      setStepError('Lengkapi nama perusahaan, penanggung jawab teknis, dan alamat lokasi.');
      return false;
    }
    if (!selectedDayInfo || selectedDayInfo.isLocked || selectedDayRemaining <= 0) {
      setStepError('Pilih tanggal sampling yang masih memiliki sisa kuota tim tersedia.');
      return false;
    }
    if (points.length > selectedDayRemaining) {
      setStepError(
        `Jumlah titik (${points.length}) melebihi sisa kuota tanggal ${selectedDayInfo.dateLabel} (${selectedDayRemaining} slot). Pilih tanggal lain di Langkah 2 atau kurangi titik.`
      );
      return false;
    }
    const invalidPoint = points.find(
      (p) => !p.pointName.trim() || !p.latitude.trim() || !p.longitude.trim()
    );
    if (invalidPoint) {
      setStepError('Pastikan setiap titik memiliki nama titik dan koordinat GPS yang lengkap.');
      return false;
    }
    const emptyParamPoint = points.find((p) => p.selectedParameterCodes.length === 0);
    if (emptyParamPoint) {
      setStepError(
        `Pilih minimal 1 parameter uji untuk titik "${emptyParamPoint.pointName}".`
      );
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setStepError(null);

    if (step === 1) {
      if (!companyName.trim() || !picName.trim() || !siteAddress.trim()) {
        setStepError('Lengkapi nama perusahaan, penanggung jawab teknis, dan alamat lokasi.');
        return;
      }
    }

    if (step === 2) {
      if (!selectedDayInfo || selectedDayInfo.isLocked || selectedDayRemaining <= 0) {
        setStepError('Pilih tanggal sampling yang masih memiliki sisa kuota tim tersedia.');
        return;
      }
      if (points.length > selectedDayRemaining) {
        setStepError(
          `Permohonan ini memiliki ${points.length} titik, sedangkan sisa kuota tanggal ${selectedDayInfo.dateLabel} hanya ${selectedDayRemaining} slot.`
        );
        return;
      }
    }

    if (step === 3) {
      const invalidPoint = points.find(
        (p) => !p.pointName.trim() || !p.latitude.trim() || !p.longitude.trim()
      );
      if (invalidPoint) {
        setStepError('Pastikan setiap titik memiliki nama titik dan koordinat GPS yang lengkap.');
        return;
      }
      if (selectedDayInfo && points.length > selectedDayRemaining) {
        setStepError(
          `Jumlah titik (${points.length}) melebihi sisa kuota tanggal ${selectedDayInfo.dateLabel} (${selectedDayRemaining} slot).`
        );
        return;
      }
    }

    if (step === 4) {
      const emptyParamPoint = points.find((p) => p.selectedParameterCodes.length === 0);
      if (emptyParamPoint) {
        setStepError(
          `Pilih minimal 1 parameter uji untuk titik "${emptyParamPoint.pointName}".`
        );
        return;
      }
    }

    setStep((s) => Math.min(5, s + 1));
  };

  const handleFinalSubmit = async () => {
    setStepError(null);
    if (!validateBeforeSubmit()) return;

    setIsSubmitting(true);
    try {
      if (editingRequest && onResubmitRequest) {
        const updatedReq: SamplingRequest = {
          ...editingRequest,
          companyName: companyName.trim(),
          nibNumber: nibNumber.trim(),
          sectorId,
          picName: picName.trim(),
          picPhone: picPhone.trim(),
          siteAddress: siteAddress.trim(),
          scheduledDate,
          points,
          labSubtotal,
          transportFee,
          ppnAmount,
          totalEstimatedCost,
          status: 'SUBMITTED',
          rejectionReason: undefined,
        };
        await onResubmitRequest(updatedReq);
        return;
      }

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const ym = `${now.getFullYear()}${pad(now.getMonth() + 1)}`;
      const existingMax = existingRequests.reduce((max, r) => {
        const parts = r.trackingCode.split('-');
        const num = Number(parts[2] || 0);
        return Number.isFinite(num) && num > max ? num : max;
      }, 42);
      const nextNum = existingMax + 1;
      const trackingCode = `SMP-${ym}-${String(nextNum).padStart(4, '0')}`;
      const timestamp = formatNowTimestamp();

      const newReq: SamplingRequest = {
        id: `req-${Date.now()}`,
        trackingCode,
        companyId: currentUser.id,
        companyName: companyName.trim(),
        nibNumber: nibNumber.trim(),
        sectorId,
        picName: picName.trim(),
        picEmail: currentUser.email,
        picPhone: picPhone.trim(),
        siteAddress: siteAddress.trim(),
        scheduledDate,
        points,
        labSubtotal,
        transportFee,
        ppnAmount,
        totalEstimatedCost,
        status: 'SUBMITTED',
        createdAt: timestamp,
      };

      await onSubmitRequest(newReq);
    } catch (err) {
      setStepError(
        err instanceof Error
          ? `Gagal menyimpan permohonan ke database: ${err.message}`
          : 'Gagal mengirim permohonan. Periksa koneksi Anda dan coba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {editingRequest && editingRequest.rejectionReason && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs text-rose-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              Catatan Revisi Laboratorium ({editingRequest.trackingCode}):
            </p>
            <p className="mt-0.5">{editingRequest.rejectionReason}</p>
            <p className="mt-1.5 text-rose-700">
              Silakan sesuaikan tanggal jadwal, titik koordinat, atau parameter di bawah ini, lalu
              klik <span className="font-semibold">Kirim Revisi Permohonan</span> pada Langkah 5.
            </p>
          </div>
        </div>
      )}

      {/* Wizard Header & Stepper */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              {isEditMode
                ? `Revisi Jadwal & Permohonan (${editingRequest?.trackingCode})`
                : 'Buat Permohonan Pengambilan Contoh Uji'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {isEditMode
                ? 'Perbarui jadwal sampling, titik lokasi, atau parameter uji lalu ajukan kembali ke antrean verifikasi Admin.'
                : 'Lengkapi 5 langkah pengajuan untuk menerbitkan kode tracking dan draf SPH otomatis.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="min-h-[38px] rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            Batal &amp; Kembali
          </button>
        </div>

        {/* 5-Step Progress Indicator */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {WIZARD_STEPS.map((item) => {
            const isActive = item.step === step;
            const isCompleted = item.step < step;
            const canClick = isEditMode || item.step <= step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  if (canClick) {
                    setStepError(null);
                    setStep(item.step);
                  }
                }}
                disabled={!canClick}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : isCompleted || isEditMode
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 cursor-pointer hover:bg-emerald-100/60'
                      : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950'
                      : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : item.step}
                </span>
                <span className="truncate font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Langkah 1: Data Profil Perusahaan &amp; Penanggung Jawab Teknis
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Data badan usaha diklaim otomatis dari profil terdaftar dan dapat disesuaikan untuk
                lokasi pabrik yang berbeda.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nama Perusahaan / Instansi
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  NIB / NPWP Badan Usaha
                </label>
                <input
                  type="text"
                  value={nibNumber}
                  onChange={(e) => setNibNumber(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 px-3.5 font-mono text-sm text-slate-900 focus:border-cyan-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Sektor Industri
                </label>
                <select
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none"
                >
                  {INDUSTRY_SECTORS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nama Penanggung Jawab (HSE)
                </label>
                <input
                  type="text"
                  value={picName}
                  onChange={(e) => setPicName(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nomor Telepon / WhatsApp Lapangan
                </label>
                <input
                  type="text"
                  value={picPhone}
                  onChange={(e) => setPicPhone(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 px-3.5 font-mono text-sm text-slate-900 focus:border-cyan-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Alamat Lokasi Sampling
                </label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className="mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Langkah 2: Pilih Tanggal Sampling &amp; Cek Kuota Tim Lapangan
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Kuota diperbarui secara real-time berdasarkan jadwal tim pengambil contoh uji
                bersertifikat BNSP.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {calendarDays.map((day) => {
                const used = getUsedSlotsForDate(day.date);
                const remaining = Math.max(0, day.maxCapacity - used);
                const unavailable = day.isLocked || remaining === 0;
                const isSelected = scheduledDate === day.date;

                return (
                  <button
                    key={day.date}
                    type="button"
                    disabled={unavailable}
                    onClick={() => setScheduledDate(day.date)}
                    className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-colors ${
                      unavailable
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : isSelected
                          ? 'border-cyan-600 bg-cyan-50/70 text-slate-900 cursor-pointer'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        <span className="font-display text-sm font-bold">{day.dateLabel}</span>
                      </div>
                      <span
                        className={`font-mono text-xs font-semibold ${
                          day.isLocked
                            ? 'text-slate-500'
                            : remaining === 0
                              ? 'text-rose-600'
                              : 'text-emerald-700'
                        }`}
                      >
                        {day.isLocked
                          ? 'Terkunci'
                          : remaining === 0
                            ? 'Penuh'
                            : `${remaining}/${day.maxCapacity} Slot`}
                      </span>
                    </div>
                    <p className="mt-2.5 text-xs text-slate-500">{day.equipmentNote}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Langkah 3: Konfigurasi Titik Sampling Dinamis &amp; Koordinat GPS
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Tambahkan titik lokasi pengambilan contoh uji sesuai rencana pemantauan lingkungan
                  Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddPoint}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tambah Titik</span>
              </button>
            </div>

            <div className="space-y-4">
              {points.map((pt, idx) => (
                <div
                  key={pt.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-cyan-600" aria-hidden="true" />
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        Titik #{idx + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleUseDeviceGps(pt.id)}
                        disabled={locatingPointId === pt.id}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-60"
                      >
                        <LocateFixed className="h-3 w-3 text-cyan-700" aria-hidden="true" />
                        <span>
                          {locatingPointId === pt.id ? 'Mencari GPS...' : 'Ambil GPS Perangkat'}
                        </span>
                      </button>
                      {points.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePoint(pt.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        Nama Titik Sampling
                      </label>
                      <input
                        type="text"
                        value={pt.pointName}
                        onChange={(e) =>
                          setPoints((prev) =>
                            prev.map((item) =>
                              item.id === pt.id ? { ...item, pointName: e.target.value } : item
                            )
                          )
                        }
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        Matriks Contoh Uji
                      </label>
                      <select
                        value={pt.matrixType}
                        onChange={(e) =>
                          handleUpdatePointMatrix(pt.id, e.target.value as MatrixType)
                        }
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-cyan-600 focus:outline-none"
                      >
                        {MATRIX_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        Latitude (GPS)
                      </label>
                      <input
                        type="text"
                        value={pt.latitude}
                        onChange={(e) =>
                          setPoints((prev) =>
                            prev.map((item) =>
                              item.id === pt.id ? { ...item, latitude: e.target.value } : item
                            )
                          )
                        }
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-cyan-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        Longitude (GPS)
                      </label>
                      <input
                        type="text"
                        value={pt.longitude}
                        onChange={(e) =>
                          setPoints((prev) =>
                            prev.map((item) =>
                              item.id === pt.id ? { ...item, longitude: e.target.value } : item
                            )
                          )
                        }
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-cyan-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Langkah 4: Pemilihan Baku Mutu &amp; Parameter Uji Otomatis
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Memilih regulasi baku mutu otomatis mengikat daftar parameter SNI beserta tarif
                  resminya.
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-900">
                Rekomendasi Sektor ({activeSector.label}):{' '}
                <span className="font-semibold">{activeSector.extraParam}</span>
              </div>
            </div>

            <div className="space-y-6">
              {points.map((pt, idx) => {
                const reg =
                  REGULATION_PRESETS.find((r) => r.id === pt.regulationId) ??
                  REGULATION_PRESETS[0];
                return (
                  <div key={pt.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <p className="font-display text-sm font-bold text-slate-900">
                          {idx + 1}. {pt.pointName}
                        </p>
                        <p className="text-xs text-slate-500">
                          Matriks: {pt.matrixType} · Koordinat{' '}
                          <span className="font-mono">
                            {pt.latitude}, {pt.longitude}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          value={pt.regulationId}
                          onChange={(e) => handleUpdatePointRegulation(pt.id, e.target.value)}
                          className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-cyan-600 focus:outline-none"
                        >
                          {REGULATION_PRESETS.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.code} — {r.matrix}
                            </option>
                          ))}
                        </select>
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {formatRupiah(pt.pointCost)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {reg.parameters.map((param) => {
                        const checked = pt.selectedParameterCodes.includes(param.code);
                        return (
                          <button
                            key={param.code}
                            type="button"
                            onClick={() => handleToggleParam(pt.id, param.code)}
                            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                              checked
                                ? 'border-slate-300 bg-slate-50 text-slate-900'
                                : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  checked
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-slate-300'
                                }`}
                              >
                                {checked && <Check className="h-3 w-3" />}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{param.name}</p>
                                <p className="truncate font-mono text-[11px] text-slate-500">
                                  {param.method} · BM: {param.limit}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono font-semibold text-slate-800 shrink-0">
                              {formatRupiah(param.price)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Langkah 5: Ringkasan Permohonan &amp; Estimasi Biaya Penawaran (SPH)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Tinjau kembali seluruh titik sampling, regulasi, dan rincian biaya sebelum mengirim
                ke antrean verifikasi Admin Laboratorium.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-3">
              <div>
                <p className="text-slate-500">Perusahaan Pemohon</p>
                <p className="mt-0.5 font-semibold text-slate-900">{companyName}</p>
                <p className="font-mono text-slate-600">NIB: {nibNumber}</p>
              </div>
              <div>
                <p className="text-slate-500">PJ Lapangan &amp; Lokasi</p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {picName} ({picPhone})
                </p>
                <p className="text-slate-600">{siteAddress}</p>
              </div>
              <div>
                <p className="text-slate-500">Tanggal Jadwal Dipilih</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-cyan-700">
                  {scheduledDate}
                </p>
                <p className="text-slate-600">{points.length} Titik Sampling</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                    <th className="px-4 py-3">Titik Sampling</th>
                    <th className="px-4 py-3">Regulasi &amp; Matriks</th>
                    <th className="px-4 py-3">Jumlah Parameter</th>
                    <th className="px-4 py-3 text-right">Subtotal Titik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {points.map((pt, i) => (
                    <tr key={pt.id}>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {i + 1}. {pt.pointName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {pt.regulationCode} ({pt.matrixType})
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {pt.selectedParameterCodes.length} parameter
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        {formatRupiah(pt.pointCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <dl className="w-full max-w-sm space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Subtotal Pengujian Laboratorium</dt>
                  <dd className="font-mono font-semibold text-slate-900">
                    {formatRupiah(labSubtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Biaya Mobilisasi &amp; Akomodasi Tim</dt>
                  <dd className="font-mono font-semibold text-slate-900">
                    {formatRupiah(transportFee)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">PPN 11%</dt>
                  <dd className="font-mono font-semibold text-slate-900">
                    {formatRupiah(ppnAmount)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
                  <dt>Total Estimasi Biaya (Draf SPH)</dt>
                  <dd className="font-mono">{formatRupiah(totalEstimatedCost)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {stepError && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800"
          >
            {stepError}
          </div>
        )}

        {/* Wizard Bottom Actions */}
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={() => {
              setStepError(null);
              if (step === 1) {
                onCancel();
              } else {
                setStep((s) => s - 1);
              }
            }}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{step === 1 ? 'Kembali ke Dashboard' : 'Langkah Sebelumnya'}</span>
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
            >
              <span>Lanjut ke Langkah {step + 1}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>
                {isSubmitting
                  ? 'Menyimpan ke Database...'
                  : isEditMode
                    ? 'Kirim Revisi Permohonan'
                    : 'Kirim Permohonan Sampling'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
