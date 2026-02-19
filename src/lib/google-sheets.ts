export interface SchoolGroup {
    horario: string;
    nivel: string;
    precio: string;
}

export interface Docente {
    nombre: string;
    contacto: string;
    whatsapp: string;
    grupos: string;
}

export interface SchoolData {
    id: string;
    nombre: string;
    direccion?: string;
    logo?: string;
    curso: string;
    color: string;
    niveles: string[];
    grupos: SchoolGroup[];
    info_general: string;
    docentes: Docente[];
    status: 'live' | 'past';
    link_inscripcion: string;
}

export interface GlobalConfig {
    link_calendario_escolar: string;
    curso_actual: string;
    link_app: string;
    [key: string]: string;
}

const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTMkRkozxJVhDKKWY8Bxvb7R1hH-6HtLKyXt69Jpk51ivWLHBjw4yOUeRUdC2PSB80tUBTtIyEKG2vY/pub?single=true&output=csv';
const SCHOOLS_URL = `${BASE_URL}&gid=0`;
const CONFIG_URL = `${BASE_URL}&gid=1667533384`;

export async function getGlobalConfig(): Promise<GlobalConfig> {
    try {
        const response = await fetch(`${CONFIG_URL}&cb=${Date.now()}`);
        if (!response.ok) throw new Error('Failed to fetch config data');
        const csvText = await response.text();
        const rows = parseCSV(csvText);

        const config: GlobalConfig = {
            link_calendario_escolar: '',
            curso_actual: '24/25',
            link_app: '/login'
        };

        // Skip header row [key, value]
        rows.slice(1).forEach(row => {
            if (row[0] && row[1]) {
                config[row[0].trim()] = row[1].trim();
            }
        });

        return config;
    } catch (error) {
        console.error('Error fetching config:', error);
        return {
            link_calendario_escolar: 'https://www.juntadeandalucia.es/educacion/portals/web/inspeccion/calendario-escolar',
            curso_actual: '24/25',
            link_app: '/login'
        };
    }
}

export async function getSchools(): Promise<SchoolData[]> {
    try {
        const response = await fetch(`${SCHOOLS_URL}&cb=${Date.now()}`);
        if (!response.ok) throw new Error('Failed to fetch school data');
        const csvText = await response.text();

        const allRows = parseCSV(csvText);
        if (allRows.length === 0) return [];

        const headers = allRows[0];
        const dataRows = allRows.slice(1);

        return dataRows.map(rowValues => {
            const school: any = {};

            headers.forEach((header, index) => {
                school[header] = rowValues[index];
            });

            // Process niveles (junior, senior -> ["junior", "senior"])
            const nivelesRaw = school.niveles || '';
            const niveles = nivelesRaw.split(',').map((n: string) => n.trim().charAt(0).toUpperCase() + n.trim().slice(1).toLowerCase()).filter((n: string) => n !== '');

            // Process groups
            const grupos: SchoolGroup[] = [];
            for (let i = 1; i <= 10; i++) {
                const horario = school[`grupo${i}_horario`];
                const nivel = school[`grupo${i}_nivel`];
                const precio = school[`grupo${i}_precio`];
                if (horario || nivel || precio) {
                    grupos.push({
                        horario: horario || '',
                        nivel: nivel || '',
                        precio: precio || ''
                    });
                }
            }

            // Process Docentes (multiple support)
            const docentes: Docente[] = [];

            // Try to find up to 3 teachers from the new columns
            for (let i = 1; i <= 3; i++) {
                const nombre = school[`docente${i}_nombre`];
                const contacto = school[`docente${i}_contacto`];
                const whatsappRaw = school[`docente${i}_whatsapp`];
                const gruposTarget = school[`docente${i}_grupos`];

                if (nombre) {
                    docentes.push({
                        nombre: nombre.trim(),
                        contacto: (contacto || '').trim(),
                        whatsapp: (whatsappRaw || '').toString().trim().replace(/\s+/g, ''),
                        grupos: (gruposTarget || '').trim()
                    });
                }
            }

            // Fallback for single teacher (backward compatibility)
            if (docentes.length === 0 && school.info_docente) {
                docentes.push({
                    nombre: school.info_docente,
                    contacto: school.info_contacto || '',
                    whatsapp: (school.whatsapp_num || '').toString().trim().replace(/\s+/g, ''),
                    grupos: ''
                });
            }

            const normalizedId = (school.id || '').toLowerCase().replace(/[\s\._\-]/g, '');

            return {
                id: normalizedId,
                nombre: school.nombre,
                direccion: school.direccion,
                logo: school.logo,
                curso: school.curso || '24/25',
                color: school.color ? (school.color.startsWith('#') ? school.color : `#${school.color}`) : '#22c55e',
                niveles,
                grupos,
                info_general: school.info_general,
                docentes,
                status: school.status as 'live' | 'past',
                link_inscripcion: school.link_inscripcion
            };
        });
    } catch (error) {
        console.error('Error fetching schools:', error);
        return [];
    }
}

function parseCSV(text: string): string[][] {
    const result: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField.trim());
            currentField = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (currentField !== '' || currentRow.length > 0) {
                currentRow.push(currentField.trim());
                result.push(currentRow);
                currentField = '';
                currentRow = [];
            }
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
        } else {
            currentField += char;
        }
    }

    if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        result.push(currentRow);
    }

    return result;
}
