"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import QuizEngine from "@/components/QuizEngine";

export default function QuizPageClient({ quizId }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "student")) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading Quiz Session...
      </div>
    );
  if (!user || user.role !== "student") return null;

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <QuizEngine quizId={quizId} />
    </div>
  );
}
