export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    const logs = await prisma.automationLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Try to read log files
    let fileContent = '';
    try {
      const logDir = path.join(process.cwd(), 'data', 'logs');
      if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir)?.sort?.()?.reverse?.() ?? [];
        for (const f of (files ?? [])?.slice?.(0, 3) ?? []) {
          const fp = path.join(logDir, f);
          if (fs.existsSync(fp)) {
            const content = fs.readFileSync(fp, 'utf-8');
            fileContent += `\n--- ${f} ---\n${content?.slice?.(0, 5000) ?? ''}`;
          }
        }
      }
    } catch {}

    return NextResponse.json({
      logs: logs ?? [],
      rawLogs: fileContent ?? '',
      lastSync: logs?.[0]?.timestamp ?? null,
      totalLogs: logs?.length ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
