import { useState } from 'react';
import { Check, Download, Printer, X } from 'lucide-react';
import { SAMPLER_TEAMS } from '../data/limsMockDatabase';
import { REGULATION_PRESETS, formatRupiah } from '../data/limsPreviewData';
import {
  downloadKajiUlangPdf,
  downloadSphPdf,
  downloadSpkPdf,
} from '../services/pdfReports';
import { SamplingRequest } from '../types/lims';

export type LimsDocumentType = 'sph' | 'kaji-ulang' | 'spk';

interface DocumentModalProps {
  request: SamplingRequest;
  docType: LimsDocumentType;
  onClose: () => void;
}

function DeterministicQrSvg({ seed }: { seed: string }) {
  const size = 7;
  const cells: boolean[] = [];
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isCorner =
        (r < 2 && c < 2) || (r < 2 && c >= size - 2) || (r >= size - 2 && c < 2);
      const bit = isCorner || ((hash >> ((r * size + c) % 24)) & 1) === 1;
      cells.push(bit);
    }
  }

  return (
    <svg
      width="68"
      height="68"
      viewBox="0 0 70 70"
      role="img"
      aria-label={`QR Validasi ${seed}`}
      className="border border-slate-300 bg-white p-1"
    >
      {cells.map((filled, idx) => {
        if (!filled) return null;
        const r = Math.floor(idx / size);
        const c = idx % size;
        return (
          <rect
            key={idx}
            x={c * 10}
            y={r * 10}
            width="9"
            height="9"
            fill="#0F172A"
          />
        );
      })}
    </svg>
  );
}

export function DocumentModal({ request, docType, onClose }: DocumentModalProps) {
  const [activeDocType, setActiveDocType] = useState<LimsDocumentType>(docType);
  const [downloadedBanner, setDownloadedBanner] = useState(false);

  const shortRef = request.trackingCode.replace('SMP-', '');
  const docCode =
    activeDocType === 'sph'
      ? `SPH/LIMS/${shortRef}`
      : activeDocType === 'kaji-ulang'
        ? `KUP-17025/${shortRef}`
        : `SPK/SMP/${shortRef}`;

  const docTitle =
    activeDocType === 'sph'
      ? request.status === 'APPROVED'
        ? 'Surat Penawaran Harga (SPH Final)'
        : 'Draf Surat Penawaran Harga (SPH)'
      : activeDocType === 'kaji-ulang'
        ? 'Formulir Kaji Ulang Permintaan (ISO/IEC 17025:2017 Klausul 7.1)'
        : 'Surat Perintah Kerja Pengambilan Contoh Uji (SPK Sampling)';

  const assignedTeam = SAMPLER_TEAMS.find(
    (t) => t.id === request.kajiUlang?.assignedSamplerId
  );

  const handleDownloadPdf = () => {
    if (activeDocType === 'sph') {
      downloadSphPdf(request);
    } else if (activeDocType === 'kaji-ulang') {
      downloadKajiUlangPdf(request);
    } else {
      downloadSpkPdf(request);
    }
    setDownloadedBanner(true);
    window.setTimeout(() => setDownloadedBanner(false), 2400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Modal Header (Hidden on print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="min-w-0">
            <h2 id="doc-modal-title" className="font-display text-base font-bold text-slate-900">
              {docTitle}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-slate-500">
              No. Dokumen: {docCode} · Ref: {request.trackingCode}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Document Switcher */}
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              {(
                [
                  { id: 'sph', label: 'SPH' },
                  { id: 'kaji-ulang', label: 'Kaji Ulang 7.1' },
                  { id: 'spk', label: 'SPK Sampling' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDocType(tab.id)}
                  className={`rounded-md px-2.5 py-1.5 font-medium transition-colors cursor-pointer ${
                    activeDocType === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {downloadedBanner ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span>PDF Diunduh</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>Unduh PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cetak</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau dokumen"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="printable-document-area" className="overflow-y-auto p-6 sm:p-8">
          {/* Letterhead */}
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
            <div>
              <p className="font-display text-lg font-bold text-slate-900">
                SmartLIMS — Balai Laboratorium Lingkungan
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Terakreditasi Komite Akreditasi Nasional (KAN) · ISO/IEC 17025:2017
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Jl. Sains &amp; Teknologi Kav. 4, Serpong, Tangerang Selatan
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-mono text-xs font-semibold text-slate-900">{docCode}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Tanggal Terbit: {request.createdAt.split(' ')[0]}
                </p>
              </div>
              <DeterministicQrSvg seed={docCode} />
            </div>
          </div>

          {/* Client Identity */}
          <div className="mt-6 grid grid-cols-1 gap-4 border-b border-slate-200 pb-6 text-xs sm:grid-cols-2">
            <div>
              <p className="font-semibold text-slate-500">
                {activeDocType === 'spk' ? 'Lokasi Sampling Pelanggan' : 'Kepada Yth. Pelanggan'}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">{request.companyName}</p>
              {request.nibNumber && (
                <p className="mt-0.5 font-mono text-slate-600">NIB/NPWP: {request.nibNumber}</p>
              )}
              <p className="mt-0.5 text-slate-600">{request.siteAddress}</p>
            </div>
            <div className="sm:text-right">
              <p className="font-semibold text-slate-500">Detail Penanggung Jawab &amp; Jadwal</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{request.picName}</p>
              <p className="mt-0.5 text-slate-600">
                {request.picEmail} · {request.picPhone}
              </p>
              <p className="mt-0.5 font-mono text-slate-700">
                Jadwal Sampling: {request.scheduledDate}
              </p>
            </div>
          </div>

          {activeDocType === 'sph' && (
            /* SPH Breakdown */
            <div className="mt-6">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Rincian Jasa Pengambilan Contoh Uji &amp; Pengujian Parameter
              </h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                      <th className="px-4 py-2.5">Titik Sampling &amp; Matriks</th>
                      <th className="px-4 py-2.5">Acuan Baku Mutu</th>
                      <th className="px-4 py-2.5">Parameter Terpilih</th>
                      <th className="px-4 py-2.5 text-right">Biaya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {request.points.map((pt, idx) => {
                      const reg = REGULATION_PRESETS.find((r) => r.id === pt.regulationId);
                      const paramNames = pt.selectedParameterCodes
                        .map(
                          (code) =>
                            reg?.parameters.find((p) => p.code === code)?.code ?? code
                        )
                        .join(', ');
                      return (
                        <tr key={pt.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {idx + 1}. {pt.pointName}
                            </p>
                            <p className="mt-0.5 text-slate-500">
                              {pt.matrixType} ·{' '}
                              <span className="font-mono">
                                {pt.latitude}, {pt.longitude}
                              </span>
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">
                            {pt.regulationCode}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">{paramNames}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                            {formatRupiah(pt.pointCost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
                <div className="max-w-sm text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-900">Ketentuan Penawaran:</p>
                  <p>1. Masa berlaku penawaran adalah 14 hari kalender sejak tanggal terbit.</p>
                  <p>2. Jadwal lapangan dikunci setelah verifikasi berkas &amp; Kaji Ulang 17025.</p>
                  {request.verifiedBy && (
                    <p className="pt-1 font-mono font-semibold text-emerald-700">
                      Terverifikasi oleh: {request.verifiedBy} ({request.verifiedAt})
                    </p>
                  )}
                </div>

                <dl className="w-full max-w-xs space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Subtotal Pengujian Parameter</dt>
                    <dd className="font-mono font-medium text-slate-900">
                      {formatRupiah(request.labSubtotal)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Biaya Mobilisasi &amp; Akomodasi Tim</dt>
                    <dd className="font-mono font-medium text-slate-900">
                      {formatRupiah(request.transportFee)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600">PPN 11%</dt>
                    <dd className="font-mono font-medium text-slate-900">
                      {formatRupiah(request.ppnAmount)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
                    <dt>Total Estimasi Penawaran</dt>
                    <dd className="font-mono">{formatRupiah(request.totalEstimatedCost)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {activeDocType === 'kaji-ulang' && (
            /* Kaji Ulang ISO 17025 Breakdown */
            <div className="mt-6 space-y-5">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Hasil Evaluasi Kelayakan Teknis Laboratorium (Klausul 7.1)
              </h3>

              {request.kajiUlang ? (
                <>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                          <th className="px-4 py-2.5">Aspek Kaji Ulang ISO/IEC 17025</th>
                          <th className="px-4 py-2.5 text-right">Status Kelayakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-2.5 text-slate-800">
                            1. Ketersediaan &amp; kesesuaian metode uji acuan (SNI / APHA)
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700">
                            {request.kajiUlang.methodAvailable ? 'MEMENUHI' : 'TIDAK MEMENUHI'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-slate-800">
                            2. Ketersediaan &amp; status kalibrasi instrumen sampling lapangan
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700">
                            {request.kajiUlang.equipmentCalibrated ? 'TERKALIBRASI' : 'BELUM SIAP'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-slate-800">
                            3. Kesiapan bahan habis pakai, wadah steril, &amp; pengawet sampel
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700">
                            {request.kajiUlang.consumablesReady ? 'TERSEDIA' : 'TERBATAS'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-slate-800">
                            4. Kompetensi &amp; sertifikasi BNSP petugas pengambil contoh
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700">
                            {request.kajiUlang.personnelCompetent ? 'KOMPETEN' : 'TIDAK TERSEDIA'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
                    <p className="font-semibold text-slate-900">
                      Penugasan Surat Perintah Kerja (SPK) &amp; Catatan Teknis
                    </p>
                    <p className="mt-1 text-slate-700">
                      Tim Sampler Bertugas:{' '}
                      <span className="font-semibold">{request.kajiUlang.assignedSamplerName}</span>
                    </p>
                    <p className="mt-1 text-slate-600">{request.kajiUlang.technicalNotes}</p>
                    <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-3 font-mono text-slate-500">
                      <span>Peninjau: {request.kajiUlang.reviewerName}</span>
                      <span>Disahkan: {request.kajiUlang.reviewedAt}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-xs text-slate-600">
                  Dokumen Kaji Ulang Permintaan belum disahkan. Permohonan saat ini berada pada
                  status <span className="font-mono font-semibold">{request.status}</span> dan
                  menunggu penyelesaian kaji ulang teknis oleh Admin / Manajer Teknis Laboratorium.
                </div>
              )}
            </div>
          )}

          {activeDocType === 'spk' && (
            /* Surat Perintah Kerja Sampling (SPK) */
            <div className="mt-6 space-y-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-500">Tim Sampler Lapangan (BNSP)</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {request.kajiUlang?.assignedSamplerName ||
                        'Menunggu Penugasan Manajer Teknis'}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-mono font-semibold text-cyan-700">
                      {assignedTeam?.bnspCert ?? 'BNSP Terverifikasi'}
                    </p>
                    <p className="mt-0.5 text-slate-600">
                      {assignedTeam?.specialization ?? 'Sampling Lingkungan Terpadu'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Daftar Titik Eksekusi &amp; Checklist Chain of Custody (CoC)
                </h3>
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                        <th className="px-4 py-2.5">Titik &amp; Koordinat GPS</th>
                        <th className="px-4 py-2.5">Matriks &amp; Regulasi</th>
                        <th className="px-4 py-2.5">Parameter Target</th>
                        <th className="px-4 py-2.5">Checklist Lapangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {request.points.map((pt, idx) => (
                        <tr key={pt.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {idx + 1}. {pt.pointName}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                              GPS: {pt.latitude}, {pt.longitude}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-800">{pt.matrixType}</p>
                            <p className="font-mono text-[11px] text-slate-500">
                              {pt.regulationCode}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">
                            {pt.selectedParameterCodes.join(', ')}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-600 space-y-0.5">
                            <p>[ ] Wadah Steril &amp; Pengawet</p>
                            <p>[ ] Segel CoC &amp; Foto Geotag</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2 text-xs sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-[11px] font-semibold text-slate-500">
                    Disahkan oleh Manajer Teknis
                  </p>
                  <p className="mt-6 font-semibold text-slate-900">
                    {request.kajiUlang?.reviewerName || 'Manajer Teknis Lab'}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500">
                    {request.kajiUlang?.reviewedAt || 'Menunggu Pengesahan'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-[11px] font-semibold text-slate-500">
                    Petugas Pengambil Contoh (PPC)
                  </p>
                  <p className="mt-6 font-semibold text-slate-900">
                    {request.kajiUlang?.assignedSamplerName.split('—')[1]?.trim() ||
                      'Tim Lapangan'}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500">
                    {assignedTeam?.bnspCert ?? 'Sertifikat BNSP'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-[11px] font-semibold text-slate-500">
                    Saksi Lapangan (PIC HSE)
                  </p>
                  <p className="mt-6 font-semibold text-slate-900">{request.picName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{request.companyName}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
