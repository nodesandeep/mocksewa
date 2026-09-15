import { NextResponse } from 'next/server';

// Digital Asset Links - required for TWA to verify domain ownership
// SHA-256 fingerprint will be updated after Bubblewrap generates the keystore
// Placeholder fingerprint below — MUST be replaced after `bubblewrap build`

const assetLinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.mymocksewa.app",
      sha256_cert_fingerprints: [
        "4C:D8:74:0D:CF:34:DD:D4:85:A4:4F:78:D6:0C:25:7C:EC:1B:2F:18:7F:36:DD:09:93:BB:72:9A:D5:11:C4:B8"
      ]
    }
  }
];

export async function GET() {
  return NextResponse.json(assetLinks, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400', // Cache for 24h
    },
  });
}
