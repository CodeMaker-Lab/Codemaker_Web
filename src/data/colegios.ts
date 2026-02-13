export interface Colegio {
    id: string;
    nombre: string;
    direccion: string;
    logo?: string;
    niveles?: string[];
    status: 'live' | 'past';
    isClientOnly?: boolean;
}

export const colegios: Colegio[] = [
    // --- ACTIVOS (LIVE) ---
    {
        id: "veracruz",
        nombre: "Colegio Veracruz",
        direccion: "C. Principado de Asturias, 6, 23009 Jaén",
        logo: "/images/LogosClientes/veracruz.png",
        niveles: ["Junior", "Senior", "Master"],
        status: 'live',
    },
    {
        id: "maristas",
        nombre: "Colegio Maristas",
        direccion: "Av. Ruiz Jiménez, 1, 23007 Jaén",
        logo: "/images/LogosClientes/maristas.png",
        niveles: ["Junior"],
        status: 'live',
    },
    {
        id: "vandelvira",
        nombre: "Colegio Vandelvira",
        direccion: "Ctra. de Jabalcuz, 2, 23002 Jaén",
        logo: "/images/LogosClientes/vandelvira.png",
        niveles: ["Junior"],
        status: 'live',
    },
    {
        id: "divinomaestro",
        nombre: "Colegio Divino Maestro",
        direccion: "C. Los Peñas, 12, 23002 Jaén",
        logo: "/images/LogosClientes/divino-maestro.png",
        niveles: ["Junior"],
        status: 'live',
    },
    {
        id: "navasdetolosa",
        nombre: "Colegio Navas de Tolosa",
        direccion: "Calle Europa, S/N, 23006 Jaén",
        logo: "/images/LogosClientes/junta.png",
        niveles: ["Junior"],
        status: 'live',
    },
    // --- HISTÓRICO (PAST) ---
    {
        id: "alcala-venceslada",
        nombre: "CEIP Alcalá Venceslada",
        direccion: "Jaén",
        status: 'past',
    },
    {
        id: "santo-tomas",
        nombre: "CEIP Santo Tomás",
        direccion: "Jaén",
        status: 'past',
    },
    {
        id: "inmaculada-linares",
        nombre: "Colegio La Inmaculada Concepción",
        direccion: "Linares, Jaén",
        status: 'past',
    },
    {
        id: "virgen-castillo",
        nombre: "CEIP Virgen del Castillo",
        direccion: "Carcabuey, Córdoba",
        status: 'past',
    },
    {
        id: "los-olivos",
        nombre: "Colegio Los Olivos",
        direccion: "Málaga",
        status: 'past',
    },
    {
        id: "atalaya-marbella",
        nombre: "Colegio Atalaya",
        direccion: "Marbella, Málaga",
        status: 'past',
    },
    {
        id: "juan-pasquau",
        nombre: "CEIP Juan Pasquau",
        direccion: "Úbeda, Jaén",
        status: 'past',
    },
    {
        id: "sagrado-corazon",
        nombre: "Colegio Sagrado Corazón de Jesús",
        direccion: "Jaén",
        status: 'past',
    },
    {
        id: "ujaen",
        nombre: "Universidad de Jaén",
        direccion: "Jaén",
        logo: "/images/LogosClientes/ujaen.png",
        status: 'past',
        isClientOnly: true,
    },
    {
        id: "camara-granada",
        nombre: "Cámara de Comercio Granada",
        direccion: "Granada",
        status: 'past',
        isClientOnly: true,
    },
    {
        id: "ayto-jaen",
        nombre: "Universidad Popular de Jaén",
        direccion: "Jaén",
        logo: "/images/LogosClientes/ayto-jaen.png",
        status: 'past',
        isClientOnly: true,
    },
];
