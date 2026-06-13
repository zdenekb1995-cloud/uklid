const BASE = process.env.REACT_APP_API_URL || "";

async function req(method, path, body) {
  const opts = {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(BASE + path, opts);
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail || "Chyba serveru");
  }
  return r.json();
}

export const api = {
  login: (u, p) => req("POST", "/api/auth/login", { username: u, password: p }),
  logout: () => req("POST", "/api/auth/logout"),
  me: () => req("GET", "/api/auth/me"),

  getApartments: () => req("GET", "/api/apartments"),
  createApartment: (d) => req("POST", "/api/apartments", d),
  updateApartment: (id, d) => req("PUT", `/api/apartments/${id}`, d),
  deleteApartment: (id) => req("DELETE", `/api/apartments/${id}`),
  syncApartment: (id) => req("POST", `/api/apartments/${id}/sync`),
  syncAll: () => req("POST", "/api/sync-all"),

  getReservations: (params) => {
    const q = new URLSearchParams(params).toString();
    return req("GET", `/api/reservations${q ? "?" + q : ""}`);
  },

  getCleanings: () => req("GET", "/api/cleanings"),
  updateCleaning: (id, d) => req("PUT", `/api/cleanings/${id}`, d),
  getCleaningsForCleaner: () => req("GET", "/api/cleanings/for-cleaner"),

  getCleaners: () => req("GET", "/api/cleaners"),
  createCleaner: (d) => req("POST", "/api/cleaners", d),
  updateCleaner: (id, d) => req("PUT", `/api/cleaners/${id}`, d),
  deleteCleaner: (id) => req("DELETE", `/api/cleaners/${id}`),
};
