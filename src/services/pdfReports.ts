import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SAMPLER_TEAMS, STATUS_META } from '../data/limsMockDatabase';
import { REGULATION_PRESETS, formatRupiah } from '../data/limsPreviewData';
import {
  AuditLogEntry,
  CalendarCapacityDay,
  SamplingRequest,
} from '../types/lims';

function getLastTableY(doc: jsPDF, fallback: number): number {
  const internal = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return internal.lastAutoTable?.finalY ?? fallback;
}

function drawDeterministicQr(
  doc: jsPDF,
  seed: string,
  x: number,
  y: number,
  totalSizeMm = 18
) {
  const grid = 7;
  const cell = totalSizeMm / grid;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.rect(x - 1, y - 1, totalSizeMm + 2, totalSizeMm + 2, 'FD');

  doc.setFillColor(15, 23, 42);
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const isCorner =
        (r < 2 && c < 2) || (r < 2 && c >= grid - 2) || (r >= grid - 2 && c < 2);
      const bit = isCorner || ((hash >> ((r * grid + c) % 24)) & 1) === 1;
      if (bit) {
        doc.rect(x + c * cell, y + r * cell, cell * 0.9, cell * 0.9, 'F');
      }
    }
  }
}

function drawLetterhead(
  doc: jsPDF,
  title: string,
  docCode: string,
  issuedDate: string,
  qrSeed: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Navy Accent Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 6, pageWidth, 1.5, 'F');

  // Lab Brand & Accreditation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('SmartLIMS — Balai Laboratorium Lingkungan', 14, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Terakreditasi Komite Akreditasi Nasional (KAN) · ISO/IEC 17025:2017', 14, 22);
  doc.text('Jl. Sains & Teknologi Kav. 4, Serpong, Tangerang Selatan · Telp (021) 5550-1702', 14, 26.5);

  // Right Document Meta + QR
  drawDeterministicQr(doc, qrSeed, pageWidth - 32, 12, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(docCode, pageWidth - 36, 17, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tanggal: ${issuedDate}`, pageWidth - 36, 22, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 32, pageWidth - 14, 32);

  // Document Title Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 39);

  return 44;
}

function addPageFooters(doc: jsPDF, footerTag: string) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `SmartLIMS Enterprise · ${footerTag} · Dokumen dihasilkan otomatis secara digital`,
      14,
      pageHeight - 9
    );
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 14, pageHeight - 9, {
      align: 'right',
    });
  }
}

function formatNowDateLabel(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function downloadSphPdf(request: SamplingRequest): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const docCode = `SPH/LIMS/${request.trackingCode.replace('SMP-', '')}`;
  const isFinal = request.status === 'APPROVED';
  const title = isFinal
    ? 'SURAT PENAWARAN HARGA (SPH FINAL)'
    : 'DRAF SURAT PENAWARAN HARGA (SPH)';

  let y = drawLetterhead(
    doc,
    title,
    docCode,
    request.createdAt.split(' ')[0] || formatNowDateLabel(),
    docCode
  );

  // Status badge text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(isFinal ? 16 : 8, isFinal ? 185 : 145, isFinal ? 129 : 178);
  doc.text(`Ref. Tracking: ${request.trackingCode} · Status: ${STATUS_META[request.status].label}`, 14, y);
  y += 6;

  // Two-column client info box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('KEPADA YTH. PELANGGAN', 18, y + 5.5);
  doc.text('PENANGGUNG JAWAB & JADWAL', pageWidth / 2 + 4, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(request.companyName, 18, y + 11);
  doc.text(request.picName, pageWidth / 2 + 4, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIB/NPWP: ${request.nibNumber}`, 18, y + 16);
  const addrLines = doc.splitTextToSize(request.siteAddress, pageWidth / 2 - 26);
  doc.text(addrLines.slice(0, 2), 18, y + 20.5);

  doc.text(`${request.picEmail} · ${request.picPhone}`, pageWidth / 2 + 4, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Jadwal Sampling: ${request.scheduledDate}`, pageWidth / 2 + 4, y + 21);

  y += 34;

  // Points & Parameters table
  const rows = request.points.map((pt, idx) => {
    const reg = REGULATION_PRESETS.find((r) => r.id === pt.regulationId);
    const paramDetail = pt.selectedParameterCodes
      .map((code) => {
        const param = reg?.parameters.find((p) => p.code === code);
        return param ? `${param.code} (${param.method})` : code;
      })
      .join(', ');

    return [
      `${idx + 1}`,
      `${pt.pointName}\n${pt.matrixType}\nGPS: ${pt.latitude}, ${pt.longitude}`,
      pt.regulationCode,
      paramDetail,
      formatRupiah(pt.pointCost),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['No', 'Titik Sampling & Matriks', 'Regulasi Baku Mutu', 'Parameter & Metode SNI', 'Biaya']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.8,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 46 },
      2: { cellWidth: 32 },
      3: { cellWidth: 64 },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  y = getLastTableY(doc, y + 30) + 6;

  // Check space before totals
  if (y > 235) {
    doc.addPage();
    y = 20;
  }

  // Cost Summary Box
  const summaryWidth = 84;
  const summaryX = pageWidth - 14 - summaryWidth;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, y, summaryWidth, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal Pengujian Parameter', summaryX + 4, y + 6.5);
  doc.text(formatRupiah(request.labSubtotal), summaryX + summaryWidth - 4, y + 6.5, {
    align: 'right',
  });

  doc.text('Biaya Mobilisasi & Akomodasi', summaryX + 4, y + 12.5);
  doc.text(formatRupiah(request.transportFee), summaryX + summaryWidth - 4, y + 12.5, {
    align: 'right',
  });

  doc.text('PPN 11%', summaryX + 4, y + 18.5);
  doc.text(formatRupiah(request.ppnAmount), summaryX + summaryWidth - 4, y + 18.5, {
    align: 'right',
  });

  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX + 4, y + 21.5, summaryX + summaryWidth - 4, y + 21.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Estimasi Penawaran', summaryX + 4, y + 27);
  doc.text(formatRupiah(request.totalEstimatedCost), summaryX + summaryWidth - 4, y + 27, {
    align: 'right',
  });

  // Left side terms & signature note
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Ketentuan Penawaran:', 14, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  const terms = [
    '1. Masa berlaku penawaran adalah 14 hari kalender sejak tanggal terbit.',
    '2. Pelaksanaan sampling mengikuti hasil Kaji Ulang ISO/IEC 17025 Klausul 7.1.',
    '3. Jadwal resmi dikunci setelah verifikasi berkas oleh Admin Laboratorium.',
  ];
  doc.text(terms, 14, y + 10.5);

  if (request.verifiedBy) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(
      `Diverifikasi oleh: ${request.verifiedBy} (${request.verifiedAt ?? '-'})`,
      14,
      y + 27
    );
  }

  addPageFooters(doc, docCode);
  doc.save(`${isFinal ? 'SPH_FINAL' : 'DRAF_SPH'}_${request.trackingCode}.pdf`);
}

export function downloadKajiUlangPdf(request: SamplingRequest): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const docCode = `KUP-17025/${request.trackingCode.replace('SMP-', '')}`;

  let y = drawLetterhead(
    doc,
    'FORMULIR KAJI ULANG PERMINTAAN (ISO/IEC 17025:2017 KLAUSUL 7.1)',
    docCode,
    request.kajiUlang?.reviewedAt?.split(' ')[0] || request.createdAt.split(' ')[0] || formatNowDateLabel(),
    docCode
  );

  // Request Summary Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${request.companyName} (${request.trackingCode})`, 18, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIB/NPWP: ${request.nibNumber} · PJ HSE: ${request.picName} (${request.picPhone})`, 18, y + 12);
  doc.text(
    `Jadwal Sampling: ${request.scheduledDate} · Jumlah Titik: ${request.points.length} titik · Total SPH: ${formatRupiah(request.totalEstimatedCost)}`,
    18,
    y + 17.5
  );

  y += 30;

  if (request.kajiUlang) {
    const ku = request.kajiUlang;
    autoTable(doc, {
      startY: y,
      head: [['No', 'Aspek Kaji Ulang ISO/IEC 17025:2017 (Klausul 7.1)', 'Status Kelayakan']],
      body: [
        [
          '1',
          'Ketersediaan & kesesuaian metode uji acuan (SNI / APHA / PermenLHK)',
          ku.methodAvailable ? 'MEMENUHI' : 'TIDAK MEMENUHI',
        ],
        [
          '2',
          'Ketersediaan & status kalibrasi instrumen sampling lapangan',
          ku.equipmentCalibrated ? 'TERKALIBRASI' : 'BELUM SIAP',
        ],
        [
          '3',
          'Kesiapan bahan habis pakai, wadah steril, & pengawet sampel',
          ku.consumablesReady ? 'TERSEDIA' : 'TERBATAS',
        ],
        [
          '4',
          'Kompetensi & sertifikasi BNSP petugas pengambil contoh uji',
          ku.personnelCompetent ? 'KOMPETEN' : 'TIDAK TERSEDIA',
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [30, 41, 59],
        cellPadding: 3.5,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 130 },
        2: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
      },
      margin: { left: 14, right: 14 },
    });

    y = getLastTableY(doc, y + 40) + 8;

    // Decision & Assignment Box
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(14, y, pageWidth - 28, 36, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(6, 78, 59);
    doc.text(
      `KEPUTUSAN KAJI ULANG: ${ku.decision === 'PASS' ? 'LAYAK DILAKSANAKAN (SPK DITERBITKAN)' : 'PERLU PENINJAUAN ULANG'}`,
      18,
      y + 7
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    doc.setTextColor(15, 23, 42);
    doc.text(`Tim Sampler Bertugas: ${ku.assignedSamplerName}`, 18, y + 13.5);

    const noteLines = doc.splitTextToSize(`Catatan Teknis: ${ku.technicalNotes}`, pageWidth - 38);
    doc.text(noteLines.slice(0, 2), 18, y + 19.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text(`Peninjau / Manajer Teknis: ${ku.reviewerName}`, 18, y + 31.5);
    doc.text(`Disahkan pada: ${ku.reviewedAt}`, pageWidth - 18, y + 31.5, { align: 'right' });

    y += 44;
  } else {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 53, 15);
    doc.text('STATUS KAJI ULANG: MENUNGGU PENGESAHAN MANAJER TEKNIS', 18, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      `Permohonan saat ini berstatus ${request.status}. Evaluasi Klausul 7.1 akan terisi setelah ditinjau.`,
      18,
      y + 15
    );
    y += 28;
  }

  // Sampling Points Overview Table
  autoTable(doc, {
    startY: y,
    head: [['No', 'Titik Pengambilan Contoh', 'Matriks', 'Regulasi', 'Parameter Uji']],
    body: request.points.map((pt, i) => [
      `${i + 1}`,
      `${pt.pointName}\n(${pt.latitude}, ${pt.longitude})`,
      pt.matrixType,
      pt.regulationCode,
      pt.selectedParameterCodes.join(', '),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7.8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
      3: { cellWidth: 36 },
      4: { cellWidth: 56 },
    },
    margin: { left: 14, right: 14 },
  });

  addPageFooters(doc, docCode);
  doc.save(`KajiUlang_ISO17025_${request.trackingCode}.pdf`);
}

export function downloadSpkPdf(request: SamplingRequest): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const docCode = `SPK/SMP/${request.trackingCode.replace('SMP-', '')}`;
  const ku = request.kajiUlang;
  const team = SAMPLER_TEAMS.find((t) => t.id === ku?.assignedSamplerId);

  let y = drawLetterhead(
    doc,
    'SURAT PERINTAH KERJA PENGAMBILAN CONTOH UJI (SPK SAMPLING)',
    docCode,
    ku?.reviewedAt?.split(' ')[0] || formatNowDateLabel(),
    docCode
  );

  // Assignment & Location Grid
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TIM SAMPLER DITUGASKAN (BNSP)', 18, y + 6);
  doc.text('LOKASI & KONTAK LAPANGAN', pageWidth / 2 + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(ku?.assignedSamplerName || 'Menunggu Penugasan Manajer Teknis', 18, y + 11.5);
  doc.text(request.companyName, pageWidth / 2 + 4, y + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `No. Sertifikat BNSP: ${team?.bnspCert ?? 'Terverifikasi Internal'}`,
    18,
    y + 17
  );
  doc.text(`Spesialisasi: ${team?.specialization ?? 'Sampling Lingkungan'}`, 18, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(8, 145, 178);
  doc.text(`Jadwal Pelaksanaan: ${request.scheduledDate}`, 18, y + 28);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`PIC HSE: ${request.picName} (${request.picPhone})`, pageWidth / 2 + 4, y + 17);
  const addrLines = doc.splitTextToSize(request.siteAddress, pageWidth / 2 - 22);
  doc.text(addrLines.slice(0, 2), pageWidth / 2 + 4, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Ref. Permohonan: ${request.trackingCode}`, pageWidth / 2 + 4, y + 30.5);

  y += 40;

  // Field Execution & Chain-of-Custody Checklist Table
  autoTable(doc, {
    startY: y,
    head: [
      [
        'No',
        'Titik Sampling & Koordinat GPS',
        'Matriks & Regulasi',
        'Parameter Target',
        'Checklist Lapangan (CoC)',
      ],
    ],
    body: request.points.map((pt, idx) => [
      `${idx + 1}`,
      `${pt.pointName}\nGPS: ${pt.latitude}, ${pt.longitude}`,
      `${pt.matrixType}\n${pt.regulationCode}`,
      pt.selectedParameterCodes.join(', '),
      '[  ] Botol/Wadah Steril\n[  ] Pengawet & Label\n[  ] Foto Koordinat',
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.8,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 46 },
      2: { cellWidth: 38 },
      3: { cellWidth: 48 },
      4: { cellWidth: 40 },
    },
    margin: { left: 14, right: 14 },
  });

  y = getLastTableY(doc, y + 35) + 8;

  if (y > 225) {
    doc.addPage();
    y = 20;
  }

  // Technical instruction note
  if (ku?.technicalNotes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Instruksi Teknis Manajer Lab:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const notes = doc.splitTextToSize(ku.technicalNotes, pageWidth - 28);
    doc.text(notes, 14, y + 5);
    y += 16;
  }

  // 3 Signature Blocks (Manajer Teknis, Petugas Sampler, PIC Perusahaan)
  const colW = (pageWidth - 28 - 12) / 3;
  const signBoxes = [
    {
      title: 'Disahkan oleh Manajer Teknis',
      name: ku?.reviewerName || 'Manajer Teknis Lab',
      sub: ku?.reviewedAt ? `Digital Sign · ${ku.reviewedAt}` : 'Menunggu Pengesahan',
    },
    {
      title: 'Petugas Pengambil Contoh (PPC)',
      name: ku?.assignedSamplerName.split('—')[1]?.trim() || 'Tim Lapangan',
      sub: team?.bnspCert ?? 'Sertifikat BNSP',
    },
    {
      title: 'Saksi Lapangan (PIC HSE)',
      name: request.picName,
      sub: request.companyName,
    },
  ];

  signBoxes.forEach((box, idx) => {
    const bx = 14 + idx * (colW + 6);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(bx, y, colW, 30, 1.5, 1.5, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(box.title, bx + colW / 2, y + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(box.name.slice(0, 26), bx + colW / 2, y + 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(box.sub.slice(0, 28), bx + colW / 2, y + 26.5, { align: 'center' });
  });

  addPageFooters(doc, docCode);
  doc.save(`SPK_Sampling_${request.trackingCode}.pdf`);
}

export function downloadManagementBriefPdf(params: {
  requests: SamplingRequest[];
  calendarDays: CalendarCapacityDay[];
  generatedByName: string;
  generatedByRole: string;
}): void {
  const { requests, calendarDays, generatedByName, generatedByRole } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStamp = formatNowDateLabel();
  const docCode = `MBR/LIMS/${dateStamp.replace(/-/g, '')}`;

  let y = drawLetterhead(
    doc,
    'MANAGEMENT BRIEF: STATISTIK SAMPLING & KAJI ULANG PERMINTAAN LAB',
    docCode,
    dateStamp,
    docCode
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Dicetak oleh: ${generatedByName} (${generatedByRole})`, 14, y);
  y += 6;

  // Highlight KPI Metrics
  const totalCount = requests.length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const pendingCount = requests.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'VERIFIED'
  ).length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;
  const conversionRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const totalRevenue = requests
    .filter((r) => r.status !== 'REJECTED')
    .reduce((sum, r) => sum + r.totalEstimatedCost, 0);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. HIGHLIGHT TRANSAKSI & NILAI KONTRAK', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Total Permohonan Masuk: ${totalCount} permohonan`, 18, y + 12.5);
  doc.text(
    `• Disetujui (SPK Issued): ${approvedCount} permohonan (${conversionRate}%)`,
    18,
    y + 18
  );
  doc.text(
    `• Pending Verifikasi / Kaji Ulang: ${pendingCount} · Revisi/Ditolak: ${rejectedCount}`,
    18,
    y + 23.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.text(`Estimasi Nilai Kontrak:`, pageWidth - 18, y + 12.5, { align: 'right' });
  doc.setFontSize(11);
  doc.text(formatRupiah(totalRevenue), pageWidth - 18, y + 19.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(Termasuk mobilisasi & PPN 11%)', pageWidth - 18, y + 24.5, { align: 'right' });

  y += 36;

  // Section 2: Matrix Utilization Table
  const allPoints = requests.flatMap((r) => r.points);
  const matrices = ['Air Limbah', 'Udara Ambien', 'Emisi Cerobong', 'Air Bersih'] as const;

  autoTable(doc, {
    startY: y,
    head: [['2. Utilisasi Matriks Contoh Uji', 'Jumlah Titik', 'Persentase']],
    body: matrices.map((m) => {
      const count = allPoints.filter((p) => p.matrixType === m).length;
      const pct = allPoints.length > 0 ? Math.round((count / allPoints.length) * 100) : 0;
      return [m, `${count} titik`, `${pct}%`];
    }),
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 112 },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  y = getLastTableY(doc, y + 32) + 8;

  // Section 3: Requests Summary Table
  autoTable(doc, {
    startY: y,
    head: [['Kode Tracking', 'Perusahaan', 'Jadwal', 'Titik', 'Status', 'Nilai SPH']],
    body: requests.map((r) => [
      r.trackingCode,
      r.companyName,
      r.scheduledDate,
      `${r.points.length}`,
      r.status,
      formatRupiah(r.totalEstimatedCost),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7.8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 56 },
      2: { cellWidth: 24 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 24 },
      5: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  y = getLastTableY(doc, y + 40) + 8;

  // Section 4: Calendar Slot Occupancy
  autoTable(doc, {
    startY: y,
    head: [['Tanggal Jadwal', 'Terpakai', 'Kapasitas Max', 'Status Slot', 'Ketersediaan Alat']],
    body: calendarDays.map((day) => {
      const used = requests
        .filter((r) => r.scheduledDate === day.date && r.status !== 'REJECTED')
        .reduce((sum, r) => sum + r.points.length, 0);
      return [
        `${day.dayLabel}, ${day.dateLabel}`,
        `${used} titik`,
        `${day.maxCapacity} titik`,
        day.isLocked ? 'Terkunci' : 'Terbuka',
        day.equipmentNote,
      ];
    }),
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 24, halign: 'right' },
      3: { cellWidth: 22 },
      4: { cellWidth: 80 },
    },
    margin: { left: 14, right: 14 },
  });

  addPageFooters(doc, docCode);
  doc.save(`Management_Brief_SmartLIMS_${dateStamp}.pdf`);
}

export function downloadAuditTrailPdf(params: {
  auditLogs: AuditLogEntry[];
  generatedByName: string;
  generatedByRole: string;
}): void {
  const { auditLogs, generatedByName, generatedByRole } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateStamp = formatNowDateLabel();
  const docCode = `AUD-17025/${dateStamp.replace(/-/g, '')}`;

  const y = drawLetterhead(
    doc,
    'LAPORAN JEJAK AUDIT SISTEM (ISO/IEC 17025 IMMUTABLE AUDIT TRAIL)',
    docCode,
    dateStamp,
    docCode
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Total Entri Tercatat: ${auditLogs.length} · Diekspor oleh: ${generatedByName} (${generatedByRole})`,
    14,
    y
  );

  autoTable(doc, {
    startY: y + 5,
    head: [['Waktu', 'Aktor', 'Peran', 'Kode Tracking', 'Aksi', 'Keterangan Audit']],
    body: auditLogs.map((log) => [
      log.timestamp,
      log.actorName,
      log.actorRole,
      log.trackingCode,
      log.action,
      log.detail,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7.8, textColor: [30, 41, 59], cellPadding: 2.8 },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 40 },
      2: { cellWidth: 38 },
      3: { cellWidth: 34 },
      4: { cellWidth: 34, fontStyle: 'bold' },
      5: { cellWidth: 89 },
    },
    margin: { left: 14, right: 14 },
  });

  addPageFooters(doc, docCode);
  doc.save(`Audit_Trail_ISO17025_${dateStamp}.pdf`);
}

function triggerCsvDownload(filename: string, headers: string[], rows: string[][]) {
  const escapeCell = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
  const csvBody = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([`\uFEFF${csvBody}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSamplingRequestsCsv(requests: SamplingRequest[]): void {
  const dateStamp = formatNowDateLabel();
  triggerCsvDownload(
    `Rekap_Permohonan_SmartLIMS_${dateStamp}.csv`,
    [
      'Kode Tracking',
      'Perusahaan',
      'NIB/NPWP',
      'PIC HSE',
      'Email PIC',
      'Jadwal Sampling',
      'Jumlah Titik',
      'Subtotal Lab (Rp)',
      'Mobilisasi (Rp)',
      'PPN 11% (Rp)',
      'Total Estimasi (Rp)',
      'Status',
      'Tim Sampler',
    ],
    requests.map((r) => [
      r.trackingCode,
      r.companyName,
      r.nibNumber,
      r.picName,
      r.picEmail,
      r.scheduledDate,
      String(r.points.length),
      String(r.labSubtotal),
      String(r.transportFee),
      String(r.ppnAmount),
      String(r.totalEstimatedCost),
      r.status,
      r.kajiUlang?.assignedSamplerName ?? '-',
    ])
  );
}

export function downloadAuditLogsCsv(auditLogs: AuditLogEntry[]): void {
  const dateStamp = formatNowDateLabel();
  triggerCsvDownload(
    `Audit_Trail_ISO17025_${dateStamp}.csv`,
    ['Waktu', 'Aktor', 'Peran', 'Kode Tracking', 'Aksi', 'Keterangan'],
    auditLogs.map((l) => [
      l.timestamp,
      l.actorName,
      l.actorRole,
      l.trackingCode,
      l.action,
      l.detail,
    ])
  );
}
