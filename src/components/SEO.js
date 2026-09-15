export default function SEO() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MyMockSewa",
    url: "https://mymocksewa.com",
    description:
      "Nepal's #1 exam preparation platform for NEA, Loksewa, and Entrance exams.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://mymocksewa.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "myMockSewa",
    url: "https://mymocksewa.com",
    logo: "https://mymocksewa.com/logo.png",
    description:
      "Nepal's premier digital institution for professional license and competitive exam preparation.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kathmandu",
      addressCountry: "NP",
    },
    sameAs: [
      "https://facebook.com/mymocksewa",
      "https://instagram.com/mymocksewa",
    ],
  };

  const nmcSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "NMC Medical License Preparation",
    description:
      "High-fidelity MCQ practice for the Nepal Medical Council (NMC) licensing exam.",
    provider: organizationData,
  };

  const necSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "NEC Engineering License Preparation",
    description:
      "Comprehensive engineering license exam preparation following Nepal Engineering Council standards.",
    provider: organizationData,
  };

  const pscSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Loksewa (PSC) Preparation Nepal",
    description:
      "Advanced mock tests for Nepal Public Service Commission (Loksewa) exams, including Kharidar, Nayab Subba, and Section Officer.",
    provider: organizationData,
  };
  
  const tscSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "TSC (Teachers Service Commission) Preparation",
    description:
      "Expert-designed mock tests for Teaching License and Primary/Lower Secondary/Secondary level TSC exams in Nepal.",
    provider: organizationData,
  };

  const computerSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Computer Operator Exam Preparation",
    description:
      "Specialized MCQs and practical theory for Computer Operator and Assistant Computer Operator exams in Nepal.",
    provider: organizationData,
  };

  const civilSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "NEC Civil Engineering License Prep",
    description:
      "Technical mastery tests for the Nepal Engineering Council (NEC) Civil Engineering licensing exam.",
    provider: organizationData,
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://mymocksewa.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Practice",
        "item": "https://mymocksewa.com/student"
      }
    ]
  };

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What exams does myMockSewa cover?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "myMockSewa covers a wide range of exams in Nepal, including NEA (Nepal Electricity Authority) all levels, PSC (Loksewa) Civil Service, NEC (Nepal Engineering Council) License, and NMC (Nepal Medical Council) License exams."
        }
      },
      {
        "@type": "Question",
        name: "How much does a MyMockSewa course cost?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Premium courses on MyMockSewa start from just Rs. 999, which includes unlimited mock tests, Smart Learning Studio hints, and real-time national ranking."
        }
      },
      {
        "@type": "Question",
        "name": "Is there a free trial for mock tests?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, myMockSewa offers a free trial that includes one full diagnostic mock test and basic excellence radar profiling to help you identify your weak topics."
        }
      },
      {
        "@type": "Question",
        "name": "How does the national rank tracking work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our AI-driven system tracks your performance in real-time and compares it with over 5,000 active candidates across Nepal, providing you with a national leaderboard ranking after every mock test."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        key="search-jsonld"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
        key="org-jsonld"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(nmcSchema) }}
        key="nmc-jsonld"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(necSchema) }}
        key="nec-jsonld"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pscSchema) }}
        key="psc-jsonld"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(tscSchema) }}
        key="tsc-jsonld"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(computerSchema) }}
        key="computer-jsonld"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(civilSchema) }}
        key="civil-jsonld"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
        key="breadcrumb-jsonld"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
        key="faq-jsonld"
      />
    </>
  );
}
