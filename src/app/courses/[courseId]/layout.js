import turso from '@/utils/turso';

export async function generateMetadata({ params }) {
  const { courseId } = await params;
  const baseUrl = "https://mymocksewa.com";

  try {
    const res = await turso.execute({
      sql: 'SELECT title, description, category, bannerUrl, fullMarks, durationMinutes FROM courses WHERE id = ?',
      args: [courseId]
    });

    const course = res.rows[0];
    if (!course) {
      return {
        title: 'Course Syllabus & Study Notes | myMockSewa',
        description: 'Comprehensive competitive examination notes and mock test series.'
      };
    }

    const title = `${course.title} | Complete Notes & Mock Tests`;
    const description = course.description 
      ? course.description.slice(0, 160) 
      : `Master ${course.title} with high-yield study handbook notes, formulas, past examination questions analysis, and timed mock tests on myMockSewa.`;
    const image = course.bannerUrl || `${baseUrl}/logo-og.png`;

    return {
      title,
      description,
      alternates: {
        canonical: `${baseUrl}/courses/${courseId}/learn`,
      },
      openGraph: {
        title,
        description,
        url: `${baseUrl}/courses/${courseId}/learn`,
        siteName: 'myMockSewa',
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: course.title,
          }
        ],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      }
    };
  } catch (e) {
    return {
      title: 'Course Notes & Practice | myMockSewa',
      description: 'Nepal Loksewa, Engineering & Medical mock exam platform.'
    };
  }
}

export default function CourseLayout({ children }) {
  return <>{children}</>;
}
