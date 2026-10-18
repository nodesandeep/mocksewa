import { NextResponse } from 'next/server';
import turso from '@/utils/turso';
import { verifyAdminUser } from '@/utils/admin-guard';

export async function POST(request) {
  const authCheck = await verifyAdminUser(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { key, value } = await request.json();
    
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    }

    await turso.execute({
      sql: "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
      args: [key, value]
    });

    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    console.error('[Admin Status Update Error]', error);
    return NextResponse.json({ error: 'Internal Server Error', detail: error.message }, { status: 500 });
  }
}
