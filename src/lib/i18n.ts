import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./config";

type Dictionary = {
  about: string;
  cantFindRace: string;
  closeMenu: string;
  allFilter: string;
  allTimesRaceLocal: string;
  justOpenTitle: string;
  justOpenBody: string;
  browseRaces: string;
  cheerPoints: string;
  city: string;
  contactIntro: string;
  contactLabel: string;
  contributeEmail: string;
  contributeGithubIssue: string;
  contributeIntro: string;
  contributeRequest: string;
  contributeRequestBody: string;
  contributeTitle: string;
  contributeTools: string;
  contributeToolsBody: string;
  contributeToolGeojsonio: string;
  contributeToolPlotaroute: string;
  contributeToolMapstogpx: string;
  contributeViaGithub: string;
  contributeViaGithubBody: string;
  country: string;
  date: string;
  directRaceSearch: string;
  discoverIntro: string;
  discoverTitle: string;
  distance: string;
  finishTime: string;
  generateShareLink: string;
  githubFooterLink: string;
  githubLabel: string;
  heroBody: string;
  heroTitle: string;
  invalidShareState: string;
  language: string;
  latestEditionRedirect: string;
  localTimeLabel: string;
  noMatch: string;
  officialWebsite: string;
  optionalNickname: string;
  openMenu: string;
  pace: string;
  pacePerKm: string;
  pastEdition: string;
  plannerMode: string;
  primaryNavigation: string;
  predictedTimes: string;
  privacy: string;
  privacyBody: string;
  raceDiscovery: string;
  raceLocalTime: string;
  raceSearchPlaceholder: string;
  runnerLabel: string;
  routeOverview: string;
  search: string;
  searchFirstBody: string;
  searchFirstTitle: string;
  share: string;
  shareIntro: string;
  shareNeedsJavaScript: string;
  sharePageForThe: string;
  sharePageTitle: string;
  shareReadyBody: string;
  shareReadyTitle: string;
  splitLabel: string;
  spectatorReady: string;
  siteTagline: string;
  startTime: string;
  timezone: string;
  upcomingEdition: string;
  viewRacePage: string;
  websiteLabel: string;
  cheerPointLabel: string;
  copiedToClipboard: string;
  copyLink: string;
  copiedLink: string;
  checkpointSafetyMargin: string;
  dayOffsetLabel: string;
  footerPunchline: string;
  importantRaceNote: string;
  invalidFinishTimeFormat: string;
  invalidPaceFormat: string;
  shareLinkTitle: string;
};

const DICTIONARIES: Record<Locale, Dictionary> = {
  en: {
    about: "About",
    cantFindRace: "Can't find your race?",
    closeMenu: "Close menu",
    allFilter: "All",
    allTimesRaceLocal: "All times are in the race\u2019s local timezone.",
    justOpenTitle: "Just open the link",
    justOpenBody:
      "No apps, no logins, no downloads. Share a link and your crew has everything they need.",
    browseRaces: "Browse races",
    cheerPoints: "Cheer points",
    city: "City",
    contactIntro:
      "Made by Jerna Digital for simple, spectator-friendly race planning.",
    contactLabel: "Contact",
    contributeEmail: "Send an email",
    contributeGithubIssue: "Open a GitHub issue",
    contributeIntro:
      "We're building a curated catalog of races. You can help it grow — either by contributing race data directly or by requesting a race you'd like to see.",
    contributeRequest: "Request a race",
    contributeRequestBody:
      "Don't have the data or not comfortable with GitHub? No problem — just let us know which race you'd like to see added.",
    contributeTitle: "Contribute a race",
    contributeTools: "Tools for creating route data",
    contributeToolsBody:
      "You don't need specialized software to create race routes. These free online tools let you draw routes on a map and export them as GeoJSON or GPX.",
    contributeToolGeojsonio:
      "draw routes and points directly on a map, export as GeoJSON",
    contributeToolPlotaroute:
      "trace a route along roads with snap-to-path, export as GPX",
    contributeToolMapstogpx: "convert Google Maps directions into a GPX file",
    contributeViaGithub: "Contribute via GitHub",
    contributeViaGithubBody:
      "If you have route and checkpoint data for a race, you can submit it as a pull request. Check the contribution guide for the full instructions.",
    country: "Country",
    date: "Edition",
    directRaceSearch: "Find your race",
    discoverIntro:
      "Browse a curated catalog of races and open the exact edition you plan to run.",
    discoverTitle: "Race discovery",
    distance: "Distance",
    finishTime: "Finish time",
    generateShareLink: "Generate share link",
    githubFooterLink: "View source on GitHub",
    githubLabel: "GitHub",
    heroBody:
      "Share your race plan in one link — your crew will know exactly where to cheer and when to expect you.",
    heroTitle: "So, where should I see you?",
    invalidShareState:
      "This share page needs a valid race target in the URL fragment. Generate it from the race page first.",
    language: "Language",
    latestEditionRedirect: "Opening the most relevant edition for this race...",
    localTimeLabel: "Race local time",
    noMatch: "No races match your filters yet.",
    officialWebsite: "Official website",
    optionalNickname: "Optional nickname",
    openMenu: "Open menu",
    pace: "Pace",
    pacePerKm: "Pace per km",
    pastEdition: "Past edition",
    plannerMode: "Mode",
    primaryNavigation: "Primary navigation",
    predictedTimes: "Predicted times",
    privacy: "Privacy",
    privacyBody:
      "This MVP keeps sharing simple. Personalized pages are public by URL, never indexed, and may still involve third-party services such as Cloudflare and map providers.",
    raceDiscovery: "Race discovery",
    raceLocalTime: "Race local time",
    raceSearchPlaceholder: "Search by race name",
    runnerLabel: "Runner",
    routeOverview: "Route overview",
    search: "Search",
    searchFirstBody:
      "Jump straight to your exact race edition. No digging through listings.",
    searchFirstTitle: "Fast search",
    share: "Share",
    shareIntro:
      "Enter your target pace or finish time and generate a spectator-ready link.",
    shareNeedsJavaScript:
      "This share page needs JavaScript enabled to read the shared plan from the URL.",
    sharePageForThe: "for the",
    sharePageTitle: "Where to cheer",
    shareReadyBody:
      "Set a target pace or finish time, get a link your supporters can actually use.",
    shareReadyTitle: "Share-ready",
    splitLabel: "Split",
    spectatorReady: "Spectator-ready timing plan",
    siteTagline: "Your crew, at every km",
    startTime: "Start time",
    timezone: "Timezone",
    upcomingEdition: "Upcoming edition",
    viewRacePage: "View race page",
    websiteLabel: "Website",
    cheerPointLabel: "Cheer point",
    copiedToClipboard: "Copied to the clipboard",
    copyLink: "Copy link",
    copiedLink: "Copied!",
    checkpointSafetyMargin: "(±{minutes}mins, {start} - {end})",
    dayOffsetLabel: "D+{n}",
    footerPunchline: "Made by a runner, for runners",
    importantRaceNote: "Important race note",
    invalidFinishTimeFormat: "Enter a valid finish time (HH:MM:SS)",
    invalidPaceFormat: "Enter a valid pace (MM:SS)",
    shareLinkTitle: "Share this page",
  },
  es: {
    about: "Acerca de",
    cantFindRace: "¿No encuentras tu carrera?",
    closeMenu: "Cerrar menú",
    allFilter: "Todas",
    allTimesRaceLocal:
      "Todos los horarios están en la zona horaria de la carrera.",
    justOpenTitle: "Solo abre el enlace",
    justOpenBody:
      "Sin apps, sin registros, sin descargas. Comparte un enlace y tu gente tiene todo lo que necesita.",
    browseRaces: "Explorar carreras",
    cheerPoints: "Puntos para animar",
    city: "Ciudad",
    contactIntro:
      "Hecho por Jerna Digital para que animar sea tan fácil como correr.",
    contactLabel: "Contacto",
    contributeEmail: "Enviar un email",
    contributeGithubIssue: "Abrir un issue en GitHub",
    contributeIntro:
      "Estamos construyendo un catálogo de carreras curado. Puedes ayudar a que crezca — contribuyendo datos de carreras directamente o pidiendo una que te gustaría ver.",
    contributeRequest: "Solicitar una carrera",
    contributeRequestBody:
      "¿No tienes los datos o no te manejas con GitHub? Sin problema — simplemente dinos qué carrera te gustaría que añadiéramos.",
    contributeTitle: "Contribuir una carrera",
    contributeTools: "Herramientas para crear datos de ruta",
    contributeToolsBody:
      "No necesitas software especializado para crear rutas de carreras. Estas herramientas online gratuitas te permiten dibujar rutas sobre un mapa y exportarlas como GeoJSON o GPX.",
    contributeToolGeojsonio:
      "dibuja rutas y puntos directamente sobre un mapa, exporta como GeoJSON",
    contributeToolPlotaroute:
      "traza una ruta por carreteras con ajuste automático al camino, exporta como GPX",
    contributeToolMapstogpx:
      "convierte indicaciones de Google Maps en un archivo GPX",
    contributeViaGithub: "Contribuir via GitHub",
    contributeViaGithubBody:
      "Si tienes datos de ruta y puntos de control de una carrera, puedes enviarlos como pull request. Consulta la guía de contribución para las instrucciones completas.",
    country: "País",
    date: "Edición",
    directRaceSearch: "Encuentra tu carrera",
    discoverIntro:
      "Explora un catálogo de carreras y abre la edición exacta que vas a correr.",
    discoverTitle: "Encontrar carreras",
    distance: "Distancia",
    finishTime: "Tiempo de llegada",
    generateShareLink: "Crear enlace para compartir",
    githubFooterLink: "Ver código en GitHub",
    githubLabel: "GitHub",
    heroBody:
      "Comparte tu plan de carrera en un enlace: tu gente sabrá exactamente dónde animarte y cuándo esperarte.",
    heroTitle: "Entonces\u2026 ¿dónde te veo?",
    invalidShareState:
      "Esta página necesita un objetivo válido en la URL. Genérala primero desde la página de la carrera.",
    language: "Idioma",
    latestEditionRedirect:
      "Abriendo la edición más reciente de esta carrera...",
    localTimeLabel: "Hora local de la carrera",
    noMatch: "Todavía no hay carreras que coincidan con los filtros.",
    officialWebsite: "Web oficial",
    optionalNickname: "Apodo (opcional)",
    openMenu: "Abrir menú",
    pace: "Ritmo",
    pacePerKm: "Ritmo por km",
    pastEdition: "Edición pasada",
    plannerMode: "Modo",
    primaryNavigation: "Navegación principal",
    predictedTimes: "Horarios estimados",
    privacy: "Privacidad",
    privacyBody:
      "Hemos querido mantenerlo simple. Las páginas personalizadas son públicas por URL, nunca se indexan y pueden pasar por servicios de terceros como Cloudflare y proveedores de mapas.",
    raceDiscovery: "Encontrar carreras",
    raceLocalTime: "Hora local de la carrera",
    raceSearchPlaceholder: "Busca por nombre de carrera",
    runnerLabel: "Corredor",
    routeOverview: "Vista general del recorrido",
    search: "Buscar",
    searchFirstBody:
      "Ve directo a la edición exacta de tu carrera. Sin rodeos.",
    searchFirstTitle: "Búsqueda rápida",
    share: "Compartir",
    shareIntro:
      "Escribe tu ritmo objetivo o tiempo de llegada y crea un enlace listo para tus animadores.",
    shareNeedsJavaScript:
      "Esta página necesita JavaScript para leer el plan compartido desde la URL.",
    sharePageForThe: "en el",
    sharePageTitle: "Dónde animar",
    shareReadyBody:
      "Pon tu ritmo o tiempo de llegada y obtén un enlace que tus animadores pueden usar de verdad.",
    shareReadyTitle: "Listo para compartir",
    splitLabel: "Punto oficial",
    spectatorReady: "Plan de horarios para tus animadores",
    siteTagline: "Tu gente, en cada km",
    startTime: "Hora de salida",
    timezone: "Zona horaria",
    upcomingEdition: "Próxima edición",
    viewRacePage: "Ver página de la carrera",
    websiteLabel: "Sitio web",
    cheerPointLabel: "Punto para animar",
    copiedToClipboard: "Copiado al portapapeles",
    copyLink: "Copiar enlace",
    copiedLink: "¡Copiado!",
    checkpointSafetyMargin: "(±{minutes} min, {start} - {end})",
    dayOffsetLabel: "D+{n}",
    footerPunchline: "Hecho por un corredor, para corredores",
    importantRaceNote: "Nota importante",
    invalidFinishTimeFormat: "Introduce un tiempo válido (HH:MM:SS)",
    invalidPaceFormat: "Introduce un ritmo válido (MM:SS)",
    shareLinkTitle: "Comparte esta página",
  },
};

export const isSupportedLocale = (value: string): value is Locale =>
  SUPPORTED_LOCALES.includes(value as Locale);

export const getLocaleOrDefault = (value: string | undefined): Locale =>
  value && isSupportedLocale(value) ? value : DEFAULT_LOCALE;

export const getDictionary = (locale: Locale): Dictionary =>
  DICTIONARIES[locale];
