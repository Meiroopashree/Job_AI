"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface JobStats {
  total_jobs: number;
  jobs_today: number;
}

export function useStats() {
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/jobs/stats")
      .then((res) => {
        if (!cancelled) setStats(res.data);
      })
      .catch(() => {
        if (!cancelled) setStats({ total_jobs: 0, jobs_today: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading };
}