export interface Reservation {
  gift_id: number;
  busy: boolean;
  mine: boolean;
}
export type Action = "list" | "reserve" | "release";

const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key);
const tokenKey = "kimmo.christmas.2026.owner";

export class ReservationError extends Error {
  constructor(
    message: string,
    readonly code: "network" | "conflict" | "storage" | "configuration",
  ) {
    super(message);
  }
}

function getToken(): string {
  try {
    let token = localStorage.getItem(tokenKey);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
      localStorage.setItem(tokenKey, token);
    }
    return token;
  } catch {
    throw new ReservationError(
      "Разрешите сохранение данных в браузере, чтобы вы могли снять свой резерв.",
      "storage",
    );
  }
}

export async function requestReservations(
  action: Action = "list",
  giftId: number | null = null,
): Promise<Reservation[]> {
  if (!configured)
    throw new ReservationError("Резервирование пока не подключено.", "configuration");
  const token = getToken();
  const response = await fetch(`${url}/rest/v1/rpc/kimmo_gifts`, {
    method: "POST",
    headers: { apikey: key!, "Content-Type": "application/json" },
    body: JSON.stringify({ p_action: action, p_gift_id: giftId, p_token: token }),
    signal: AbortSignal.timeout(12000),
  }).catch(() => {
    throw new ReservationError(
      "Не удалось связаться с рождественской почтой. Попробуйте ещё раз.",
      "network",
    );
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { code?: string };
    if (body.code === "23505")
      throw new ReservationError(
        "Кто-то успел зарезервировать этот подарок. Выберите другой.",
        "conflict",
      );
    throw new ReservationError("Не удалось обновить резерв. Попробуйте ещё раз.", "network");
  }
  const rows: unknown = await response.json();
  if (
    !Array.isArray(rows) ||
    rows.length !== 9 ||
    rows.some(
      (r: Reservation) =>
        !r ||
        !Number.isInteger(r.gift_id) ||
        r.gift_id < 7 ||
        r.gift_id > 15 ||
        typeof r.busy !== "boolean" ||
        typeof r.mine !== "boolean",
    ) ||
    new Set(rows.map((r: Reservation) => r.gift_id)).size !== 9
  ) {
    throw new ReservationError(
      "Не удалось прочитать список резервов. Попробуйте ещё раз.",
      "network",
    );
  }
  return rows as Reservation[];
}
