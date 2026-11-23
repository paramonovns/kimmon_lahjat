import "./style.css";
import { gifts } from "./gifts";
import { configured, requestReservations, ReservationError } from "./reservations";
import type { Reservation } from "./reservations";

const searchIcon =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="m10.5 7 .6 2.1 2.1.6-2.1.6-.6 2.1-.6-2.1-2.1-.6 2.1-.6z" fill="currentColor"/></svg>';
const star =
  '<svg class="sparkle" viewBox="0 0 32 32" aria-hidden="true"><path d="m16 0 3.8 12.2L32 16l-12.2 3.8L16 32l-3.8-12.2L0 16l12.2-3.8z" fill="currentColor"/></svg>';

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="snowfall" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
  <header class="hero">
    <div class="hero-top"><a class="wordmark" href="#" aria-label="К списку подарков">K<span>✦</span> / CHRISTMAS</a><span class="edition">СЕМЕЙНОЕ РОЖДЕСТВО · 2026</span></div>
    <div class="ornament ornament-left" aria-hidden="true"></div><div class="ornament ornament-right" aria-hidden="true"></div>
    <div class="hero-content"><p class="eyebrow">ПИСЬМО ДЕДУШКЕ МОРОЗУ</p>
    <h1>Подарки для Киммо<br> <span>на рождество</span></h1>
    <p class="hero-description">Маленький список больших желаний.<br>Выберите подарок — и станьте частью чуда.</p>
    <div class="hero-rule" aria-hidden="true"><span></span>${star}<span></span></div></div>
    <span class="hero-note">С любовью, для Киммо</span>
  </header>
  <main class="main" id="gifts">
    <div class="list-heading"><div><p class="eyebrow">ТО САМОЕ, О ЧЁМ МЕЧТАЕТСЯ</p><h2>Девять маленьких чудес <span>✧</span></h2></div><span id="gift-count" class="gift-count">9 желаний</span></div>
    <div class="connection" id="connection" role="status"><span class="status-dot"></span><span id="connection-text">${configured ? "Проверяем, какие подарки свободны…" : "Список готов. Резервирование пока не подключено."}</span></div>
    <ol class="gift-list" aria-label="Рождественские подарки Киммо">${gifts
      .map(
        (gift, index) => `
      <li class="gift-row" data-gift-id="${gift.id}">
        <div class="gift-content"><div class="gift-photo"><span class="gift-number">${String(index + 1).padStart(2, "0")}</span><img src="${import.meta.env.BASE_URL ?? "./"}images/${gift.image}" alt="${gift.subtitle}" width="240" height="210" ${index > 2 ? 'loading="lazy"' : ""} decoding="async" /><div class="photo-fallback" hidden>Фото скоро появится ${star}</div></div>
        <div class="gift-info"><p class="gift-category">${gift.category}</p><h3>${gift.title}</h3><p class="gift-subtitle">${gift.subtitle}</p><p class="gift-detail">${gift.detail}</p><span class="mine-label" hidden>✦ Этот подарок дарите вы</span></div>
        <div class="gift-actions"><a class="search-button" href="https://www.google.com/search?q=${encodeURIComponent(gift.query)}" target="_blank" rel="noopener noreferrer" aria-label="Найти в Google: ${gift.subtitle}">${searchIcon}<span>Найти подарок</span></a><button class="reserve-button" type="button" data-id="${gift.id}" disabled>Зарезервировать <span aria-hidden="true">↗</span></button><span class="action-note">Пусть это будет сюрприз</span></div></div>
        <div class="gift-wrap" hidden aria-label="Подарок уже зарезервирован"><div class="ribbon-horizontal"></div><div class="ribbon-vertical"></div><div class="bow" aria-hidden="true"><i></i><i></i></div><div class="gift-tag"><span>ДЛЯ КИММО</span><p>Сюрприз уже в пути</p><small>Кто-то взял это желание на себя</small></div><span class="wrap-sparkle" aria-hidden="true">✧</span></div>
      </li>`,
      )
      .join("")}</ol>
    <aside class="how-it-works"><span class="little-gift" aria-hidden="true">✧</span><div><h2>Как сохранить рождественское чудо?</h2><p>Нажмите «Зарезервировать», и для остальных подарок превратится в нарядную коробку. Вы по-прежнему увидите его и сможете снять резерв в этом же браузере.</p><p class="browser-note">Не очищайте данные сайта до праздника: в них хранится ваш ключ к резерву.</p></div></aside>
  </main>
  <footer><span class="footer-star" aria-hidden="true">✦</span><p>Самый главный подарок — быть рядом.</p><span>С РОЖДЕСТВОМ, КИММО!</span></footer>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
  <noscript>Включите JavaScript, чтобы увидеть список подарков и зарезервировать подарок.</noscript>
`;

let rows: Reservation[] = [];
let ready = false;
let updating = false;
let inFlight = false;
let revision = 0;
let toastTimer: ReturnType<typeof setTimeout>;
const connection = document.querySelector<HTMLDivElement>("#connection")!;
const connectionText = document.querySelector<HTMLSpanElement>("#connection-text")!;

function notify(message: string) {
  const toast = document.querySelector<HTMLDivElement>("#toast")!;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 6500);
}

function render() {
  for (const gift of gifts) {
    const row = document.querySelector<HTMLLIElement>(`[data-gift-id="${gift.id}"]`)!;
    const state = rows.find((r) => r.gift_id === gift.id);
    const wrapped = Boolean(state?.busy && !state.mine);
    const content = row.querySelector<HTMLDivElement>(".gift-content")!;
    const button = row.querySelector<HTMLButtonElement>(".reserve-button")!;
    const wasFocused = row.contains(document.activeElement);
    content.inert = wrapped;
    content.hidden = wrapped;
    row.querySelector<HTMLDivElement>(".gift-wrap")!.hidden = !wrapped;
    row.querySelector<HTMLSpanElement>(".mine-label")!.hidden = !state?.mine;
    row.classList.toggle("is-mine", Boolean(state?.mine));
    row.classList.toggle("is-wrapped", wrapped);
    button.disabled = !ready || updating || wrapped;
    button.classList.toggle("release-button", Boolean(state?.mine));
    button.innerHTML = state?.mine
      ? 'Снять резерв <span aria-hidden="true">↶</span>'
      : 'Зарезервировать <span aria-hidden="true">↗</span>';
    if (wasFocused && wrapped) {
      connection.tabIndex = -1;
      connection.focus({ preventScroll: true });
    }
  }
  if (ready) {
    const count = rows.filter((r) => !r.busy).length;
    document.querySelector("#gift-count")!.textContent = `Свободно ${count} из 9`;
  }
}

function setConnection(ok: boolean, message: string) {
  connection.classList.toggle("is-online", ok);
  connection.classList.toggle("is-offline", !ok);
  connectionText.textContent = message;
}

async function sync() {
  if (!configured || inFlight || updating || document.hidden) return;
  inFlight = true;
  const startedAtRevision = revision;
  try {
    const nextRows = await requestReservations();
    if (revision !== startedAtRevision) return;
    rows = nextRows;
    ready = true;
    setConnection(true, "Список обновляется для всех. Ваш резерв сохранится в этом браузере.");
  } catch (error) {
    if (revision !== startedAtRevision) return;
    ready = false;
    setConnection(
      false,
      error instanceof ReservationError && error.code === "storage"
        ? error.message
        : "Нет связи со списком резервов. Проверяем подключение…",
    );
  } finally {
    inFlight = false;
    render();
  }
}

document.querySelector(".gift-list")!.addEventListener("click", async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".reserve-button");
  if (!button || !ready || updating) return;
  const id = Number(button.dataset.id);
  const mine = rows.find((r) => r.gift_id === id)?.mine;
  updating = true;
  revision += 1;
  render();
  button.textContent = mine ? "Снимаем резерв…" : "Заворачиваем…";
  try {
    rows = await requestReservations(mine ? "release" : "reserve", id);
    notify(
      mine
        ? "Резерв снят. Подарок снова можно выбрать."
        : "Подарок за вами! Спасибо, что создаёте чудо для Киммо.",
    );
  } catch (error) {
    ready = false;
    notify(error instanceof Error ? error.message : "Не удалось сохранить резерв.");
  } finally {
    updating = false;
    render();
    void sync();
  }
});

for (const image of document.querySelectorAll<HTMLImageElement>(".gift-photo img")) {
  image.addEventListener("error", () => {
    image.hidden = true;
    image.parentElement!.querySelector<HTMLElement>(".photo-fallback")!.hidden = false;
  });
}

void sync();
setInterval(() => {
  void sync();
}, 4000);
window.addEventListener("focus", () => {
  void sync();
});
window.addEventListener("online", () => {
  void sync();
});
window.addEventListener("storage", (event) => {
  if (event.key === "kimmo.christmas.2026.owner" || event.key === null) void sync();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void sync();
});
