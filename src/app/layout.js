import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import SEO from "@/components/SEO";
import AppWrapper from "@/components/AppWrapper";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
};

export async function generateMetadata() {
  const baseUrl = "https://mymocksewa.com";
  return {
    title: {
      default: "myMockSewa | Nepal's #1 Mock Test Platform for PSC, NEC, NMC & NEA",
      template: "%s | myMockSewa"
    },
    description: "Crack Nepal's toughest exams with MyMockSewa. Premium mock tests for Loksewa (PSC), NEA, TSC, NEC Engineering License (Civil/Electrical), and NMC Medical License. Features real-time national ranking, Smart Learning Studio hints, and AI analytics.",
    keywords: [
      "Loksewa Preparation Nepal 2083", 
      "NEA Level 5 Electrical Mock Tests", 
      "NEC Civil Engineering License MCQs", 
      "TSC Teachers Service Commission Prep",
      "Computer Operator Mock Test Nepal",
      "MBBS NMC License Preparation Nepal",
      "Loksewa Tayari GK IQ",
      "NEA Level 4 Admin MCQs",
      "Online Exam Preparation Nepal",
      "Smart Mock Test Series"
    ],
    alternates: {
      canonical: baseUrl,
    },
    authors: [{ name: "myMockSewa Excellence Team" }],
    creator: "myMockSewa",
    publisher: "myMockSewa",
    openGraph: {
      title: "myMockSewa | Crack Exams with Precision Mock Tests",
      description: "Join 10,000+ candidates mastering NEA, PSC, NEC, and NMC exams with scientific mock tests and real-time rankings.",
      url: baseUrl,
      siteName: "myMockSewa",
      images: [
        {
          url: "/logo-og.png", // Recommended size 1200x630
          width: 1200,
          height: 630,
          alt: "myMockSewa - Precision Practice, Proven Success",
        },
      ],
      locale: "en_NP",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "myMockSewa | Nepal's Premier Exam Prep Platform",
      description: "Scientific mock tests for Engineering, Medical, and Civil Service exams. Crack Loksewa & NEA with ease.",
      images: ["/logo-og.png"],
    },
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'myMockSewa',
    },
    metadataBase: new URL(baseUrl),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: "your-google-verification-code", // User can replace this later
    }
  };
}

import SecurityDeterrent from "@/components/SecurityDeterrent";

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "myMockSewa",
    "alternateName": "MyMockSewa Nepal",
    "url": "https://mymocksewa.com",
    "logo": "https://mymocksewa.com/logo.png",
    "foundingDate": "2023",
    "sameAs": [
      "https://facebook.com/mymocksewa",
      "https://twitter.com/mymocksewa",
      "https://instagram.com/mymocksewa"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+977-9865018024",
      "contactType": "customer service",
      "email": "mymocksewa@gmail.com",
      "areaServed": "NP",
      "availableLanguage": ["English", "Nepali"]
    },
    "description": "Nepal's leading digital examination simulation platform for PSC, NEC, NMC, and NEA aspirants.",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Kathmandu",
      "addressCountry": "NP"
    }
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "myMockSewa",
    "url": "https://mymocksewa.com",
    "description": "Crack Nepal's toughest exams with MyMockSewa. Premium mock tests for Loksewa (PSC), NEA, TSC, NEC, and NMC exams with Smart Learning Studio hints.",
    "keywords": "Loksewa Preparation Nepal, NEA Level 5 Electrical, NEC Civil Engineering MCQs, TSC Teachers Prep, Computer Operator Nepal",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://mymocksewa.com/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>

      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900`}>
        <SecurityDeterrent />
        {/* PWA Service Worker Registration for TWA */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('[SW] Registered:', reg.scope); })
                .catch(function(err) { console.log('[SW] Registration failed:', err); });
            });
          }
        ` }} />
        <AuthProvider>
          <SEO />
          <AppWrapper>
            {children}
          </AppWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
