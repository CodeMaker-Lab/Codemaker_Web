
import { getSchools } from "./src/lib/google-sheets";

async function main() {
    try {
        const schools = await getSchools();
        console.log("Schools found:", schools.length);
        schools.forEach(s => {
            console.log(`- ID: ${s.id}, Name: ${s.nombre}, Docentes: ${s.docentes.length}`);
            if (s.docentes.length === 0) {
                console.warn(`  WARNING: School ${s.id} has NO docentes!`);
            }
        });
    } catch (e) {
        console.error(e);
    }
}

main();
