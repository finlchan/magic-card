const IMAGES = [
  { src: "photo/Clash Royale/Giant Skeleton.jpeg", alt: "Giant Skeleton", category: "Clash Royale" },
  { src: "photo/Clash Royale/Graveyard (2).jpeg", alt: "Graveyard", category: "Clash Royale" },
  { src: "photo/Clash Royale/Heal Spirit.jpeg", alt: "Heal Spirit", category: "Clash Royale" },
  { src: "photo/Clash Royale/HOG RIDER.jpeg", alt: "Hog Rider", category: "Clash Royale" },
  { src: "photo/Clash Royale/PEKKA.jpeg", alt: "PEKKA", category: "Clash Royale" },
  { src: "photo/Clash Royale/Skeleton Dragons (2).jpeg", alt: "Skeleton Dragons", category: "Clash Royale" },
  { src: "photo/Clash Royale/Three Musketeers.jpeg", alt: "Three Musketeers", category: "Clash Royale" },
  { src: "photo/Clash Royale/Witch.jpeg", alt: "Witch", category: "Clash Royale" },
  { src: "photo/Clash Royale/Rascals.jpeg", alt: "Rascals", category: "Clash Royale" },
  { src: "photo/Clash Royale/Bandit.jpeg", alt: "Bandit", category: "Clash Royale" },
  { src: "photo/Clash Royale/Bowler.jpeg", alt: "Bowler", category: "Clash Royale" },
  { src: "photo/Clash Royale/Lightning.jpeg", alt: "Lightning", category: "Clash Royale" },
  { src: "photo/Clash Royale/Miner.jpeg", alt: "Miner", category: "Clash Royale" },
  { src: "photo/Original/fc.jpeg", alt: "FC", category: "Original" },
];

const DURATION = 0.55;
const EASE = "power2.inOut";

gsap.registerPlugin(Flip);

const galleryWrap = document.getElementById("gallery-wrap");
const overlay = document.getElementById("overlay");
const searchInput = document.getElementById("search-input");
const categoryFilters = document.getElementById("category-filters");
const root = document.documentElement;

let selectedCategory = "all";
let searchQuery = "";
const cardEntries = [];

let activeCard = null;
let isAnimating = false;
let animatingTimer = null;
const paletteCache = new WeakMap();

function setAnimating(value) {
  isAnimating = value;
  clearTimeout(animatingTimer);
  if (value) {
    // Prevent clicks from getting permanently stuck if an animation is interrupted.
    animatingTimer = setTimeout(() => {
      isAnimating = false;
    }, DURATION * 1000 + 400);
  }
}

function softPastel(r, g, b, amount = 0.62) {
  return [
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  ];
}

function deepen(r, g, b, amount = 0.42) {
  return [
    Math.round(r * (1 - amount)),
    Math.round(g * (1 - amount)),
    Math.round(b * (1 - amount)),
  ];
}

function rgb(r, g, b, a = 1) {
  return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
}

function extractPalette(img) {
  if (paletteCache.has(img)) return paletteCache.get(img);

  try {
    return extractPaletteUnsafe(img);
  } catch (error) {
    console.warn("Palette extract failed:", error);
    return null;
  }
}

function extractPaletteUnsafe(img) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // Sample only the upper art area so parchment text boxes don't dominate.
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const artX = srcW * 0.08;
  const artY = srcH * 0.06;
  const artW = srcW * 0.84;
  const artH = srcH * 0.42;
  ctx.drawImage(
    img,
    Math.floor(artX),
    Math.floor(artY),
    Math.max(1, Math.floor(artW)),
    Math.max(1, Math.floor(artH)),
    0,
    0,
    size,
    size
  );

  const { data } = ctx.getImageData(0, 0, size, size);
  const buckets = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 180) continue;

    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    const sat = max === 0 ? 0 : (max - min) / max;

    // Prefer mid-tone, colorful pixels for a usable theme hue.
    if (lum < 0.1 || lum > 0.9 || sat < 0.1) continue;

    r = (r >> 4) << 4;
    g = (g >> 4) << 4;
    b = (b >> 4) << 4;
    const key = `${r},${g},${b}`;
    const weight = 0.35 + sat * 0.65;
    buckets.set(key, (buckets.get(key) || 0) + weight);
  }

  let bestKey = "122,150,168";
  let bestScore = -1;
  for (const [key, score] of buckets) {
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  const [r, g, b] = bestKey.split(",").map(Number);
  const [pr, pg, pb] = softPastel(r, g, b, 0.58);
  const [sr, sg, sb] = softPastel(r, g, b, 0.72);
  const [tr, tg, tb] = softPastel(
    Math.min(255, r + 18),
    Math.min(255, g + 10),
    Math.min(255, b + 6),
    0.66
  );
  const [ir, ig, ib] = deepen(r, g, b, 0.48);
  const [mr, mg, mb] = deepen(r, g, b, 0.28);

  const palette = {
    bgA: rgb(pr, pg, pb),
    bgB: rgb(sr, sg, sb),
    bgC: rgb(tr, tg, tb),
    ink: rgb(ir, ig, ib),
    muted: rgb(mr, mg, mb),
    accent: rgb(r, g, b),
    overlay: rgb(...deepen(r, g, b, 0.55), 0.44),
  };

  paletteCache.set(img, palette);
  return palette;
}

function applyTheme(palette) {
  if (!palette) return;
  root.style.setProperty("--bg-a", palette.bgA);
  root.style.setProperty("--bg-b", palette.bgB);
  root.style.setProperty("--bg-c", palette.bgC);
  root.style.setProperty("--ink", palette.ink);
  root.style.setProperty("--muted", palette.muted);
  root.style.setProperty("--accent", palette.accent);
  root.style.setProperty("--overlay", palette.overlay);
}

function readCardVars(card) {
  return {
    ratio: card.style.getPropertyValue("--card-ratio"),
    accent: card.style.getPropertyValue("--accent"),
  };
}

function restoreCardVars(card, vars) {
  if (vars.ratio) card.style.setProperty("--card-ratio", vars.ratio);
  if (vars.accent) card.style.setProperty("--accent", vars.accent);
}

/** Flip leaves inline layout styles that block .is-open CSS — wipe them. */
function clearFlipProps(card) {
  const vars = readCardVars(card);
  gsap.set(card, { clearProps: "all" });
  restoreCardVars(card, vars);
}

function fitCardFrame(img, slot, card) {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const ratio = `${srcW} / ${srcH}`;
  slot.style.aspectRatio = ratio;
  card.style.setProperty("--card-ratio", ratio);
  // Keep the image flush to the frame — no letterbox bars.
  img.style.objectFit = "cover";
  img.style.objectPosition = "center center";
}

function getCategories() {
  return [...new Set(IMAGES.map((item) => item.category))];
}

function buildCategoryFilters() {
  const categories = getCategories();
  const fragment = document.createDocumentFragment();

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "category-chip is-active";
  allBtn.dataset.category = "all";
  allBtn.textContent = "All";
  fragment.appendChild(allBtn);

  categories.forEach((category) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-chip";
    btn.dataset.category = category;
    btn.textContent = category;
    fragment.appendChild(btn);
  });

  categoryFilters.appendChild(fragment);
  categoryFilters.addEventListener("click", (event) => {
    const btn = event.target.closest(".category-chip");
    if (!btn) return;
    selectedCategory = btn.dataset.category;
    categoryFilters.querySelectorAll(".category-chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip === btn);
    });
    applyFilters();
  });
}

function matchesFilters(item) {
  const query = searchQuery.trim().toLowerCase();
  const categoryOk =
    selectedCategory === "all" || item.category === selectedCategory;
  const queryOk =
    !query ||
    item.alt.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query);
  return categoryOk && queryOk;
}

function applyFilters() {
  if (activeCard) {
    activeCard.classList.remove("is-open");
    clearFlipProps(activeCard);
    document.body.classList.remove("is-lightbox");
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
    activeCard = null;
    setAnimating(false);
  }

  const visible = IMAGES.filter(matchesFilters);
  const byCategory = new Map();

  visible.forEach((item) => {
    if (!byCategory.has(item.category)) byCategory.set(item.category, []);
    byCategory.get(item.category).push(item);
  });

  galleryWrap.replaceChildren();

  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No cards found";
    galleryWrap.appendChild(empty);
    return;
  }

  byCategory.forEach((items, category) => {
    const section = document.createElement("section");
    section.className = "category-section";

    const title = document.createElement("h2");
    title.className = "category-title";
    title.textContent = category;
    section.appendChild(title);

    const list = document.createElement("ul");
    list.className = "gallery";
    list.setAttribute("role", "list");

    items.forEach((item) => {
      const entry = cardEntries.find((c) => c.item === item);
      if (entry) list.appendChild(entry.slot);
    });

    section.appendChild(list);
    galleryWrap.appendChild(section);
  });
}

function buildGallery() {
  IMAGES.forEach((item) => {
    const li = document.createElement("li");
    li.className = "card-slot";
    li.dataset.category = item.category;
    li.dataset.name = item.alt.toLowerCase();

    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.setAttribute("aria-label", `放大查看 ${item.alt}`);

    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.alt;
    img.loading = "eager";
    img.decoding = "async";

    img.addEventListener("load", () => {
      if (img.naturalWidth && img.naturalHeight) {
        fitCardFrame(img, li, button);
      }
      const palette = extractPalette(img);
      if (palette) {
        button.style.setProperty("--accent", palette.accent);
        if (!activeCard) applyTheme(palette);
      }
    });

    button.appendChild(img);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      toggleCard(button);
    });
    button.addEventListener("mouseenter", () => {
      if (activeCard || !img.complete) return;
      applyTheme(extractPalette(img));
    });

    li.appendChild(button);
    cardEntries.push({ item, slot: li, card: button });
  });

  buildCategoryFilters();
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    applyFilters();
  });
  applyFilters();
}

function themeFromCard(card) {
  const img = card.querySelector("img");
  if (img?.complete) applyTheme(extractPalette(img));
}

function openCard(card) {
  themeFromCard(card);
  clearFlipProps(card);

  const state = Flip.getState(card);
  card.classList.add("is-open");
  document.body.classList.add("is-lightbox");
  overlay.classList.add("is-visible");
  overlay.setAttribute("aria-hidden", "false");
  activeCard = card;

  // Force layout so Flip measures the real centered size.
  void card.offsetWidth;

  Flip.from(state, {
    duration: DURATION,
    ease: EASE,
    absolute: true,
    nested: true,
    onComplete: () => {
      clearFlipProps(card);
      setAnimating(false);
    },
  });
}

function closeCard(card) {
  const state = Flip.getState(card);
  card.classList.remove("is-open");
  document.body.classList.remove("is-lightbox");
  overlay.classList.remove("is-visible");
  overlay.setAttribute("aria-hidden", "true");

  Flip.from(state, {
    duration: DURATION,
    ease: EASE,
    absolute: true,
    nested: true,
    onComplete: () => {
      clearFlipProps(card);
      activeCard = null;
      setAnimating(false);
    },
  });
}

function toggleCard(card) {
  if (isAnimating) return;
  setAnimating(true);

  if (activeCard && activeCard !== card) {
    const previous = activeCard;
    clearFlipProps(previous);
    clearFlipProps(card);
    themeFromCard(card);

    const state = Flip.getState([previous, card]);
    previous.classList.remove("is-open");
    card.classList.add("is-open");
    activeCard = card;
    void card.offsetWidth;

    Flip.from(state, {
      duration: DURATION,
      ease: EASE,
      absolute: true,
      nested: true,
      onComplete: () => {
        clearFlipProps(card);
        clearFlipProps(previous);
        setAnimating(false);
      },
    });
    return;
  }

  if (activeCard === card) {
    closeCard(card);
    return;
  }

  openCard(card);
}

overlay.addEventListener("click", () => {
  if (!activeCard || isAnimating) return;
  setAnimating(true);
  closeCard(activeCard);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !activeCard || isAnimating) return;
  setAnimating(true);
  closeCard(activeCard);
});

if (typeof gsap === "undefined" || typeof Flip === "undefined") {
  console.error("GSAP Flip failed to load — lightbox disabled.");
} else {
  buildGallery();
}
