import turso from '@/utils/turso';

export default async function sitemap() {
  const baseUrl = "https://mymocksewa.com";
  
  // 1. Static Core Landing Pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/blog/psc-loksewa-mastery-guide-2083`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/nec-engineering-license-exam-secrets`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/nea-exam-success-simulation-strategy`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/library/psc-nepal-guide`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/library/nmc-license-2026`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/library/engineering-license-nepal`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // 2. Fetch Active Courses & Chapters from Turso
  let dynamicCoursePages = [];
  try {
    const coursesRes = await turso.execute("SELECT id, createdAt FROM courses WHERE status = 'active' OR status IS NULL");
    
    coursesRes.rows.forEach(course => {
      // Guided path
      dynamicCoursePages.push({
        url: `${baseUrl}/courses/${course.id}/learn`,
        lastModified: course.createdAt ? new Date(course.createdAt) : new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });
      // Master Syllabus Handbook & Notes
      dynamicCoursePages.push({
        url: `${baseUrl}/courses/${course.id}/notes`,
        lastModified: course.createdAt ? new Date(course.createdAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      });
      // Exam landing
      dynamicCoursePages.push({
        url: `${baseUrl}/exams/${course.id}`,
        lastModified: course.createdAt ? new Date(course.createdAt) : new Date(),
        changeFrequency: 'daily',
        priority: 0.85,
      });
    });

    // 3. Free Trial & Practice Sets
    const trialRes = await turso.execute('SELECT id, courseId, createdAt FROM quizzes WHERE isFreeTrial = 1 LIMIT 50');
    trialRes.rows.forEach(q => {
      if (q.courseId) {
        dynamicCoursePages.push({
          url: `${baseUrl}/practice/${q.courseId}/${q.id}`,
          lastModified: q.createdAt ? new Date(q.createdAt) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.75,
        });
      }
    });

  } catch (err) {
    console.warn('[sitemap] Failed to query dynamic Turso courses:', err.message);
  }

  return [...staticPages, ...dynamicCoursePages];
}
