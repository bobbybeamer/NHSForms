import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { WAIVER_SETTING_KEYS, waiverBandSettingsFromRows } from '@/config/waiverRouting';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  // ADMIN only — enforced here regardless of what the UI shows.
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { key } = await params;
  const body = await request.json();
  const { value } = body;

  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    return NextResponse.json({ error: 'value must be a positive number' }, { status: 400 });
  }

  const existing = await prisma.threshold.findUnique({ where: { key } });
  if (!existing) {
    return NextResponse.json({ error: 'Threshold not found' }, { status: 404 });
  }

  if (existing.value === value) {
    return NextResponse.json(existing);
  }

  // The waiver bands must stay in order: PA23 < CFO upper < Exec upper.
  // Otherwise a band would be empty or overlap and routing would be ambiguous.
  const bandKeys: string[] = Object.values(WAIVER_SETTING_KEYS);
  if (bandKeys.includes(key)) {
    const rows = await prisma.threshold.findMany({ where: { key: { in: bandKeys } } });
    const proposed = waiverBandSettingsFromRows(
      rows.map((r) => (r.key === key ? { key: r.key, value } : r))
    );
    if (
      proposed &&
      !(proposed.pa23ThresholdIncVat < proposed.cfoUpperIncVat &&
        proposed.cfoUpperIncVat < proposed.execUpperIncVat)
    ) {
      return NextResponse.json(
        { error: 'Waiver bands must stay in order: PA23 threshold < CFO upper limit < Executive Committee upper limit.' },
        { status: 400 }
      );
    }
  }

  // Update and audit atomically: no change without its audit record.
  const [updated] = await prisma.$transaction([
    prisma.threshold.update({ where: { key }, data: { value } }),
    prisma.adminAuditEvent.create({
      data: {
        actorId: auth.user.id,
        action: 'SETTING_UPDATED',
        target: key,
        targetLabel: existing.label,
        oldValue: String(existing.value),
        newValue: String(value),
      },
    }),
  ]);

  return NextResponse.json(updated);
}
