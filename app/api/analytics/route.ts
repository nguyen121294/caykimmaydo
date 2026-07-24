export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [abTests, content] = await Promise.all([
      prisma.aBTest.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.contentTracking.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    // Calculate metrics for each A/B test
    const testsWithMetrics = (abTests ?? [])?.map?.((t: any) => {
      const ctrA = (t?.impressionsA ?? 0) > 0 ? ((t?.clicksA ?? 0) / (t?.impressionsA ?? 1) * 100) : 0;
      const ctrB = (t?.impressionsB ?? 0) > 0 ? ((t?.clicksB ?? 0) / (t?.impressionsB ?? 1) * 100) : 0;
      const roasA = (t?.budgetA ?? 0) > 0 ? (t?.revenueA ?? 0) / (t?.budgetA ?? 1) : 0;
      const roasB = (t?.budgetB ?? 0) > 0 ? (t?.revenueB ?? 0) / (t?.budgetB ?? 1) : 0;
      const winner = roasA > roasB ? 'VARIANT A' : roasB > roasA ? 'VARIANT B' : 'TIE';
      const diff = Math.max(roasA, roasB) > 0 ? Math.abs(roasA - roasB) / Math.max(roasA, roasB) * 100 : 0;
      const confidence = diff > 30 ? 'High (>30%)' : diff > 15 ? 'Medium (15-30%)' : 'Low (<15%)';
      return {
        ...(t ?? {}),
        ctrA: ctrA?.toFixed?.(2) ?? '0',
        ctrB: ctrB?.toFixed?.(2) ?? '0',
        roasA: roasA?.toFixed?.(1) ?? '0',
        roasB: roasB?.toFixed?.(1) ?? '0',
        winner,
        confidence,
      };
    }) ?? [];

    // Budget allocation - tính từ ABTest thật
    const totalBudget = (abTests ?? []).reduce((s: number, t: any) => s + (t.budgetA ?? 0) + (t.budgetB ?? 0), 0);
    const budgetAllocation = totalBudget > 0 ? [
      { name: 'TOF', value: Math.round(totalBudget * 0.50), color: '#60B5FF' },
      { name: 'MOF', value: Math.round(totalBudget * 0.30), color: '#FF9149' },
      { name: 'BOF', value: Math.round(totalBudget * 0.20), color: '#80D8C3' },
    ] : [];

    return NextResponse.json({
      abTests: testsWithMetrics,
      content: content ?? [],
      budgetAllocation,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
