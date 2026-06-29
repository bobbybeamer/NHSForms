import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Returns all threshold records. No auth required — forms need this to render flags.
export async function GET() {
  const thresholds = await prisma.threshold.findMany({ orderBy: { key: 'asc' } });
  return NextResponse.json(thresholds);
}
