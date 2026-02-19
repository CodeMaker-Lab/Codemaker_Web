import { useState, useEffect } from "react";
import type { SchoolData } from "@/lib/google-sheets";
import { getSchools } from "@/lib/google-sheets";

interface Props {
    schoolId: string;
}

// --- Sub-components ---

function LevelCard({ level }: { level: string }) {
    const lvl = level.toLowerCase();
    const isJunior = lvl.includes("junior");
    const isSenior = lvl.includes("senior");
    const isMaster = lvl.includes("master");

    const color = isJunior
        ? { bg: "#22c55e", text: "white", label: "Junior" }
        : isSenior
            ? { bg: "#f97316", text: "white", label: "Senior" }
            : isMaster
                ? { bg: "#a855f7", text: "white", label: "Master" }
                : { bg: "#FFC800", text: "white", label: level };

    const description = isJunior
        ? "De 3º de Primaria a 1º de ESO. Introducción a la programación con bloques, robótica básica y primeros pasos en diseño 3D."
        : isSenior
            ? "De 2º a 4º de ESO. Programación de videojuegos, diseño 3D avanzado y primeros conceptos de Inteligencia Artificial."
            : isMaster
                ? "Bachillerato y adultos. Programación profesional, IA aplicada, desarrollo web y proyectos reales de ingeniería."
                : "Consulta disponibilidad y contenido con tu docente.";

    const emoji = isJunior ? "🚀" : isSenior ? "🎮" : isMaster ? "🤖" : "⭐";

    return (
        <div
            style={{ borderTop: `4px solid ${color.bg}` }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col gap-4"
        >
            <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: color.bg + "22" }}
            >
                {emoji}
            </div>
            <div>
                <span
                    className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ backgroundColor: color.bg + "22", color: color.bg }}
                >
                    {color.label}
                </span>
            </div>
            <p className="text-slate-600 leading-relaxed">{description}</p>
        </div>
    );
}

function Skeleton() {
    return (
        <div className="animate-pulse">
            {/* Hero skeleton */}
            <div className="h-72 bg-slate-200 w-full rounded-b-3xl" />

            {/* Content skeletons */}
            <div className="max-w-4xl mx-auto px-6 py-24 space-y-6">
                <div className="h-8 bg-slate-200 rounded-xl w-2/3" />
                <div className="h-4 bg-slate-100 rounded-xl w-full" />
                <div className="h-4 bg-slate-100 rounded-xl w-5/6" />
                <div className="h-4 bg-slate-100 rounded-xl w-4/6" />
            </div>
        </div>
    );
}

function ErrorState({ id }: { id: string }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="text-6xl">🏫</div>
            <h1 className="text-4xl font-bold text-slate-800">
                Colegio no encontrado
            </h1>
            <p className="text-slate-500 text-lg max-w-sm">
                No hemos podido encontrar información para <strong>{id}</strong>. Es
                posible que la página haya cambiado de dirección.
            </p>
            <a
                href="/colegios"
                className="inline-flex items-center gap-2 bg-[#00477A] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#003a62] transition-all"
            >
                Ver todos los colegios
            </a>
        </div>
    );
}

// --- Main Component ---

export default function SchoolPageClient({ schoolId }: Props) {
    const [school, setSchool] = useState<SchoolData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        getSchools()
            .then((schools) => {
                const found = schools.find((s) => s.id === schoolId);
                if (found) {
                    setSchool(found);
                    // Update page title dynamically
                    document.title = `CodeMaker | ${found.nombre}`;
                } else {
                    setError(true);
                }
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [schoolId]);

    if (loading) return <Skeleton />;
    if (error || !school) return <ErrorState id={schoolId} />;

    const availableLevels = school.niveles as ("junior" | "senior" | "master")[];

    const levelNames =
        availableLevels.length > 1
            ? availableLevels
                .slice(0, -1)
                .join(", ")
                .toUpperCase() +
            " Y " +
            availableLevels.slice(-1)[0].toUpperCase()
            : availableLevels[0]?.toUpperCase() ?? "";

    return (
        <>
            {/* Hero Section */}
            <section
                className="relative py-24 px-6 text-white overflow-hidden"
                style={{ backgroundColor: school.color || "#00477A" }}
            >
                <div className="absolute inset-0 opacity-[0.07] patron-puntos-luz pointer-events-none" />
                <div className="max-w-5xl mx-auto relative z-10 space-y-4">
                    <span className="text-xs font-black uppercase tracking-widest opacity-60">
                        Proyecto Educativo Codemaker · Curso {school.curso}
                    </span>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none">
                        {school.nombre}
                    </h1>
                    {school.direccion && (
                        <p className="text-lg opacity-70 font-medium">{school.direccion}</p>
                    )}
                </div>
            </section>

            {/* Intro Text Section */}
            <section className="py-24 px-6 bg-white relative patron-puntos border-t border-slate-100">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <div className="space-y-6 text-slate-700 text-lg leading-relaxed font-medium">
                        <p>
                            Codemaker es un{" "}
                            <span className="text-green-500 font-bold">
                                proyecto educativo nacido en 2014
                            </span>{" "}
                            y que ha formado a más de{" "}
                            <span className="bg-green-100 px-2 py-0.5 rounded text-green-700 font-bold">
                                1000 alumnos y alumnas
                            </span>{" "}
                            en Programación, Robótica, Diseño 3D e Inteligencia Artificial, a
                            través de nuestros centros educativos asociados.
                        </p>
                        <p>
                            Nuestro objetivo es acercar la tecnología de forma creativa y
                            accesible a alumnos/as de primaria y secundaria, para que pasen de
                            ser usuarios de tecnología a ser creadores, capaces de desarrollar
                            sus propias aplicaciones, crear sus propios videojuegos e incluso
                            programar sus propios inventos, desarrollando así las habilidades
                            más importantes del presente y del futuro.
                        </p>
                    </div>
                </div>
            </section>

            {/* Content & Levels Section */}
            <section className="py-24 px-6 bg-[#00477A] text-white overflow-hidden relative">
                <div className="absolute inset-0 opacity-[0.07] patron-puntos-luz pointer-events-none" />
                <div className="max-w-5xl mx-auto space-y-12 relative z-10">
                    <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
                        Contenidos y niveles Codemaker
                    </h2>
                    <div className="space-y-6 text-lg text-slate-200 opacity-90">
                        <p>
                            ¿Quieres aprender a programar, desarrollar tus propios
                            videojuegos, kit a entender y utilizar la IA para crear increíbles
                            proyectos?
                        </p>
                        <p>
                            En Codemaker enseñamos todas estas nuevas tecnologías de forma
                            gradual, desde 3º de primaria hasta bachillerato, empezando con
                            contenidos básicos de informática para ir avanzando hasta
                            conceptos profesionales de ingeniería.
                        </p>
                        <p>
                            Nuestro programa se divide en diferentes edades y niveles. En el{" "}
                            {school.nombre} ofertamos el nivel {levelNames}:
                        </p>
                    </div>

                    <div
                        className={`grid grid-cols-1 ${availableLevels.length === 2
                                ? "md:grid-cols-2"
                                : availableLevels.length >= 3
                                    ? "md:grid-cols-3"
                                    : ""
                            } gap-8 pt-8`}
                    >
                        {availableLevels.map((lvl) => (
                            <LevelCard key={lvl} level={lvl} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Schedule & Groups Section */}
            <section className="py-24 px-6 bg-white patron-puntos border-t border-slate-100">
                <div className="max-w-4xl mx-auto space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl md:text-5xl font-medium text-slate-900 tracking-tight">
                            Grupos y horarios
                        </h2>
                        <p className="text-slate-600 text-lg font-medium">
                            A continuación puedes ver los grupos, horarios y precios para el
                            curso {school.curso}:
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {school.grupos.map((grupo, index) => (
                            <div
                                key={index}
                                className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4 transition-all hover:border-blue-200"
                            >
                                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                                    {/* Dot + Level Chip */}
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-3 h-3 rounded-full shrink-0 ${grupo.nivel.toLowerCase().includes("junior")
                                                    ? "bg-[#22c55e]"
                                                    : grupo.nivel.toLowerCase().includes("senior")
                                                        ? "bg-[#f97316]"
                                                        : grupo.nivel.toLowerCase().includes("master")
                                                            ? "bg-[#a855f7]"
                                                            : "bg-[#FFC800]"
                                                }`}
                                        />
                                        {grupo.nivel && (
                                            <span
                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${grupo.nivel.toLowerCase().includes("junior")
                                                        ? "bg-green-100 text-green-700"
                                                        : grupo.nivel.toLowerCase().includes("senior")
                                                            ? "bg-orange-100 text-orange-700"
                                                            : grupo.nivel.toLowerCase().includes("master")
                                                                ? "bg-purple-100 text-purple-700"
                                                                : "bg-slate-200 text-slate-700"
                                                    }`}
                                            >
                                                {grupo.nivel}
                                            </span>
                                        )}
                                    </div>

                                    {/* Group Info */}
                                    <div className="space-y-1">
                                        <p className="text-xl md:text-lg text-slate-800 font-bold">
                                            Grupo {index + 1}:{" "}
                                            <span className="font-medium text-slate-600 block md:inline md:ml-1">
                                                {grupo.horario}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="flex items-center justify-between md:justify-end gap-3 pt-5 md:pt-0 border-t border-blue-100/50 md:border-t-0">
                                    <span className="text-xs uppercase font-bold text-slate-400">
                                        Precio
                                    </span>
                                    <span className="bg-blue-100 px-4 py-1.5 rounded-xl text-[#00477A] font-black whitespace-nowrap">
                                        {grupo.precio}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Information, Contact & Enrollment Section */}
            <section className="py-24 px-6 bg-slate-50 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] patron-puntos pointer-events-none" />

                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
                        {/* Left Column: Info & Contact */}
                        <div className="lg:col-span-7 h-full">
                            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-xl h-full flex flex-col justify-between space-y-10 transition-all hover:shadow-2xl hover:border-blue-100">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h2 className="text-3xl font-bold text-[#00477A] tracking-tight">
                                            Información y contacto
                                        </h2>
                                        <p className="text-slate-600 font-medium text-lg">
                                            Resolvemos tus dudas sobre el curso y el equipo docente:
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <details className="group bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden transition-all hover:bg-white hover:border-blue-200">
                                            <summary className="flex justify-between items-center p-6 cursor-pointer font-bold text-slate-800 list-none">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-xl">
                                                        ℹ️
                                                    </div>
                                                    <span className="text-lg">
                                                        Información general {school.curso}
                                                    </span>
                                                </div>
                                                <span className="transition-transform group-open:rotate-180 text-slate-400">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="24"
                                                        height="24"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="m6 9 6 6 6-6" />
                                                    </svg>
                                                </span>
                                            </summary>
                                            <div className="px-6 pb-6 pt-2 text-slate-600 leading-relaxed text-lg whitespace-pre-line">
                                                {school.info_general}
                                            </div>
                                        </details>

                                        <details
                                            className="group bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden transition-all hover:bg-white hover:border-blue-200"
                                            open
                                        >
                                            <summary className="flex justify-between items-center p-6 cursor-pointer font-bold text-slate-800 list-none">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center text-xl">
                                                        👨‍🏫
                                                    </div>
                                                    <span className="text-lg">
                                                        Docente y contacto directo
                                                    </span>
                                                </div>
                                                <span className="transition-transform group-open:rotate-180 text-slate-400">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="24"
                                                        height="24"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="m6 9 6 6 6-6" />
                                                    </svg>
                                                </span>
                                            </summary>
                                            <div className="px-6 pb-6 pt-2 space-y-6">
                                                {school.docentes.map((docente, i) => (
                                                    <div
                                                        key={i}
                                                        className="p-6 bg-white rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-blue-100 hover:shadow-sm"
                                                    >
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                                                    Responsable docente
                                                                </p>
                                                                {docente.grupos && (
                                                                    <span className="bg-blue-50 text-[#007AFB] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-100/50">
                                                                        {docente.grupos}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-slate-800 font-black text-xl whitespace-pre-line">
                                                                {docente.nombre}
                                                            </p>
                                                            <p className="text-slate-500 font-medium whitespace-pre-line">
                                                                {docente.contacto}
                                                            </p>
                                                        </div>
                                                        {docente.whatsapp && (
                                                            <a
                                                                href={`https://wa.me/${docente.whatsapp}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-3 bg-[#25D366] text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-[#128C7E] transition-all shadow-lg hover:shadow-green-100 active:scale-95 whitespace-nowrap"
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    width="24"
                                                                    height="24"
                                                                    viewBox="0 0 24 24"
                                                                    fill="currentColor"
                                                                >
                                                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.316 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.818-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                                                </svg>
                                                                WhatsApp
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                </div>
                                <div className="pt-4 opacity-50">
                                    <p className="text-xs font-bold uppercase tracking-widest text-[#00477A]">
                                        Proyecto Educativo Codemaker
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Enrollment Card */}
                        <div className="lg:col-span-5 h-full">
                            <div className="bg-[#00477A] rounded-[2.5rem] p-8 md:p-12 text-white text-center h-full flex flex-col justify-center gap-8 shadow-2xl relative overflow-hidden group border border-white/10">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-150 duration-700" />

                                <div className="space-y-4 relative z-10">
                                    <h2 className="text-4xl font-bold tracking-tight leading-none text-white">
                                        Únete ahora
                                    </h2>
                                    <p className="text-blue-100 font-medium text-lg leading-relaxed pt-2">
                                        Asegura tu plaza para el curso{" "}
                                        <span className="text-white font-bold">{school.curso}</span>
                                        . Inscripción gratuita durante el mes de septiembre.
                                    </p>
                                </div>

                                <div className="pt-6 relative z-10 space-y-4">
                                    <a
                                        href={school.link_inscripcion}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-3 bg-white text-[#00477A] w-full py-5 rounded-2xl font-black text-xl hover:bg-blue-50 transition-all shadow-xl active:scale-[0.98]"
                                    >
                                        IR A INSCRIPCIÓN
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="22"
                                            height="22"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M5 12h14" />
                                            <path d="m12 5 7 7-7 7" />
                                        </svg>
                                    </a>

                                    <a
                                        href="/cursos/condicionesmatricula"
                                        className="inline-flex items-center justify-center gap-2 text-blue-200/80 hover:text-white font-bold uppercase tracking-widest text-xs transition-colors"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="16" y2="13" x2="8" y1="13" />
                                            <line x1="16" y2="17" x2="8" y1="17" />
                                            <polyline points="10 9 9 9 8 9" />
                                        </svg>
                                        Condiciones de matrícula
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
