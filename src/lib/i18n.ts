import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./config";

/**
 * Strings for the server-rendered sections of a race edition page. Templates
 * use `{placeholder}` tokens filled by `fillTemplate` in `./format`.
 */
export type EditionPageDictionary = {
  titleIntent: string;
  titleIntentShort: string;
  descriptionLead: string;
  descriptionLeadShort: string;
  descriptionStart: string;
  descriptionCheerPointsOne: string;
  descriptionCheerPointsMany: string;
  descriptionTail: string;
  descriptionProvisional: string;
  whereToWatchHeading: string;
  whereToWatchIntro: string;
  whereToWatchFallback: string;
  startTimesHeading: string;
  startTimesNote: string;
  faqHeading: string;
  faqWhenQuestion: string;
  faqWhenQuestionPast: string;
  faqWhenAnswerUpcoming: string;
  faqWhenAnswerPast: string;
  faqStartQuestion: string;
  faqStartQuestionPast: string;
  faqStartAnswer: string;
  faqStartAnswerPast: string;
  faqStartAnswerWaves: string;
  faqStartAnswerWavesPast: string;
  faqStartAnswerProvisional: string;
  faqDistanceQuestion: string;
  faqDistanceAnswer: string;
  faqWhereQuestion: string;
  faqWhereAnswer: string;
  faqWhereAnswerProvisional: string;
  faqWhereAnswerFallback: string;
  faqShareQuestion: string;
  faqShareAnswer: string;
  otherEditionsHeading: string;
  pastEditionNotice: string;
  viewEdition: string;
  moreRacesHeading: string;
  moreRacesIntro: string;
};

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
  discoverLead: string;
  discoverSeoDescription: string;
  discoverSeoTitle: string;
  distance: string;
  finishTime: string;
  generateShareLink: string;
  githubFooterLink: string;
  githubLabel: string;
  heroBody: string;
  heroTitle: string;
  homeSeoDescription: string;
  homeSeoTitle: string;
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
  footerContribute: string;
  footerNavigation: string;
  importantRaceNote: string;
  editionPage: EditionPageDictionary;
  invalidFinishTimeFormat: string;
  invalidNicknameCharacters: string;
  invalidNicknameLength: string;
  invalidPaceFormat: string;
  shareLinkTitle: string;
  dismissRoutePoint: string;
  enterFullscreenMap: string;
  exitFullscreenMap: string;
  selectedRoutePoint: string;
  shareLink: string;
  sharedViaDevice: string;
  switchToLightTheme: string;
  switchToDarkTheme: string;
  notFoundTitle: string;
  notFoundDescription: string;
  notFoundBody: string;
  notFoundGoHome: string;
  notFoundFindRace: string;
  firstPassLabel: string;
  returnPassLabel: string;
  loadMore: string;
  startWave: string;
  selectWave: string;
  includePastRaces: string;
  provisionalNoticeTitle: string;
  provisionalRouteNotice: string;
  provisionalStartTimeNotice: string;
  provisionalShareTimesNotice: string;
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
    discoverLead:
      "Course maps, cheer points and passing times: where to watch every race.",
    discoverSeoDescription:
      "Browse marathons, half marathons and 10Ks with course maps, cheer points and estimated passing times. Find where to watch and plan your race day.",
    discoverSeoTitle: "Marathon Spectator Guides: Where to Watch | Dondeteveo",
    distance: "Distance",
    finishTime: "Finish time",
    generateShareLink: "Generate share link",
    githubFooterLink: "View source on GitHub",
    githubLabel: "GitHub",
    heroBody:
      "Share your race plan in one link — your crew will know exactly where to cheer and when to expect you.",
    heroTitle: "So, where should I see you?",
    homeSeoDescription:
      "Spectator guide for marathons and road races: share your pace and your crew will know where to watch along the course and when you will pass each point.",
    homeSeoTitle: "Where to Cheer at a Marathon or Race | Dondeteveo",
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
      "This MVP keeps sharing simple. Personalized pages are public by URL, never indexed, and may still involve third-party services such as Cloudflare (including cookieless aggregate traffic analytics) and map providers.",
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
    footerContribute: "Contribute",
    footerNavigation: "Footer",
    importantRaceNote: "Important race note",
    editionPage: {
      titleIntent: "route & where to watch",
      titleIntentShort: "where to watch",
      descriptionLead: "{name}: where to watch on {date} in {city}.",
      descriptionLeadShort: "Where to watch on {date} in {city}.",
      descriptionStart: "start at {startTime} ({timezone})",
      descriptionCheerPointsOne: "1 cheer point",
      descriptionCheerPointsMany: "{count} cheer points",
      descriptionTail: "Share your race plan in one link.",
      descriptionProvisional: "Some details are pending confirmation.",
      whereToWatchHeading: "Where to watch",
      whereToWatchIntro:
        "Cheer points marked on the course map, by distance from the start.",
      whereToWatchFallback:
        "We have not marked cheer points for this edition yet. Use the course map and the predicted times to choose a spot you can reach.",
      startTimesHeading: "Start times",
      startTimesNote: "Race local time ({timezone}).",
      faqHeading: "Frequently asked questions",
      faqWhenQuestion: "When is the {name} {year}?",
      faqWhenQuestionPast: "When was the {name} {year}?",
      faqWhenAnswerUpcoming: "It takes place on {date} in {city}.",
      faqWhenAnswerPast: "It took place on {date} in {city}.",
      faqStartQuestion: "What time does it start?",
      faqStartQuestionPast: "What time did it start?",
      faqStartAnswer:
        "The start is at {startTime}, race local time ({timezone}).",
      faqStartAnswerPast:
        "The start was at {startTime}, race local time ({timezone}).",
      faqStartAnswerWaves:
        "The first start is at {startTime}, race local time ({timezone}). Every start is listed under Start times.",
      faqStartAnswerWavesPast:
        "The first start was at {startTime}, race local time ({timezone}). Every start is listed under Start times.",
      faqStartAnswerProvisional:
        "Expected start time: {startTime}, race local time ({timezone}), pending confirmation.",
      faqDistanceQuestion: "How long is the course?",
      faqDistanceAnswer: "The course is {distance} long.",
      faqWhereQuestion: "Where can I watch the race?",
      faqWhereAnswer:
        "Good spots to watch are {points}. They are all marked on the course map.",
      faqWhereAnswerProvisional:
        "They come from the previous edition’s course, pending confirmation, so they may change.",
      faqWhereAnswerFallback:
        "We have not marked cheer points for this edition yet, so use the course map and the predicted times to choose a spot you can reach.",
      faqShareQuestion: "How do I share my plan with my supporters?",
      faqShareAnswer:
        "Enter your target pace or finish time in the planner on this page and share the link. Your supporters will see when you are expected at each point, in race local time.",
      otherEditionsHeading: "Other editions",
      pastEditionNotice: "This edition has already been run.",
      viewEdition: "See the {year} edition",
      moreRacesHeading: "More races",
      moreRacesIntro:
        "Upcoming races: same city first, then the closest by date.",
    },
    invalidFinishTimeFormat: "Enter a valid finish time (HH:MM:SS)",
    invalidNicknameCharacters:
      "Only letters, numbers, spaces, and characters (', ., -) allowed",
    invalidNicknameLength: "Nickname must be 30 characters or fewer",
    invalidPaceFormat: "Enter a valid pace (MM:SS)",
    shareLinkTitle: "Share this page",
    dismissRoutePoint: "Dismiss selected point",
    enterFullscreenMap: "Enter fullscreen map",
    exitFullscreenMap: "Exit fullscreen map",
    selectedRoutePoint: "Selected route point",
    shareLink: "Share link",
    sharedViaDevice: "Shared!",
    switchToLightTheme: "Switch to light theme",
    switchToDarkTheme: "Switch to dark theme",
    notFoundTitle: "Page not found | Dondeteveo",
    notFoundDescription:
      "The page you're looking for doesn't exist. Head back to find your race.",
    notFoundBody:
      "The page you\u2019re looking for doesn\u2019t exist or may have moved.",
    notFoundGoHome: "Go to homepage",
    notFoundFindRace: "Find your race",
    firstPassLabel: "1st pass",
    returnPassLabel: "Return",
    loadMore: "Load more",
    startWave: "Start wave",
    selectWave: "Select your wave (optional)",
    includePastRaces: "Include past races",
    provisionalNoticeTitle: "Pending confirmation",
    provisionalRouteNotice:
      "Course from the previous edition, pending confirmation. We haven’t yet confirmed that it matches this year’s course, so the map, splits, and cheer points may change. Check the official website before race day.",
    provisionalStartTimeNotice:
      "Start time pending confirmation. We haven’t yet confirmed this year’s start time, so the time shown may change.",
    provisionalShareTimesNotice:
      "Predicted times are based on these provisional details. Links shared now will show the updated times once they are confirmed.",
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
    discoverLead:
      "Recorridos, puntos para animar y horarios de paso: dónde ver cada carrera.",
    discoverSeoDescription:
      "Maratones, medias maratones y 10K con el mapa del recorrido, puntos para animar y horarios de paso estimados. Descubre dónde ver la carrera.",
    discoverSeoTitle: "Recorridos y horarios de paso de carreras | Dondeteveo",
    distance: "Distancia",
    finishTime: "Tiempo de llegada",
    generateShareLink: "Crear enlace para compartir",
    githubFooterLink: "Ver código en GitHub",
    githubLabel: "GitHub",
    heroBody:
      "Comparte tu plan de carrera en un enlace: tu gente sabrá exactamente dónde animarte y cuándo esperarte.",
    heroTitle: "Entonces\u2026 ¿dónde te veo?",
    homeSeoDescription:
      "Guía para animar en maratones y carreras: comparte tu ritmo y tu gente sabrá dónde animarte en el recorrido y a qué hora pasarás por cada punto.",
    homeSeoTitle: "Dónde animar en un maratón o carrera | Dondeteveo",
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
    predictedTimes: "Horas previstas",
    privacy: "Privacidad",
    privacyBody:
      "Hemos querido mantenerlo simple. Las páginas personalizadas son públicas por URL, nunca se indexan y pueden pasar por servicios de terceros como Cloudflare (incluidas analíticas agregadas sin cookies) y proveedores de mapas.",
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
    footerContribute: "Colabora",
    footerNavigation: "Pie de página",
    importantRaceNote: "Nota importante",
    editionPage: {
      titleIntent: "recorrido y dónde animar",
      titleIntentShort: "dónde animar",
      descriptionLead: "{name}: dónde animar el {date} en {city}.",
      descriptionLeadShort: "Dónde animar el {date} en {city}.",
      descriptionStart: "salida a las {startTime} ({timezone})",
      descriptionCheerPointsOne: "1 punto para animar",
      descriptionCheerPointsMany: "{count} puntos para animar",
      descriptionTail: "Comparte tu plan de carrera en un enlace.",
      descriptionProvisional: "Algunos datos están pendientes de confirmación.",
      whereToWatchHeading: "Dónde animar",
      whereToWatchIntro:
        "Puntos para animar marcados en el mapa del recorrido, por distancia desde la salida.",
      whereToWatchFallback:
        "Todavía no hemos marcado puntos para animar en esta edición. Usa el mapa del recorrido y las horas previstas para elegir un sitio al que puedas llegar.",
      startTimesHeading: "Horarios de salida",
      startTimesNote: "Hora local de la carrera ({timezone}).",
      faqHeading: "Preguntas frecuentes",
      faqWhenQuestion: "{name} {year}: ¿cuándo se celebra?",
      faqWhenQuestionPast: "{name} {year}: ¿cuándo se celebró?",
      faqWhenAnswerUpcoming: "Se celebra el {date} en {city}.",
      faqWhenAnswerPast: "Se celebró el {date} en {city}.",
      faqStartQuestion: "¿A qué hora es la salida?",
      faqStartQuestionPast: "¿A qué hora fue la salida?",
      faqStartAnswer:
        "La salida es a las {startTime}, hora local de la carrera ({timezone}).",
      faqStartAnswerPast:
        "La salida fue a las {startTime}, hora local de la carrera ({timezone}).",
      faqStartAnswerWaves:
        "La primera salida es a las {startTime}, hora local de la carrera ({timezone}). Todas las salidas aparecen en Horarios de salida.",
      faqStartAnswerWavesPast:
        "La primera salida fue a las {startTime}, hora local de la carrera ({timezone}). Todas las salidas aparecen en Horarios de salida.",
      faqStartAnswerProvisional:
        "Hora de salida prevista: {startTime}, hora local de la carrera ({timezone}), pendiente de confirmación.",
      faqDistanceQuestion: "¿Qué distancia tiene el recorrido?",
      faqDistanceAnswer: "El recorrido tiene {distance}.",
      faqWhereQuestion: "¿Dónde puedo ver la carrera?",
      faqWhereAnswer:
        "Algunos buenos sitios para animar son {points}. Todos están marcados en el mapa del recorrido.",
      faqWhereAnswerProvisional:
        "Proceden del recorrido de la edición anterior, pendiente de confirmación, así que pueden cambiar.",
      faqWhereAnswerFallback:
        "Todavía no hemos marcado puntos para animar en esta edición, así que usa el mapa del recorrido y las horas previstas para elegir un sitio al que puedas llegar.",
      faqShareQuestion: "¿Cómo comparto mi plan con quienes vienen a animarme?",
      faqShareAnswer:
        "Escribe tu ritmo objetivo o tu tiempo de llegada en el planificador de esta página y comparte el enlace. Tu gente verá a qué hora se te espera en cada punto, en hora local de la carrera.",
      otherEditionsHeading: "Otras ediciones",
      pastEditionNotice: "Esta edición ya se ha celebrado.",
      viewEdition: "Ver la edición {year}",
      moreRacesHeading: "Más carreras",
      moreRacesIntro:
        "Próximas carreras: primero las de la misma ciudad y después las más cercanas en fecha.",
    },
    invalidFinishTimeFormat: "Introduce un tiempo válido (HH:MM:SS)",
    invalidNicknameCharacters:
      "Solo se permiten letras, números, espacios y caracteres (', ., -)",
    invalidNicknameLength: "El apodo debe tener 30 caracteres o menos",
    invalidPaceFormat: "Introduce un ritmo válido (MM:SS)",
    shareLinkTitle: "Comparte esta página",
    dismissRoutePoint: "Cerrar punto seleccionado",
    enterFullscreenMap: "Abrir mapa a pantalla completa",
    exitFullscreenMap: "Salir del mapa a pantalla completa",
    selectedRoutePoint: "Punto seleccionado del recorrido",
    shareLink: "Compartir enlace",
    sharedViaDevice: "¡Compartido!",
    switchToLightTheme: "Cambiar a tema claro",
    switchToDarkTheme: "Cambiar a tema oscuro",
    notFoundTitle: "P\u00e1gina no encontrada | Dondeteveo",
    notFoundDescription:
      "La p\u00e1gina que buscas no existe. Vuelve al inicio para encontrar tu carrera.",
    notFoundBody: "La p\u00e1gina que buscas no existe o puede haberse movido.",
    notFoundGoHome: "Ir al inicio",
    notFoundFindRace: "Encuentra tu carrera",
    firstPassLabel: "1ª pasada",
    returnPassLabel: "Vuelta",
    loadMore: "Cargar más",
    startWave: "Cajón de salida",
    selectWave: "Selecciona tu cajón (opcional)",
    includePastRaces: "Incluir carreras pasadas",
    provisionalNoticeTitle: "Pendiente de confirmación",
    provisionalRouteNotice:
      "Recorrido de la edición anterior, pendiente de confirmación. Todavía no hemos confirmado que coincida con el de este año, así que el mapa, los puntos oficiales y los puntos para animar pueden cambiar. Consulta la web oficial antes del día de la carrera.",
    provisionalStartTimeNotice:
      "Hora de salida pendiente de confirmación. Todavía no hemos confirmado la hora de salida de este año, así que la hora indicada puede cambiar.",
    provisionalShareTimesNotice:
      "Las horas previstas se basan en estos datos provisionales. Los enlaces que compartas ahora mostrarán las horas actualizadas cuando se confirmen.",
  },
};

export const isSupportedLocale = (value: string): value is Locale =>
  SUPPORTED_LOCALES.includes(value as Locale);

export const getLocaleOrDefault = (value: string | undefined): Locale =>
  value && isSupportedLocale(value) ? value : DEFAULT_LOCALE;

export const getDictionary = (locale: Locale): Dictionary =>
  DICTIONARIES[locale];
