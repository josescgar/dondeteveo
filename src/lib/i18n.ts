import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./config";

type Dictionary = {
  about: string;
  allFilter: string;
  allTimesRaceLocal: string;
  browseRaces: string;
  cheerPoints: string;
  city: string;
  contactIntro: string;
  contactLabel: string;
  country: string;
  date: string;
  directRaceSearch: string;
  discoverIntro: string;
  discoverTitle: string;
  distance: string;
  finishTime: string;
  generateShareLink: string;
  heroBody: string;
  heroTitle: string;
  invalidShareState: string;
  language: string;
  latestEditionRedirect: string;
  localTimeLabel: string;
  noMatch: string;
  officialWebsite: string;
  optionalNickname: string;
  pace: string;
  pacePerKm: string;
  pastEdition: string;
  plannerMode: string;
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
  cheerPointLabel: string;
};

const DICTIONARIES: Record<Locale, Dictionary> = {
  en: {
    about: "About",
    allFilter: "All",
    allTimesRaceLocal: "All times are shown in the race timezone only.",
    browseRaces: "Browse races",
    cheerPoints: "Cheer points",
    city: "City",
    contactIntro:
      "Made by Jerna Digital for simple, spectator-friendly race planning.",
    contactLabel: "Contact",
    country: "Country",
    date: "Date",
    directRaceSearch: "Search your race directly",
    discoverIntro:
      "Browse a curated catalog of races and open the exact edition you plan to run.",
    discoverTitle: "Race discovery",
    distance: "Distance",
    finishTime: "Finish time",
    generateShareLink: "Generate share link",
    heroBody:
      "Create a simple share page so friends and family know where to cheer and when to expect you on race day.",
    heroTitle: "The easy way to answer “Where should I see you?”",
    invalidShareState:
      "This share page needs a valid race target in the URL fragment. Generate it from the race page first.",
    language: "Language",
    latestEditionRedirect: "Opening the most relevant edition for this race...",
    localTimeLabel: "Race local time",
    noMatch: "No races match your filters yet.",
    officialWebsite: "Official website",
    optionalNickname: "Optional nickname",
    pace: "Pace",
    pacePerKm: "Pace per km",
    pastEdition: "Past edition",
    plannerMode: "Mode",
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
      "Open the exact race edition quickly and skip hunting through logistics pages.",
    searchFirstTitle: "Search-first",
    share: "Share",
    shareIntro:
      "Enter your target pace or finish time and generate a spectator-ready link.",
    shareNeedsJavaScript:
      "This share page needs JavaScript enabled to read the shared plan from the URL.",
    sharePageTitle: "Share page",
    shareReadyBody:
      "Turn one target pace or finish time into a spectator-ready link.",
    shareReadyTitle: "Share-ready",
    splitLabel: "Split",
    spectatorReady: "Spectator-ready timing plan",
    siteTagline: "Race-day cheering planner",
    startTime: "Start time",
    timezone: "Timezone",
    upcomingEdition: "Upcoming edition",
    viewRacePage: "View race page",
    cheerPointLabel: "Cheer point",
  },
  es: {
    about: "Acerca de",
    allFilter: "Todas",
    allTimesRaceLocal:
      "Todos los horarios se muestran solo en la zona horaria de la carrera.",
    browseRaces: "Explorar carreras",
    cheerPoints: "Puntos para animar",
    city: "Ciudad",
    contactIntro:
      "Creado por Jerna Digital para planificar mejor donde animar en carrera.",
    contactLabel: "Contacto",
    country: "Pais",
    date: "Fecha",
    directRaceSearch: "Busca tu carrera directamente",
    discoverIntro:
      "Explora un catalogo curado de carreras y abre la edicion exacta que vas a correr.",
    discoverTitle: "Descubrimiento de carreras",
    distance: "Distancia",
    finishTime: "Tiempo final",
    generateShareLink: "Generar enlace para compartir",
    heroBody:
      "Crea una pagina simple para compartir y que familia y amigos sepan donde animarte y a que hora esperarte el dia de la carrera.",
    heroTitle: "La forma facil de responder “donde te veo?”",
    invalidShareState:
      "Esta pagina necesita un objetivo valido en el fragmento de la URL. Generala primero desde la pagina de la carrera.",
    language: "Idioma",
    latestEditionRedirect:
      "Abriendo la edicion mas relevante de esta carrera...",
    localTimeLabel: "Hora local de la carrera",
    noMatch: "No hay carreras que coincidan con los filtros todavia.",
    officialWebsite: "Web oficial",
    optionalNickname: "Apodo opcional",
    pace: "Ritmo",
    pacePerKm: "Ritmo por km",
    pastEdition: "Edicion pasada",
    plannerMode: "Modo",
    predictedTimes: "Horarios estimados",
    privacy: "Privacidad",
    privacyBody:
      "Este MVP mantiene el proceso simple. Las paginas personalizadas son publicas por URL, nunca se indexan y pueden implicar servicios de terceros como Cloudflare y proveedores de mapas.",
    raceDiscovery: "Descubrimiento de carreras",
    raceLocalTime: "Hora local de la carrera",
    raceSearchPlaceholder: "Busca por nombre de carrera",
    runnerLabel: "Corredor",
    routeOverview: "Vista general del recorrido",
    search: "Buscar",
    searchFirstBody:
      "Abre rapidamente la edicion exacta de tu carrera sin perder tiempo entre paginas logisticas.",
    searchFirstTitle: "Busqueda directa",
    share: "Compartir",
    shareIntro:
      "Introduce tu ritmo objetivo o tiempo final y genera un enlace listo para espectadores.",
    shareNeedsJavaScript:
      "Esta pagina necesita JavaScript para leer el plan compartido desde la URL.",
    sharePageTitle: "Pagina para compartir",
    shareReadyBody:
      "Convierte un ritmo objetivo o tiempo final en un enlace listo para espectadores.",
    shareReadyTitle: "Listo para compartir",
    splitLabel: "Punto oficial",
    spectatorReady: "Plan de horarios para espectadores",
    siteTagline: "Planificador para animar en carrera",
    startTime: "Hora de salida",
    timezone: "Zona horaria",
    upcomingEdition: "Edicion proxima",
    viewRacePage: "Ver pagina de carrera",
    cheerPointLabel: "Punto para animar",
  },
};

export const isSupportedLocale = (value: string): value is Locale =>
  SUPPORTED_LOCALES.includes(value as Locale);

export const getLocaleOrDefault = (value: string | undefined): Locale =>
  value && isSupportedLocale(value) ? value : DEFAULT_LOCALE;

export const getDictionary = (locale: Locale): Dictionary =>
  DICTIONARIES[locale];
