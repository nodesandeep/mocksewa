import { NextResponse } from 'next/server';
import turso from '@/utils/turso';

export async function GET() {
  try {
    const result = await turso.execute(
      "SELECT value FROM app_settings WHERE key = 'maintenance_mode'"
    );
    
    const isMaintenance = result.rows[0]?.value === 'true';
    return NextResponse.json({ maintenance: isMaintenance });
  } catch (error) {
    console.error('[API Status Error]', error);
    // If the database check fails, we default to 'false' to keep the site up
    return NextResponse.json({ maintenance: false });
  }
}
