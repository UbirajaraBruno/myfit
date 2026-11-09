export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
};

const SESSION_KEY = "myfit.auth.session.v1";

function authUrl(base: string, path: string) { return `${base.replace(/\/$/, "")}/auth/v1/${path}`; }
function headers(key: string, token?: string) { return { apikey: key, ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" }; }
async function errorFrom(response: Response) {
  const body = await response.json().catch(() => ({})) as { msg?: string; message?: string; error_description?: string; error?: string };
  throw new Error(body.msg || body.message || body.error_description || body.error || "Não foi possível concluir. Confira os dados e tente de novo.");
}
function store(session: SupabaseSession | null) {
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
}
function normalizeSession(raw: { access_token: string; refresh_token: string; expires_at?: number; expires_in?: number; user: { id: string; email?: string } }): SupabaseSession {
  return { access_token: raw.access_token, refresh_token: raw.refresh_token, expires_at: raw.expires_at ?? Math.floor(Date.now() / 1000) + (raw.expires_in ?? 3600), user: raw.user };
}

export async function readSession(base: string, key: string): Promise<{ session: SupabaseSession | null; recovery: boolean }> {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const access = params.get("access_token");
  const refresh = params.get("refresh_token");
  const type = params.get("type");
  if (access && refresh) {
    const userResponse = await fetch(authUrl(base, "user"), { headers: headers(key, access) });
    if (userResponse.ok) {
      const user = await userResponse.json() as SupabaseSession["user"];
      const session = normalizeSession({ access_token: access, refresh_token: refresh, expires_in: Number(params.get("expires_in") ?? 3600), user });
      store(session);
      window.history.replaceState({}, "", window.location.pathname + window.location.search);
      return { session, recovery: type === "recovery" };
    }
  }
  const saved = window.localStorage.getItem(SESSION_KEY);
  if (!saved) return { session: null, recovery: false };
  try {
    let session = JSON.parse(saved) as SupabaseSession;
    if (session.expires_at < Math.floor(Date.now() / 1000) + 60) {
      const response = await fetch(authUrl(base, "token?grant_type=refresh_token"), { method: "POST", headers: headers(key), body: JSON.stringify({ refresh_token: session.refresh_token }) });
      if (!response.ok) { store(null); return { session: null, recovery: false }; }
      session = normalizeSession(await response.json());
      store(session);
    }
    return { session, recovery: false };
  } catch {
    store(null);
    return { session: null, recovery: false };
  }
}

export async function signUp(base: string, key: string, email: string, password: string) {
  const redirect = `${window.location.origin}/`;
  const response = await fetch(authUrl(base, `signup?redirect_to=${encodeURIComponent(redirect)}`), { method: "POST", headers: headers(key), body: JSON.stringify({ email: email.trim(), password }) });
  if (!response.ok) return errorFrom(response);
  const result = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; expires_at?: number; user?: SupabaseSession["user"] };
  if (result.access_token && result.refresh_token && result.user) store(normalizeSession(result as Required<Pick<typeof result, "access_token" | "refresh_token" | "user">>));
  return Boolean(result.access_token);
}

export async function signIn(base: string, key: string, email: string, password: string) {
  const response = await fetch(authUrl(base, "token?grant_type=password"), { method: "POST", headers: headers(key), body: JSON.stringify({ email: email.trim(), password }) });
  if (!response.ok) return errorFrom(response);
  const session = normalizeSession(await response.json());
  store(session);
  return session;
}

export async function requestPasswordReset(base: string, key: string, email: string) {
  const redirect = `${window.location.origin}/?flow=recovery`;
  const response = await fetch(authUrl(base, `recover?redirect_to=${encodeURIComponent(redirect)}`), { method: "POST", headers: headers(key), body: JSON.stringify({ email: email.trim() }) });
  if (!response.ok) return errorFrom(response);
}

export async function setNewPassword(base: string, key: string, session: SupabaseSession, password: string) {
  const response = await fetch(authUrl(base, "user"), { method: "PUT", headers: headers(key, session.access_token), body: JSON.stringify({ password }) });
  if (!response.ok) return errorFrom(response);
  store(null);
}

export function signOut() { store(null); }

export async function loadMyFitData(base: string, key: string, session: SupabaseSession) {
  const valid = (await readSession(base, key)).session ?? session;
  const response = await fetch(`${base.replace(/\/$/, "")}/rest/v1/myfit_data?select=payload&limit=1`, { headers: headers(key, valid.access_token) });
  if (!response.ok) return errorFrom(response);
  const rows = await response.json() as { payload: unknown }[];
  return rows[0]?.payload ?? null;
}

export async function saveMyFitData(base: string, key: string, session: SupabaseSession, data: unknown) {
  const valid = (await readSession(base, key)).session ?? session;
  const response = await fetch(`${base.replace(/\/$/, "")}/rest/v1/myfit_data?on_conflict=user_id`, { method: "POST", headers: { ...headers(key, valid.access_token), prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: valid.user.id, payload: data, updated_at: new Date().toISOString() }) });
  if (!response.ok) return errorFrom(response);
}

