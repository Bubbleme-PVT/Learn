export async function pushProgressToCloud(_state) {
  // Placeholder adapter for future Supabase/Firebase integration.
  // Intentionally not wired to a backend in this artifact.
  return { ok: false, reason: 'frontend-only-demo' };
}

export async function pullProgressFromCloud() {
  // Replace with a real authenticated fetch when backend is available.
  return { ok: false, state: null, reason: 'frontend-only-demo' };
}
