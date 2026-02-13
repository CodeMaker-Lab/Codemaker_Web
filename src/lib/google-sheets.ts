export interface SchoolGroup {
    horario: string;
    nivel: string;
    precio: string;
}

export interface SchoolData {
    id: string;
    nombre: string;
    curso: string;
    color: string;
    niveles: string[];
    grupos: SchoolGroup[];
    info_general: string;
    info_docente: string;
    info_contacto: string;
    whatsapp_num?: string;
    link_inscripcion: string;
    status: 'live' | 'past';
}

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTMkRkozxJVhDKKWY8Bxvb7R1hH-6HtLKyXt69Jpk51ivWLHBjw4yOUeRUdC2PSB80tUBTtIyEKG2vY/pub?gid=0&single=true&output=csv';

export async function getSchools(): Promise<SchoolData[]> {
    try {
        const response = await fetch(`${SHEET_URL}&cb=${Date.now()}`);
        if (!response.ok) throw new Error('Failed to fetch sheet data');
        const csvText = await response.text();

        // Simple CSV parser that handles quotes for "niveles"
        const rows = csvText.split(/\r?\n/).filter(row => row.trim() !== '');
        const headers = parseCSVRow(rows[0]);
        const dataRows = rows.slice(1);

        return dataRows.map(row => {
            const values = parseCSVRow(row);
            const school: any = {};

            headers.forEach((header, index) => {
                school[header] = values[index];
            });

            // Process niveles (junior, senior -> ["junior", "senior"])
            const nivelesRaw = school.niveles || '';
            const niveles = nivelesRaw.split(',').map((n: string) => n.trim().toLowerCase()).filter((n: string) => n !== '');

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

            // Find whatsapp field case-insensitively and stripping common separators
            const whatsappKey = Object.keys(school).find(k => {
                const cleanKey = k.toLowerCase().replace(/[\s\._\-]/g, '');
                return cleanKey === 'whatsapp' || cleanKey === 'whatsappnum';
            });
            const whatsappVal = whatsappKey ? school[whatsappKey] : '';

            return {
                id: school.id,
                nombre: school.nombre,
                curso: school.curso || '24/25',
                color: school.color ? (school.color.startsWith('#') ? school.color : `#${school.color}`) : '#22c55e',
                niveles,
                grupos,
                info_general: school.info_general,
                info_docente: school.info_docente,
                info_contacto: school.info_contacto,
                whatsapp_num: (whatsappVal || '').toString().trim().replace(/\s+/g, ''),
                link_inscripcion: school.link_inscripcion,
                status: school.status as 'live' | 'past'
            };
        });
    } catch (error) {
        console.error('Error fetching schools:', error);
        return [];
    }
}

function parseCSVRow(row: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}
