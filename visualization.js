const classLabelConfig = {
  rightMargin: 50, // Spazio dal bordo destro
  fontSize: 24,
  fontFamily: "'Host Grotesk', sans-serif",
  textColor: "rgba(255, 255, 255, 0.8)",
  lineHeight: 30,
  padding: 10,
  minVisibleHeight: 100, // Altezza minima per cui mostrare l'etichetta
};

const config = {
  scaleFactor: 1,
  verticalSpacing: 400,
  horizontalScale: 20900,
  zoomSpeed: 0.0006,
  dragSensitivity: 0.9,
  smoothFactor: 0.15,
  inertiaDecay: 0.88,
  maxZoom: 0.5,
  minZoom: 0.08,
  padding: 200,
  hoverScale: 2,
  inactiveOpacity: 0.05,
  riverOpacity: 0.2,
  mapBounds: {
    minLon: 11.9419,
    minLat: 45.4775,
    maxLon: 12.333,
    maxLat: 45.6362,
  },
  riverVerticalOffset: 3500,
  riverHorizontalOffset: 600,
  riverLandmarks: [
    {
      name: "Sorgente /Resana",
      latitude: 45.627494,
      longitude: 11.953631,
      description: "Punto sorgivo del fiume Marzenego",
    },
    {
      name: "Oasi di Noale",
      latitude: 45.553523,
      longitude: 12.077962,
      description: "Oasi naturalistica protetta gestita dal WWF",
    },
    {
      name: "Oasi Lycaena",
      latitude: 45.533834970262895,
      longitude: 12.132178611139993,
      description:
        "Area protetta dedicata alla tutela della biodiversità locale",
    },
    {
      name: "Golena Draganziolo",
      latitude: 45.592942281643985,
      longitude: 12.040934661984329,
      description:
        "Zona golenale importante per il contenimento delle piene e la biodiversità ripariale.",
    },

    {
      name: "Mestre",
      latitude: 45.49167,
      longitude: 12.24538,
      description:
        "Tratto urbano del Marzenego che attraversa Mestre, segnando il paesaggio e l’identità urbana.",
    },
    {
      name: "Foce",
      latitude: 45.499535,
      longitude: 12.332105,
      description:
        "Punto terminale del Marzenego dove sfocia nella laguna veneziana tramite il Canale Osellino.",
    },
  ],
  landmarkBaseOffset: 200, // Distanza base dal fiume (Y comune)
  unfoldingPath: {
    url: "unfoldingpath.jpg",
    width: 21000,
    aspectRatio: 54.6,
    offsetX: 0,
    fixedYPosition: -0.4, // Centrato verticalmente
    topMargin: 120,
    separation: 1500,
    opacity: 1, // Opacità sempre piena per il fiume
  },
};

const state = {
  unfoldingPath: {
    img: null,
    loaded: false,
    actualHeight: 0, // sarà calcolato al caricamento
  },
  targetView: { x: 0, y: 0 },
  currentView: { x: 0, y: 0 },
  scale: 1,
  images: [],
  filteredImages: [],
  isDragging: false,
  lastPos: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  lastTime: 0,
  loading: true,
  contentBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
  hoveredImage: null,
  mousePos: { x: 0, y: 0 },
  clickStartPos: null,
  isOverImage: false,
  activeFilters: {
    kingdom: null,
    class: null,
    year: null,
  },
  filtersActive: false,
  hoveredImages: [],
  riverSvg: null,
  riverLoaded: false,
  riverWidth: 0,
  riverHeight: 0,
};

const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
const exploreButton = document.getElementById("explore-button");
const infoPanel = document.getElementById("info-panel");
const infoPanelClose = document.getElementById("info-panel-close");
const kingdomFilter = document.getElementById("kingdom-filter");
const classFilter = document.getElementById("class-filter");
const yearFilter = document.getElementById("year-filter");

const infoPanelTitle = document.getElementById("info-panel-title");
const infoPanelImage = document.getElementById("info-panel-image");
const scientificName = document.getElementById("scientific-name");
const kingdomName = document.getElementById("kingdom-name");
const className = document.getElementById("class-name");
const observedDate = document.getElementById("observed-date");
const coordinates = document.getElementById("coordinates");

const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYWxlc3NpYWxwciIsImEiOiJjbTloNzQ3em4wMmRtMmhxemR5d2puanN4In0.Re5Z9UjfnZLIC7PSiMDQeg";
const MAP_STYLE = "satellite-v9"; // Stile satellitare
const MAP_ZOOM = 15; // Livello di zoom
const MAP_WIDTH = 600; // Larghezza in pixel
const MAP_HEIGHT = 150; // Altezza in pixel

// Funzione per estrarre l'anno dalla data di osservazione
function getYearFromObservation(observedDate) {
  if (!observedDate) return null;
  try {
    const date = new Date(observedDate);
    return isNaN(date.getTime()) ? null : date.getFullYear();
  } catch {
    return null;
  }
}

// Funzione per generare l'URL della mappa statica
function getMapboxStaticUrl(lat, lon, year) {
  const baseUrl = `https://api.mapbox.com/styles/v1/mapbox/${MAP_STYLE}/static`;
  const marker = `pin-l+ff0000(${lon},${lat})`;
  const center = `${lon},${lat},${MAP_ZOOM},0`;
  const size = `${MAP_WIDTH}x${MAP_HEIGHT}`;

  let url = `${baseUrl}/${marker}/${center}/${size}?access_token=${MAPBOX_TOKEN}`;

  // Aggiungi parametro per immagini storiche se disponibile
  if (year && year < new Date().getFullYear()) {
    url += `&before=${year}-12-31`;
  }

  return url;
}

function showExploreButton() {
  const loadingText = document.getElementById("loading-text");
  const exploreButton = document.getElementById("explore-button");

  loadingText.classList.add("hidden");

  // Dopo che hai caricato tutto, sostituisci loading con il bottone
  setTimeout(() => {
    document.getElementById("loading-text").classList.add("hidden");
    document.getElementById("explore-button").classList.add("visible");
  }, 2000); // o al termine di caricamento vero
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
async function loadRiverAssets() {
  try {
    // Carica unfoldingpath.png
    state.unfoldingPath.img = new Image();
    state.unfoldingPath.img.onload = () => {
      // Calcola l'aspect ratio REALE (altezza/larghezza)
      const realAspectRatio =
        state.unfoldingPath.img.naturalHeight /
        state.unfoldingPath.img.naturalWidth;

      console.log("Aspect ratio reale:", realAspectRatio); // Debug

      // Aggiorna la configurazione
      config.unfoldingPath.aspectRatio = realAspectRatio; // <-- Qui lo imposti!

      state.unfoldingPath.actualHeight =
        config.unfoldingPath.width * realAspectRatio; // Usa l'aspect ratio reale
      state.unfoldingPath.loaded = true;
    };
    state.unfoldingPath.img.src = config.unfoldingPath.url;
  } catch (err) {
    console.error("Error loading assets:", err);
  }
}

function drawUnfoldingPath() {
  if (!state.unfoldingPath.loaded) return;

  ctx.save();

  // Sistema di coordinate centrato e scalato
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(state.scale, state.scale);
  ctx.translate(-state.currentView.x, -state.currentView.y);

  const width = config.unfoldingPath.width;
  const height = width / config.unfoldingPath.aspectRatio;

  // Posizione Y fissa rispetto al contenuto
  const contentY = -config.unfoldingPath.separation;
  const contentX = 0;

  ctx.globalAlpha = config.unfoldingPath.opacity;

  ctx.drawImage(
    state.unfoldingPath.img,
    contentX - width / 2,
    contentY - height / 2,
    width,
    height
  );

  ctx.restore();
}

function setupEventListeners() {
  // --- Custom dropdown toggle on click (close if clicking selected again) ---
  function setupCustomDropdownToggle(dropdown) {
    const selected = dropdown.querySelector(".custom-select__selected");
    // RIMUOVI EVENTUALE mousedown, ASSICURA SOLO CLICK
    selected.addEventListener("click", function (e) {
      e.stopPropagation();
      // Toggle: if already open, close; if closed, open
      if (dropdown.classList.contains("open")) {
        dropdown.classList.remove("open");
      } else {
        // Close all other dropdowns
        document.querySelectorAll(".custom-select.open").forEach((d) => {
          if (d !== dropdown) d.classList.remove("open");
        });
        dropdown.classList.add("open");
      }
    });
  }

  [kingdomFilter, classFilter, yearFilter].forEach((dropdown) => {
    // Rimuovi eventuali listener mousedown residui (safety)
    const selected = dropdown.querySelector(".custom-select__selected");
    selected.replaceWith(selected.cloneNode(true));
    // Re-attach click listener
    setupCustomDropdownToggle(dropdown);
  });
  // Global click to close all dropdowns if click outside any .custom-select
  document.addEventListener("mousedown", function (e) {
    if (!e.target.closest(".custom-select")) {
      document
        .querySelectorAll(".custom-select.open")
        .forEach((d) => d.classList.remove("open"));
    }
  });

  // ...existing code for canvas drag, zoom, etc...
  canvas.addEventListener("mousedown", (e) => {
    state.isDragging = true;
    state.lastPos = { x: e.clientX, y: e.clientY };
    state.velocity = { x: 0, y: 0 };
    state.clickStartPos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("mousemove", (e) => {
    state.mousePos = { x: e.clientX, y: e.clientY };

    if (state.isDragging) {
      const dx =
        (e.clientX - state.lastPos.x) *
        (1 / state.scale) *
        config.dragSensitivity;
      const dy =
        (e.clientY - state.lastPos.y) *
        (1 / state.scale) *
        config.dragSensitivity;
      state.targetView.x -= dx;
      state.targetView.y -= dy;
      state.velocity = { x: -dx, y: -dy };
      state.lastPos = { x: e.clientX, y: e.clientY };
    }

    updateHoverEffect();
  });

  window.addEventListener("mouseup", (e) => {
    if (
      state.clickStartPos &&
      Math.abs(e.clientX - state.clickStartPos.x) < 5 &&
      Math.abs(e.clientY - state.clickStartPos.y) < 5
    ) {
      if (state.hoveredImage && state.hoveredImage.active) {
        showInfoPanel(state.hoveredImage);
      }
    }
    state.isDragging = false;
    state.clickStartPos = null;
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const mouseX = e.clientX - canvas.width / 2;
    const mouseY = e.clientY - canvas.height / 2;

    const worldX = state.currentView.x + mouseX / state.scale;
    const worldY = state.currentView.y + mouseY / state.scale;

    const delta = -e.deltaY * config.zoomSpeed;
    const newScale = state.scale * (1 + delta);
    state.scale = Math.max(config.minZoom, Math.min(config.maxZoom, newScale));

    state.targetView.x = worldX - mouseX / state.scale;
    state.targetView.y = worldY - mouseY / state.scale;
  });

  exploreButton.addEventListener("click", () => {
    document.body.classList.remove("loading"); // Aggiungi questa linea
    loadingOverlay.style.opacity = "0";
    setTimeout(() => {
      loadingOverlay.style.display = "none";
    }, 500);
  });

  infoPanelClose.addEventListener("click", () => {
    infoPanel.style.display = "none";
  });

  // Gestione apertura/chiusura menu custom e preview filtro su hover sulle opzioni
  // PATCH: preview separata dalla selezione attiva
  state.previewFilters = null;
  [
    { filter: kingdomFilter, key: "kingdom" },
    { filter: classFilter, key: "class" },
    { filter: yearFilter, key: "year" },
  ].forEach(({ filter, key }) => {
    let lastPreview = null;
    const optionsContainer = filter.querySelector(".custom-select__options");
    // Use mouseover/mouseleave only if menu is open
    optionsContainer.addEventListener("mouseover", (e) => {
      if (!filter.classList.contains("open")) return;
      const opt = e.target.closest(".custom-select__option");
      if (opt && opt.dataset.value !== undefined) {
        if (lastPreview === null) {
          lastPreview = {
            kingdom: state.activeFilters.kingdom,
            class: state.activeFilters.class,
            year: state.activeFilters.year,
          };
        }
        // Applica preview separata
        state.previewFilters = {
          kingdom:
            key === "kingdom" ? opt.dataset.value : state.activeFilters.kingdom,
          class:
            key === "class" ? opt.dataset.value : state.activeFilters.class,
          year: key === "year" ? opt.dataset.value : state.activeFilters.year,
        };
        updateFilters();
      }
    });
    optionsContainer.addEventListener("mouseleave", (e) => {
      if (!filter.classList.contains("open")) return;
      if (lastPreview !== null) {
        state.previewFilters = null;
        updateFilters();
        lastPreview = null;
      }
    });
    optionsContainer.addEventListener("mousedown", (e) => {
      if (!filter.classList.contains("open")) return;
      const opt = e.target.closest(".custom-select__option");
      if (opt && opt.dataset.value !== undefined) {
        // Conferma la selezione: aggiorna activeFilters, azzera preview
        state.activeFilters[key] = opt.dataset.value || null;
        state.previewFilters = null;
        updateFilters();
        // Invia evento custom-select-change per aggiornare UI
        const value = opt.dataset.value;
        const event = new CustomEvent("custom-select-change", {
          detail: { value },
          bubbles: true,
        });
        filter.dispatchEvent(event);
        filter.classList.remove("open");
      }
    });
  });

  kingdomFilter.addEventListener("custom-select-change", (e) => {
    state.activeFilters.kingdom = e.detail.value || null;
    state.activeFilters.class = null; // Resetta il filtro classe
    // Aggiorna selezione visiva Regno
    kingdomFilter.querySelectorAll(".custom-select__option").forEach((opt) => {
      if (opt.dataset.value === (e.detail.value || "")) {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });
    // Aggiorna testo selezionato
    const kingdomSelectedText = kingdomFilter.querySelector(
      ".custom-select__selected-text"
    );
    kingdomSelectedText.textContent = e.detail.value || "Regno";
    // Reset visuale del filtro classe
    const classSelectedText = classFilter.querySelector(
      ".custom-select__selected-text"
    );
    classSelectedText.textContent = "Classe";
    // Mostra solo le classi disponibili per il regno selezionato
    updateClassFilter(e.detail.value || null);
    classFilter.querySelectorAll(".custom-select__option").forEach((opt) => {
      if (opt.dataset.value === "") {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });
    updateFilters();
    kingdomFilter.classList.remove("open");
  });
  classFilter.addEventListener("custom-select-change", (e) => {
    state.activeFilters.class = e.detail.value || null;
    // Aggiorna selezione visiva Classe
    classFilter.querySelectorAll(".custom-select__option").forEach((opt) => {
      if (opt.dataset.value === (e.detail.value || "")) {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });
    // Aggiorna testo selezionato
    const classSelectedText = classFilter.querySelector(
      ".custom-select__selected-text"
    );
    classSelectedText.textContent = e.detail.value || "Classe";
    updateFilters();
    classFilter.classList.remove("open");
  });
  yearFilter.addEventListener("custom-select-change", (e) => {
    state.activeFilters.year = e.detail.value || null;
    // Aggiorna selezione visiva Anno
    yearFilter.querySelectorAll(".custom-select__option").forEach((opt) => {
      if (opt.dataset.value === (e.detail.value || "")) {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });
    // Aggiorna testo selezionato
    const yearSelectedText = yearFilter.querySelector(
      ".custom-select__selected-text"
    );
    yearSelectedText.textContent = e.detail.value || "Anno";
    updateFilters();
    yearFilter.classList.remove("open");
  });
}

function handleImageClick(e) {
  const mouseX = e.clientX - canvas.width / 2;
  const mouseY = e.clientY - canvas.height / 2;
  const worldX = state.currentView.x + mouseX / state.scale;
  const worldY = state.currentView.y + mouseY / state.scale;

  let clickedImage = null;
  let maxArea = 0;

  state.filteredImages.forEach((img) => {
    if (!img.loaded || !img.active) return;

    const scale = img === state.hoveredImage ? config.hoverScale : 1;
    const width = img.width * scale;
    const height = img.height * scale;

    const left = img.x - width / 2;
    const right = img.x + width / 2;
    const top = img.y - height / 2;
    const bottom = img.y + height / 2;

    if (
      worldX >= left &&
      worldX <= right &&
      worldY >= top &&
      worldY <= bottom
    ) {
      const area = width * height;
      if (area > maxArea) {
        maxArea = area;
        clickedImage = img;
      }
    }
  });

  if (clickedImage) {
    showInfoPanel(clickedImage);
  }
}

function updateHoverEffect() {
  if (state.isDragging) {
    if (state.hoveredImage) {
      state.hoveredImage = null;
      state.isOverImage = false;
    }
    return;
  }

  const mouseX = state.mousePos.x - canvas.width / 2;
  const mouseY = state.mousePos.y - canvas.height / 2;
  const worldX = state.currentView.x + mouseX / state.scale;
  const worldY = state.currentView.y + mouseY / state.scale;

  let closestImage = null;
  let minDistance = Infinity;

  state.filteredImages.forEach((img) => {
    if (!img.loaded || !img.active) return;

    const scale = img === state.hoveredImage ? config.hoverScale : 1;
    const width = img.width * scale;
    const height = img.height * scale;

    const dx = img.x - worldX;
    const dy = img.y - worldY;
    const distance = dx * dx + dy * dy;

    if (distance < minDistance && distance < (width * height) / 2) {
      minDistance = distance;
      closestImage = img;
    }
  });

  if (closestImage) {
    const scale = closestImage === state.hoveredImage ? config.hoverScale : 1;
    const width = closestImage.width * scale;
    const height = closestImage.height * scale;

    const left = closestImage.x - width / 2;
    const right = closestImage.x + width / 2;
    const top = closestImage.y - height / 2;
    const bottom = closestImage.y + height / 2;

    state.isOverImage =
      worldX >= left && worldX <= right && worldY >= top && worldY <= bottom;
  } else {
    state.isOverImage = false;
  }

  if (state.hoveredImage && state.hoveredImage !== closestImage) {
    state.hoveredImage = null;
  }

  if (state.isOverImage && closestImage) {
    state.hoveredImage = closestImage;
  }
}

function showInfoPanel(imageData) {
  document.body.classList.add("popup-open");

  // --- RESETTA CONTENUTO PRIMA DI POPOLARE ---
  infoPanelTitle.textContent = "";
  infoPanelImage.src = "";
  infoPanelImage.alt = "";
  infoPanelImage.style.objectFit = "cover";
  infoPanelImage.style.borderRadius = "0";
  infoPanelImage.style.aspectRatio = "1/1";
  infoPanelImage.style.width = "100%";
  infoPanelImage.style.height = "auto";
  const metadataContainer = document.getElementById("metadata-container");
  metadataContainer.innerHTML = "";
  const mapContainer = document.getElementById("mini-map-container");
  mapContainer.style.display = "none";
  const mapImg = document.getElementById("mini-map");
  mapImg.src = "";
  mapImg.style.display = "block";
  document.getElementById("map-year-badge").style.display = "none";
  document.getElementById("map-loading").style.display = "block";
  document.getElementById("map-loading").textContent = "Caricamento mappa...";

  // --- POI POPOLA I NUOVI DATI ---
  infoPanelTitle.textContent =
    imageData.metadata.scientific_name || "Sconosciuto";
  // Usa versione large per immagini remote (iNaturalist)
  let popupUrl = imageData.url;
  if (
    typeof popupUrl === "string" &&
    popupUrl.match(/\/photos\//) &&
    popupUrl.match(/small\./)
  ) {
    popupUrl = popupUrl.replace(/small\./, "large.");
  }
  infoPanelImage.src = popupUrl;

  // Popola i metadati come etichette
  const metadataFields = {
    observed_on: "Data osservazione",
    taxon_kingdom_name: "Regno",
    taxon_phylum_name: "Phylum",
    taxon_class_name: "Classe",
    taxon_order_name: "Ordine",
    taxon_family_name: "Famiglia",
    taxon_genus_name: "Genere",
  };

  Object.entries(metadataFields).forEach(([key, label]) => {
    if (imageData.metadata[key]) {
      const tag = document.createElement("div");
      tag.className = "metadata-tag";
      tag.innerHTML = `
  <span class="label">${label}:</span>
  <span class="value">${imageData.metadata[key]}</span>
`;
      metadataContainer.appendChild(tag);
    }
  });

  // Gestione mappa (rimane invariata)
  const lat = imageData.metadata.latitude;
  const lon = imageData.metadata.longitude;

  if (lat && lon) {
    mapContainer.style.display = "block";

    const observationYear = getYearFromObservation(
      imageData.metadata.observed_on
    );
    const yearBadge = document.getElementById("map-year-badge");

    if (observationYear) {
      yearBadge.textContent = `Mappa: ${observationYear}`;
      yearBadge.style.display = "block";
    } else {
      yearBadge.style.display = "none";
    }

    mapImg.classList.add("loading");
    document.getElementById("map-loading").style.display = "block";
    mapImg.style.borderRadius = "0";

    mapImg.onload = function () {
      this.classList.remove("loading");
      document.getElementById("map-loading").style.display = "none";
    };

    mapImg.onerror = function () {
      document.getElementById("map-loading").textContent =
        "Mappa non disponibile";
      this.style.display = "none";
    };

    mapImg.src = getMapboxStaticUrl(lat, lon, observationYear);
  } else {
    mapContainer.style.display = "none";
  }

  infoPanel.style.display = "block";
}

// Aggiungi questo alla chiusura del popup
infoPanelClose.addEventListener("click", () => {
  document.body.classList.remove("popup-open");
  infoPanel.style.display = "none";
});
function updateFilters() {
  // Usa previewFilters se presente, altrimenti activeFilters
  const filters = state.previewFilters || state.activeFilters;
  const kingdom = filters.kingdom;
  const cls = filters.class;
  const year = filters.year;

  state.filtersActive = !!(kingdom || cls || year);

  state.filteredImages.forEach((img) => {
    const matchesKingdom =
      !kingdom || img.metadata.taxon_kingdom_name === kingdom;
    const matchesClass = !cls || img.metadata.taxon_class_name === cls;

    let matchesYear = true;
    if (year && img.metadata.observed_on) {
      const observedYear = new Date(img.metadata.observed_on)
        .getFullYear()
        .toString();
      matchesYear = observedYear === year;
    }

    img.active = matchesKingdom && matchesClass && matchesYear;
  });

  if (kingdom && kingdom !== kingdomFilter.dataset.current) {
    updateClassFilter(kingdom);
    kingdomFilter.dataset.current = kingdom;
  }
  // NON aggiornare i bounds quando si filtrano le immagini: la vista resta stabile
  // (Non chiamare calculateContentBounds qui)
}

function updateClassFilter(kingdom) {
  if (!kingdom) {
    resetClassFilter();
    return;
  }

  const classes = new Set();
  state.filteredImages.forEach((img) => {
    if (img.metadata.taxon_kingdom_name === kingdom) {
      classes.add(img.metadata.taxon_class_name);
    }
  });

  const optionsContainer = classFilter.querySelector(".custom-select__options");
  optionsContainer.innerHTML = "";
  // Prima opzione "Classe"
  const first = document.createElement("div");
  first.className = "custom-select__option";
  first.dataset.value = "";
  first.textContent = "Classe";
  optionsContainer.appendChild(first);
  Array.from(classes)
    .sort()
    .forEach((cls) => {
      if (cls) {
        const opt = document.createElement("div");
        opt.className = "custom-select__option";
        opt.dataset.value = cls;
        opt.textContent = cls;
        optionsContainer.appendChild(opt);
      }
    });
}

function resetClassFilter() {
  const allClasses = [
    "Mammalia",
    "Aves",
    "Reptilia",
    "Amphibia",
    "Actinopterygii",
    "Insecta",
    "Arachnida",
    "Chilopoda",
    "Diplopoda",
    "Malacostraca",
    "Gastropoda",
    "Bivalvia",
    "Clitellata",
    "Magnoliopsida",
    "Liliopsida",
    "Polypodiopsida",
    "Bryopsida",
    "Agaricomycetes",
    "Pucciniomycetes",
    "Phaeophyceae",
    "Lecanoromycetes",
  ];

  const optionsContainer = classFilter.querySelector(".custom-select__options");
  optionsContainer.innerHTML = "";
  const first = document.createElement("div");
  first.className = "custom-select__option";
  first.dataset.value = "";
  first.textContent = "Classe";
  optionsContainer.appendChild(first);
  allClasses.forEach((cls) => {
    const opt = document.createElement("div");
    opt.className = "custom-select__option";
    opt.dataset.value = cls;
    opt.textContent = cls;
    optionsContainer.appendChild(opt);
  });
}

function updateYearFilter() {
  const years = new Set();
  state.filteredImages.forEach((img) => {
    if (img.metadata.observed_on) {
      const year = new Date(img.metadata.observed_on).getFullYear().toString();
      years.add(year);
    }
  });

  const optionsContainer = yearFilter.querySelector(".custom-select__options");
  optionsContainer.innerHTML = "";
  const first = document.createElement("div");
  first.className = "custom-select__option";
  first.dataset.value = "";
  first.textContent = "Anno";
  optionsContainer.appendChild(first);
  Array.from(years)
    .sort((a, b) => b - a)
    .forEach((year) => {
      if (year) {
        const opt = document.createElement("div");
        opt.className = "custom-select__option";
        opt.dataset.value = year;
        opt.textContent = year;
        optionsContainer.appendChild(opt);
      }
    });
}

async function loadJSONData() {
  try {
    const res = await fetch("marzenego.json");
    const data = await res.json();
    const validEntries = data.filter(
      (d) => d.longitude && d.latitude && d.taxon_class_name && d.image_url
    );

    const classOrder = [
      "Mammalia",
      "Aves",
      "Reptilia",
      "Amphibia",
      "Actinopterygii",
      "Insecta",
      "Arachnida",
      "Chilopoda",
      "Diplopoda",
      "Malacostraca",
      "Gastropoda",
      "Bivalvia",
      "Clitellata",
      "Magnoliopsida",
      "Liliopsida",
      "Polypodiopsida",
      "Bryopsida",
      "Agaricomycetes",
      "Pucciniomycetes",
      "Phaeophyceae",
      "Lecanoromycetes",
    ];

    const classMap = Object.fromEntries(
      classOrder.map((cls, idx) => [cls, idx * config.verticalSpacing])
    );

    const longitudes = validEntries.map((d) => parseFloat(d.longitude));
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);

    state.images = validEntries.map((d) => {
      const x =
        ((parseFloat(d.longitude) - minLon) / (maxLon - minLon)) *
          config.horizontalScale -
        config.horizontalScale / 2;
      const y = classMap[d.taxon_class_name] || 0;
      return {
        x,
        y,
        url: d.image_url,
        img: null,
        loaded: false,
        metadata: d,
        width: 0,
        height: 0,
        active: true,
        originalWidth: 0,
        originalHeight: 0,
      };
    });

    state.filteredImages = [...state.images];

    await loadImagesWithLimit(10);
    calculateContentBounds();
    centerContent(); // Ricentra SOLO al primo caricamento
    updateYearFilter();

    // Quando il caricamento è completato
    loadingText.style.opacity = "0";
    setTimeout(() => {
      loadingText.style.display = "none";
      exploreButton.style.display = "block";
      setTimeout(() => {
        exploreButton.style.opacity = "1";
      }, 10);
    }, 300);
    exploreButton.classList.add("visible"); // Aggiungi questa linea
    state.loading = false;
  } catch (err) {
    console.error("Errore caricamento JSON:", err);
    loadingText.textContent = "Errore nel caricamento dei dati";
    exploreButton.style.display = "block";
    exploreButton.textContent = "RIPROVA";
    exploreButton.onclick = () => window.location.reload();
  }
}

function calculateContentBounds() {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  // Calcola bounds per le immagini
  state.filteredImages.forEach((img) => {
    if (img.loaded && img.active) {
      const hw = img.width / 2;
      const hh = img.height / 2;
      minX = Math.min(minX, img.x - hw);
      maxX = Math.max(maxX, img.x + hw);
      minY = Math.min(minY, img.y - hh);
      maxY = Math.max(maxY, img.y + hh);
    }
  });

  // Aggiungi spazio per l'unfolding path
  minX = Math.min(minX, -config.horizontalScale / 2);
  maxX = Math.max(maxX, config.horizontalScale / 2);
  minY = Math.min(
    minY,
    -config.unfoldingPath.separation - state.unfoldingPath.actualHeight / 2
  );
  maxY = Math.max(
    maxY,
    -config.unfoldingPath.separation + state.unfoldingPath.actualHeight / 2
  );

  if (minX === Infinity) {
    minX = -config.horizontalScale / 2;
    maxX = config.horizontalScale / 2;
    minY = -config.unfoldingPath.separation - state.unfoldingPath.actualHeight;
    maxY = config.verticalSpacing * 20;
  }

  state.contentBounds = {
    minX: minX - config.padding,
    maxX: maxX + config.padding,
    minY: minY - config.padding,
    maxY: maxY + config.padding,
  };
}

function centerContent() {
  const w = state.contentBounds.maxX - state.contentBounds.minX;
  const h = state.contentBounds.maxY - state.contentBounds.minY;
  const scaleX = canvas.width / w;
  const scaleY = canvas.height / h;
  state.scale = Math.min(scaleX, scaleY) * 0.9;
  state.scale = Math.max(config.minZoom, Math.min(config.maxZoom, state.scale));
  const cx = (state.contentBounds.minX + state.contentBounds.maxX) / 2;
  const cy = (state.contentBounds.minY + state.contentBounds.maxY) / 2;
  state.targetView = { x: cx, y: cy };
  state.currentView = { x: cx, y: cy };
}

async function loadImagesWithLimit(limit) {
  const queue = [...state.images];
  const workers = Array.from({ length: limit }, () =>
    (async () => {
      while (queue.length > 0) {
        const imgData = queue.shift();
        await loadSingleImage(imgData);
      }
    })()
  );
  await Promise.all(workers);
}

async function loadSingleImage(imgData) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imgData.img = img;
      imgData.loaded = true;
      imgData.originalWidth = img.width * config.scaleFactor;
      imgData.originalHeight = img.height * config.scaleFactor;
      imgData.width = imgData.originalWidth;
      imgData.height = imgData.originalHeight;

      // Estrai il numero dall'URL (es. da "https://example.com/12345/small.jpg" ottieni "12345")
      const urlParts = imgData.url.split("/");
      const imageId = urlParts[urlParts.length - 2]; // Prende la penultima parte dell'URL

      console.log("Immagine caricata:", {
        id: imageId,
        classe: imgData.metadata.taxon_class_name,
        regno: imgData.metadata.taxon_kingdom_name,
        latitudine: imgData.metadata.latitude,
        longitudine: imgData.metadata.longitude,
      });

      resolve();
    };
    img.onerror = () => {
      console.error("Error loading image:", imgData.url);
      resolve();
    };
    img.src = imgData.url;
  });
}

function isVisible(img, area) {
  if (!img.loaded) return false;

  const scale = img === state.hoveredImage ? config.hoverScale : 1;
  const width = img.width * scale;
  const height = img.height * scale;

  return (
    img.x + width / 2 >= area.left &&
    img.x - width / 2 <= area.right &&
    img.y + height / 2 >= area.top &&
    img.y - height / 2 <= area.bottom
  );
}

function calculateVisibleArea() {
  return {
    left: state.currentView.x - canvas.width / state.scale / 2,
    right: state.currentView.x + canvas.width / state.scale / 2,
    top: state.currentView.y - canvas.height / state.scale / 2,
    bottom: state.currentView.y + canvas.height / state.scale / 2,
  };
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(" ");
  let line = "";
  let linesCount = 0;

  for (let i = 0; i < words.length && linesCount < maxLines; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, y + linesCount * lineHeight);
      linesCount++;
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }

  if (linesCount < maxLines) {
    ctx.fillText(line, x, y + linesCount * lineHeight);
  } else if (words.length > 0) {
    ctx.fillText(
      line.substring(0, line.length - 3) + "...",
      x,
      y + (maxLines - 1) * lineHeight
    );
  }
}

function drawLandmarks() {
  if (!state.riverLoaded) return;

  ctx.save();

  // Configurazioni
  const LINE_COLOR = "rgba(255, 255, 255, 0.8)";
  const LINE_WIDTH = 1.5;
  const TEXT_COLOR = "white";
  const FONT_MAIN = "200 150px 'Host Grotesk', sans-serif"; // Not used for labels below
  const LINE_SPACING = 180;
  const TEXT_MARGIN = 120;

  const minLon = config.mapBounds.minLon;
  const maxLon = config.mapBounds.maxLon;
  const riverBaseY = -state.riverHeight / 2 + config.riverVerticalOffset;

  // Coordinate linee
  const lineBottom = riverBaseY + state.riverHeight + 900;
  const lineTop = riverBaseY - 100;

  config.riverLandmarks.forEach((landmark) => {
    const x =
      ((landmark.longitude - minLon) / (maxLon - minLon)) *
        config.horizontalScale -
      config.horizontalScale / 2 +
      (landmark.horizontalOffset || 0);

    // 1. Disegna la linea verticale completa
    ctx.beginPath();
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = LINE_WIDTH;
    ctx.moveTo(x, lineBottom);
    ctx.lineTo(x, lineTop);
    ctx.stroke();

    // 2. Calcola posizione testo
    const textY = lineBottom - TEXT_MARGIN;

    // 3. Disegna nome landmark
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = FONT_MAIN;

    // Dividi il testo in righe se necessario
    const words = landmark.name.split(" ");
    let lines = [words[0]];

    for (let i = 1; i < words.length; i++) {
      const testLine = lines[lines.length - 1] + " " + words[i];
      if (ctx.measureText(testLine).width > 1000 && lines.length < 2) {
        lines.push(words[i]);
      } else {
        lines[lines.length - 1] = testLine;
      }
    }

    // Disegna le righe
    lines.forEach((line, i) => {
      ctx.fillText(line, x, textY - (lines.length - i - 1) * LINE_SPACING);
    });

    // 4. Ripristina la parte di linea coperta dal testo
    if (lines.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = LINE_COLOR;
      ctx.lineWidth = LINE_WIDTH;
      ctx.moveTo(x, lineBottom);
      ctx.lineTo(x, textY - LINE_SPACING * 2);
      ctx.stroke();
    }
  });

  ctx.restore();
}

// Funzione helper migliorata per il testo multilinea
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(" ");
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + " " + words[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      lines.push(currentLine);
      currentLine = words[i];
      if (lines.length >= maxLines) break;
    } else {
      currentLine = testLine;
    }
  }

  lines.push(currentLine);

  // Disegna le righe
  lines.slice(0, maxLines).forEach((line, i) => {
    ctx.fillText(line, x, y - (lines.length - i - 1) * lineHeight);
  });

  return lines.length;
}

function drawClassLabels() {
  if (state.loading || !state.filteredImages.length) return;

  ctx.save();

  // Configurazione ultra-minimal
  const fontFamily = "'Space Grotesk', 'Host Grotesk', Arial, sans-serif";
  const fontSize = 10; // Leggermente più grande ma ancora minimale
  const textColor = "rgba(255, 255, 255, 0.85)";
  const leftMargin = 15; // Distanza dal bordo sinistro
  const lineOpacity = 0.15; // Linee quasi trasparenti
  const linePadding = 30; // Spazio tra testo e inizio linea

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  // Raggruppa immagini per classe
  const classGroups = {};
  state.filteredImages.forEach((img) => {
    if (!img.loaded || !img.active || !img.metadata.taxon_class_name) return;

    const className = img.metadata.taxon_class_name;
    if (!classGroups[className]) {
      classGroups[className] = { sumY: 0, count: 0 };
    }
    classGroups[className].sumY += img.y;
    classGroups[className].count++;
  });

  // Disegna etichette
  Object.keys(classGroups).forEach((className) => {
    const avgY = classGroups[className].sumY / classGroups[className].count;
    const canvasY =
      (avgY - state.currentView.y) * state.scale + canvas.height / 2;

    // Limita ai bordi verticali
    const clampedY = Math.max(
      fontSize / 2 + 5,
      Math.min(canvas.height - fontSize / 2 - 5, canvasY)
    );

    // Linea guida completa (da margine sinistro a margine destro)
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 255, 255, ${lineOpacity})`;
    ctx.lineWidth = 0.3; // Linea ultra-fine
    ctx.moveTo(0, clampedY); // Parte dal bordo sinistro
    ctx.lineTo(canvas.width, clampedY); // Fino al bordo destro
    ctx.stroke();

    // Solo testo (senza box)
    ctx.fillStyle = textColor;
    ctx.fillText(className, leftMargin, clampedY);
  });

  ctx.restore();
}

function render(time) {
  // 1. Controllo zoom e tempo
  state.scale = Math.max(config.minZoom, Math.min(config.maxZoom, state.scale));
  if (!state.lastTime) state.lastTime = time;
  const deltaTime = time - state.lastTime;
  state.lastTime = time;

  if (state.loading) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(render);
    return;
  }

  // 2. Gestione movimento e inerzia
  constrainView();
  state.currentView.x +=
    (state.targetView.x - state.currentView.x) * config.smoothFactor;
  state.currentView.y +=
    (state.targetView.y - state.currentView.y) * config.smoothFactor;

  if (!state.isDragging) {
    state.targetView.x += state.velocity.x;
    state.targetView.y += state.velocity.y;
    state.velocity.x *= config.inertiaDecay;
    state.velocity.y *= config.inertiaDecay;
  }

  // 3. Sfondo nero #111
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 4. Disegno LINEE ORIZZONTALI (spessore assoluto fisso)
  ctx.save();

  const allClasses = new Set(
    state.filteredImages
      .filter((img) => img.metadata?.taxon_class_name)
      .map((img) => img.metadata.taxon_class_name)
  );

  // PRIMA calcoliamo tutte le posizioni Y in coordinate mondo
  const classPositions = {};
  allClasses.forEach((className) => {
    const classImages = state.filteredImages.filter(
      (img) => img.metadata?.taxon_class_name === className
    );
    if (classImages.length > 0) {
      classPositions[className] =
        classImages.reduce((sum, img) => sum + img.y, 0) / classImages.length;
    }
  });

  // POI disegniamo in coordinate canvas con spessore fisso
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 0.3; // Spessore assoluto in pixel (fisso)

  Object.entries(classPositions).forEach(([className, worldY]) => {
    // Converti coordinate mondo -> canvas
    const canvasY =
      (worldY - state.currentView.y) * state.scale + canvas.height / 2;

    // Linea orizzontale a larghezza intera canvas
    ctx.beginPath();
    ctx.moveTo(0, canvasY);
    ctx.lineTo(canvas.width, canvasY);
    ctx.stroke();
  });

  ctx.restore();

  // 5. Disegno IMMAGINI (con trasformazioni)
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(state.scale, state.scale);
  ctx.translate(-state.currentView.x, -state.currentView.y);

  const visibleArea = calculateVisibleArea();

  // Immagini normali
  state.filteredImages.forEach((img) => {
    if (
      img.loaded &&
      isVisible(img, visibleArea) &&
      img !== state.hoveredImage
    ) {
      ctx.save();
      ctx.globalAlpha = img.active ? 1.0 : config.inactiveOpacity;
      ctx.filter = img.active ? "none" : "grayscale(100%)";
      ctx.drawImage(
        img.img,
        img.x - img.width / 2,
        img.y - img.height / 2,
        img.width,
        img.height
      );
      ctx.restore();
    }
  });

  // Immagine hover
  if (
    state.hoveredImage?.loaded &&
    isVisible(state.hoveredImage, visibleArea)
  ) {
    const scale = config.hoverScale;
    const width = state.hoveredImage.originalWidth * scale;
    const height = state.hoveredImage.originalHeight * scale;
    ctx.drawImage(
      state.hoveredImage.img,
      state.hoveredImage.x - width / 2,
      state.hoveredImage.y - height / 2,
      width,
      height
    );
  }

  ctx.restore();

  // 6. Disegno SCRITTE CLASSI (sotto il fiume)
  drawClassLabels();

  // 7. RIVER AND VERTICAL LINES
  if (state.unfoldingPath.loaded) {
    ctx.save();
    const scaledWidth = config.unfoldingPath.width * state.scale;
    const scaledHeight = state.unfoldingPath.actualHeight * state.scale;

    // Background
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#111";
    ctx.fillRect(
      0,
      0,
      canvas.width,
      config.unfoldingPath.topMargin + scaledHeight
    );

    // Draw river first
    ctx.drawImage(
      state.unfoldingPath.img,
      (canvas.width - scaledWidth) / 2 - state.currentView.x * state.scale,
      config.unfoldingPath.topMargin,
      scaledWidth,
      scaledHeight
    );

    // VERTICAL LINES - FIXED STYLE (not affected by zoom/pan)
    ctx.save();

    // Line measurements
    const riverTop = config.unfoldingPath.topMargin;
    const riverBottom = riverTop + scaledHeight;
    const lineTop = riverTop - 25;
    const lineBottom = riverTop + scaledHeight * 1;

    // Fixed visual style (screen space)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 0.8; // Fixed pixel width

    // Text style
    const textStyle = {
      font: "11px 'Space Grotesk', sans-serif",
      color: "rgba(255, 255, 255, 0.9)",
      align: "center",
      baseline: "bottom",
      padding: 10, // Space between line and text
    };

    // Calculate line positions (world space)
    const minLon = config.mapBounds.minLon;
    const maxLon = config.mapBounds.maxLon;

    config.riverLandmarks.forEach((landmark) => {
      // World X position
      const worldX =
        ((landmark.longitude - minLon) / (maxLon - minLon)) *
          config.horizontalScale -
        config.horizontalScale / 2 +
        (landmark.horizontalOffset || 0);

      // Convert to screen X
      const screenX =
        (worldX - state.currentView.x) * state.scale + canvas.width / 2;

      // Only draw if visible
      if (screenX >= 0 && screenX <= canvas.width) {
        // Draw line (in screen space)
        ctx.beginPath();
        ctx.moveTo(screenX, lineTop);
        ctx.lineTo(screenX, lineBottom);
        ctx.stroke();

        // Draw label if exists
        if (landmark.name) {
          ctx.save();
          ctx.font = textStyle.font;
          ctx.fillStyle = textStyle.color;
          ctx.textAlign = textStyle.align;
          ctx.textBaseline = textStyle.baseline;

          // Text positioned above line with padding
          ctx.fillText(landmark.name, screenX, lineTop - textStyle.padding);
          ctx.restore();
        }
      }
    });
    ctx.restore();

    // --- SCRITTA "fiume Marzenego" a sinistra ---
    ctx.save();
    ctx.font = "11px 'Space Grotesk', sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const text = "fiume Marzenego";
    const textX = 20;
    const textY = config.unfoldingPath.topMargin + scaledHeight / 2;

    // Sfondo testo
    ctx.save();
    const paddingX = 4;
    const paddingY = 1;
    const textMetrics = ctx.measureText(text);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#000";
    ctx.fillRect(
      textX - paddingX,
      textY - 10 / 2 - paddingY,
      textMetrics.width + paddingX * 2,
      10 + paddingY * 2
    );
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff";
    ctx.fillText(text, textX, textY);
    ctx.restore();

    ctx.restore();
  }

  requestAnimationFrame(render);
}

// Funzione drawClassLabels aggiornata per coerenza
function drawClassLabels() {
  if (state.loading || !state.filteredImages.length) return;

  ctx.save();

  const fontFamily = "'Host Grotesk', Arial, sans-serif";
  const fontSize = 11;
  const textColor = "rgba(255, 255, 255, 0.85)";
  const leftMargin = 15;

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = textColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const classGroups = {};
  state.filteredImages.forEach((img) => {
    if (!img.loaded || !img.active || !img.metadata.taxon_class_name) return;

    const className = img.metadata.taxon_class_name;
    if (!classGroups[className]) {
      classGroups[className] = { sumY: 0, count: 0 };
    }
    classGroups[className].sumY += img.y;
    classGroups[className].count++;
  });

  Object.keys(classGroups).forEach((className) => {
    const avgY = classGroups[className].sumY / classGroups[className].count;
    const canvasY =
      (avgY - state.currentView.y) * state.scale + canvas.height / 2;

    if (canvasY > fontSize && canvasY < canvas.height - fontSize) {
      ctx.fillText(className, leftMargin, canvasY);
    }
  });

  ctx.restore();
}

function constrainView() {
  const viewW = canvas.width / state.scale;
  const viewH = canvas.height / state.scale;

  // Margine extra per "allargare" i limiti (in coordinate mondo)
  const margin = 120; // Puoi regolare questo valore per "quanto" allargare

  // Limiti orizzontali SEMPRE attivi, ma più larghi
  const minX = state.contentBounds.minX + viewW / 2 - margin;
  const maxX = state.contentBounds.maxX - viewW / 2 + margin;
  if (state.targetView.x < minX) state.targetView.x = minX;
  if (state.targetView.x > maxX) state.targetView.x = maxX;

  // Limiti verticali: centro se viewport più alta del contenuto, altrimenti limito (con margine)
  const minY = state.contentBounds.minY + viewH / 2 - margin;
  const maxY = state.contentBounds.maxY - viewH / 2 + margin;
  const contentHeight = state.contentBounds.maxY - state.contentBounds.minY;
  if (viewH >= contentHeight) {
    // Centro verticalmente
    const cy = (state.contentBounds.minY + state.contentBounds.maxY) / 2;
    state.targetView.y = cy;
  } else {
    if (state.targetView.y < minY) state.targetView.y = minY;
    if (state.targetView.y > maxY) state.targetView.y = maxY;
  }

  // Scala sempre limitata ai valori consentiti
  state.scale = Math.max(config.minZoom, Math.min(config.maxZoom, state.scale));
}

function init() {
  document.body.classList.add("loading");
  resizeCanvas();
  setupEventListeners();

  // Carica solo l'unfolding path
  state.unfoldingPath.img = new Image();
  state.unfoldingPath.img.onload = () => {
    state.unfoldingPath.actualHeight =
      config.unfoldingPath.width *
      (state.unfoldingPath.img.naturalHeight /
        state.unfoldingPath.img.naturalWidth);
    state.unfoldingPath.loaded = true;
  };
  state.unfoldingPath.img.src = config.unfoldingPath.url;

  loadJSONData();
  requestAnimationFrame(render);
}

function handleResize() {
  // Regola l'opacità in base alle dimensioni dello schermo
  // Non modificare più l'opacità del fiume
}
window.addEventListener("resize", handleResize);

init();
