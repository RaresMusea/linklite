export function parseDDMonYYYY(raw: string): Date | null {
    if (!raw || typeof raw !== 'string') return null;

    const m = raw.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
    if (!m) return null;

    const day = Number(m[1]);
    const monStr = m[2].toLowerCase();
    const year = Number(m[3]);

    const months: Record<string, number> = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
    };

    const month = months[monStr];
    if (month === undefined) return null;

    if (day < 1 || day > 31) return null;

    const monthsWith30Days = [3, 5, 8, 10]; // Apr, Jun, Sep, Nov (zero-based)
    if (monthsWith30Days.includes(month) && day > 30) return null;

    if (month === 1) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        if (day > 29 || (day === 29 && !isLeapYear)) return null;
    }

    const d = new Date(Date.UTC(year, month, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month || d.getUTCDate() !== day) {
        return null;
    }

    return Number.isNaN(d.getTime()) ? null : d;
}
