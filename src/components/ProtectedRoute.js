"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GlobalLoading from "./GlobalLoading";

export default function ProtectedRoute({ children, role = null }) {
  const { user, isInitializing, mounted } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isInitializing && mounted) {
      if (!user) {
        // Not logged in - redirect to login and preserve path
        const searchParams = new URLSearchParams();
        searchParams.set("redirect", pathname);
        router.push(`/login?${searchParams.toString()}`);
      } else if (role && user.role !== role) {
        // Logged in but wrong role - send to their dashboard
        if (user.role === "admin") router.push("/admin");
        else router.push("/student");
      }
    }
  }, [user, isInitializing, mounted, role, pathname, router]);

  // While checking auth OR if no user yet, show the loading shield
  if (isInitializing || !user) {
    return <GlobalLoading />;
  }

  // Check role match if specified
  if (role && user.role !== role) {
    return <GlobalLoading />;
  }

  return children;
}
