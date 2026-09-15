import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserWorkoutPlan, EquipmentItem, PlannedDay, PlannedExercise } from '../types';
import { User } from '../contexts/AuthContext';

export interface GeneratePdfOptions {
  plan: UserWorkoutPlan;
  user?: User | null;
  equipment?: EquipmentItem[];
  filename?: string;
}

const formatSplitName = (split: string): string => {
  switch (split) {
    case 'full_body':
      return 'Full Body Focus';
    case 'upper_lower':
      return 'Upper / Lower Split';
    case 'ppl':
      return 'Push / Pull / Legs (PPL)';
    case 'home_dumbbell':
      return 'Home Dumbbell & Bodyweight';
    default:
      return split.replace(/_/g, ' ').toUpperCase();
  }
};

const formatTargetFocus = (focus: string): string => {
  switch (focus) {
    case 'hypertrophy':
      return 'Hypertrophy (Muscle Growth)';
    case 'strength':
      return 'Maximum Strength & Power';
    case 'fat_loss':
      return 'Fat Loss & Conditioning';
    case 'general_fitness':
      return 'General Athletic Fitness';
    default:
      return focus.replace(/_/g, ' ').toUpperCase();
  }
};

export function generateWorkoutPlanPdf(options: GeneratePdfOptions): jsPDF {
  const { plan, user, equipment = [] } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Primary Theme Colors (Kaizen Dark Slate & Emerald)
  const primarySlate: [number, number, number] = [15, 23, 42]; // #0F172A
  const textDark: [number, number, number] = [30, 41, 59]; // #1E293B
  const textMuted: [number, number, number] = [100, 116, 139]; // #64748B
  const emeraldAccent: [number, number, number] = [16, 185, 129]; // #10B981
  const borderLight: [number, number, number] = [226, 232, 240]; // #E2E8F0
  const bgLight: [number, number, number] = [248, 250, 252]; // #F8FAFC

  let currentY = 14;

  // --- 1. Top Decorative Emerald Accent Strip ---
  doc.setFillColor(...emeraldAccent);
  doc.rect(margin, currentY, contentWidth, 2, 'F');
  currentY += 6;

  // --- 2. Document Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...primarySlate);
  doc.text('KAIZEN', margin, currentY + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...emeraldAccent);
  doc.text('ADAPTIVE TRAINING BLUEPRINT', margin + 28, currentY + 3.5);

  const exportDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text(`Generated: ${exportDate}`, pageWidth - margin, currentY + 1, { align: 'right' });
  doc.text('Status: ACTIVE PROTOCOL', pageWidth - margin, currentY + 5.5, { align: 'right' });

  currentY += 11;

  // Subtitle / mission
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  doc.text(
    'Personalized weekly training program calibrated to available equipment and progression targets.',
    margin,
    currentY
  );
  currentY += 6;

  // Divider
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // --- 3. Athlete & Program Specifications Grid ---
  doc.setFillColor(...bgLight);
  doc.setDrawColor(...borderLight);
  doc.roundedRect(margin, currentY, contentWidth, 25, 2, 2, 'FD');

  const col1X = margin + 4;
  const col2X = margin + 65;
  const col3X = margin + 125;
  let metaY = currentY + 5;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text('ATHLETE', col1X, metaY);
  doc.text('TRAINING SPLIT', col2X, metaY);
  doc.text('TARGET FOCUS', col3X, metaY);

  metaY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  doc.text(user?.name || 'Kaizen Athlete', col1X, metaY);
  doc.text(formatSplitName(plan.preferences?.splitStyle || 'full_body'), col2X, metaY);
  doc.text(formatTargetFocus(plan.preferences?.targetFocus || 'general_fitness'), col3X, metaY);

  // Row 2
  metaY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text('EXPERIENCE', col1X, metaY);
  doc.text('SCHEDULE FREQUENCY', col2X, metaY);
  doc.text('TARGET DURATION', col3X, metaY);

  metaY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  doc.text((plan.preferences?.experienceLevel || 'Beginner').toUpperCase(), col1X, metaY);
  doc.text(`${plan.preferences?.daysPerWeek || 3} Days / Week`, col2X, metaY);
  doc.text(`${plan.preferences?.sessionDurationMinutes || 45} Minutes / Session`, col3X, metaY);

  currentY += 30;

  // --- 4. Hardware Arsenal / Equipment Compliance Box ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primarySlate);
  doc.text('HARDWARE ARSENAL (INVENTORY COMPLIANCE)', margin, currentY);
  currentY += 4;

  const equipmentDescriptions =
    equipment.length > 0
      ? equipment.map((item) => {
          let desc = item.name;
          if (item.availableWeightsKg && item.availableWeightsKg.length > 0) {
            desc += ` [${item.availableWeightsKg.map((w) => `${w}kg`).join(', ')}]`;
          }
          return desc;
        })
      : ['Bodyweight & Calisthenics (Standard Floor Support)'];

  const eqText = equipmentDescriptions.join('   •   ');
  const splitEq = doc.splitTextToSize(eqText, contentWidth - 6);

  const eqBoxHeight = Math.max(12, splitEq.length * 4.2 + 6);
  doc.setFillColor(...bgLight);
  doc.setDrawColor(...borderLight);
  doc.roundedRect(margin, currentY, contentWidth, eqBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text(splitEq, margin + 3, currentY + 5);

  currentY += eqBoxHeight + 6;

  // --- 5. Weekly Schedule Summary Table ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primarySlate);
  doc.text('WEEKLY SCHEDULE BLUEPRINT', margin, currentY);
  currentY += 3;

  const scheduleRows = (plan.schedule || []).map((day: PlannedDay) => [
    `Day ${day.dayNumber}`,
    day.title,
    day.isRestDay ? 'Rest & Muscle Recovery' : day.focus,
    day.isRestDay ? 'Rest Day' : `${day.estimatedDurationMinutes} mins`,
    day.isRestDay ? '-' : `${day.exercises?.length || 0} movements`,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Day', 'Session Title', 'Focus & Muscle Targets', 'Duration', 'Volume']],
    body: scheduleRows,
    theme: 'plain',
    headStyles: {
      fillColor: primarySlate,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: textDark,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: bgLight,
    },
    styles: {
      lineColor: borderLight,
      lineWidth: 0.2,
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --- 6. Detailed Workout Sessions (Day-by-Day) ---
  const activeDays = (plan.schedule || []).filter((d: PlannedDay) => !d.isRestDay);

  activeDays.forEach((day: PlannedDay) => {
    // Check if we need a new page for the workout day
    if (currentY > pageHeight - 65) {
      doc.addPage();
      currentY = 16;
    }

    // Day Header
    const isConditioningDay = !!day.conditioningProtocol || day.exercises.some((e: any) => e.isConditioning);
    const headerHeight = isConditioningDay ? 14 : 10.5;
    doc.setFillColor(...bgLight);
    doc.setDrawColor(...emeraldAccent);
    doc.setLineWidth(0.6);
    doc.rect(margin, currentY, contentWidth, headerHeight, 'F');
    doc.line(margin, currentY, margin, currentY + headerHeight); // Emerald left accent border

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primarySlate);
    const dayTitle = `DAY ${day.dayNumber}: ${day.title.toUpperCase()}`;
    doc.text(dayTitle, margin + 3, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...emeraldAccent);
    doc.text(
      `~${day.estimatedDurationMinutes} MINS   •   ${day.exercises?.length || 0} MOVEMENTS`,
      pageWidth - margin - 3,
      currentY + 4.5,
      { align: 'right' }
    );

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    const focusLine = doc.splitTextToSize(`Target Focus: ${day.focus}`, contentWidth - 8)[0];
    doc.text(focusLine, margin + 3, currentY + 8.5);

    if (day.conditioningProtocol) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...emeraldAccent);
      doc.text(
        `CIRCUIT PROTOCOL: ${day.conditioningProtocol.rounds} ROUNDS • ${day.conditioningProtocol.workSeconds}S WORK / ${day.conditioningProtocol.restSeconds}S REST (${day.conditioningProtocol.roundRestSeconds}s between rounds)`,
        margin + 3,
        currentY + 12
      );
    }

    currentY += headerHeight + 2;

    // Exercises Table
    const exerciseRows = (day.exercises || []).map((ex: PlannedExercise, exIdx: number) => {
      const weightDisplay =
        ex.suggestedWeightKg && ex.suggestedWeightKg > 0 ? `${ex.suggestedWeightKg} kg` : 'Bodyweight';
      const isTimeBased = ex.repUnit === 'seconds' || (ex.notes && ex.notes.toLowerCase().includes('time-based'));
      const setsReps = ex.isConditioning
        ? `${ex.targetSets} Rnds x ${ex.targetReps}s`
        : isTimeBased ? `${ex.targetSets} x ${ex.targetReps}s` : `${ex.targetSets} x ${ex.targetReps}`;
      const rest = `${ex.restSeconds || 60}s`;


      const formTipsText =
        ex.formTips && ex.formTips.length > 0
          ? ex.formTips.slice(0, 2).join(' • ')
          : ex.notes || 'Full range of motion, controlled tempo.';

      return [
        `${exIdx + 1}`,
        `${ex.exerciseName}\n[${(ex.targetMuscle || 'general').toUpperCase()}]`,
        ex.equipment.replace(/_/g, ' '),
        setsReps,
        weightDisplay,
        rest,
        formTipsText,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['#', 'Movement / Muscle', 'Hardware', 'Sets x Reps', 'Target Load', 'Rest', 'Biomechanical Cues & Tempo']],
      body: exerciseRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // Dark Slate
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 42, fontStyle: 'bold' },
        2: { cellWidth: 24 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center', textColor: emeraldAccent, fontStyle: 'bold' },
        5: { cellWidth: 14, halign: 'center' },
        6: { cellWidth: 'auto', fontSize: 7, textColor: textMuted },
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: textDark,
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: bgLight,
      },
      styles: {
        lineColor: borderLight,
        lineWidth: 0.15,
        overflow: 'linebreak',
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;
  });

  // --- 7. Kaizen Progressive Overload & Execution Protocol ---
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...primarySlate);
  doc.text('KAIZEN PROGRESSIVE OVERLOAD & FORM PROTOCOL', margin, currentY);
  currentY += 4;

  const protocolRules = [
    '• RPE Benchmark: Maintain Rate of Perceived Exertion between 7.5 and 8.5 (leave 1-2 clean reps in reserve).',
    '• Progressive Overload Trigger: When all prescribed sets & reps are logged with RPE <= 7.5, advance load by +1kg to +2.5kg.',
    '• Controlled Eccentric Tempo: Lower every repetition under 2-3 seconds of tension. Avoid momentum and bounce.',
    '• Training Consistency: Record your sets & weights in Kaizen to systematically track progressive overload over time.',
  ];

  doc.setFillColor(...bgLight);
  doc.setDrawColor(...borderLight);
  doc.roundedRect(margin, currentY, contentWidth, 24, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textDark);
  let ruleY = currentY + 4.5;
  protocolRules.forEach((rule) => {
    doc.text(rule, margin + 4, ruleY);
    ruleY += 4.5;
  });

  // --- 8. Dynamic Page Footers (Page X of Y) ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text('Kaizen Adaptive Health Engine  •  Continuous Self-Improvement', margin, pageHeight - 5.5);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 5.5, { align: 'right' });
  }

  return doc;
}

export function downloadWorkoutPlanPdf(options: GeneratePdfOptions): string {
  const doc = generateWorkoutPlanPdf(options);
  const splitClean = (options.plan.preferences?.splitStyle || 'workout').replace(/_/g, '-');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = options.filename || `Kaizen-Workout-Plan-${splitClean}-${dateStr}.pdf`;
  doc.save(filename);
  return filename;
}
