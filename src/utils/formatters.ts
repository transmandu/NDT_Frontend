export const fmt = (n: number | null | undefined, d: number = 4) => n !== null ? n?.toFixed(d) : '-';

export const fmtDate = (s: string | undefined) => {
    if (!s) return '-';
    try {
        const d = new Date(s);
        return d.toLocaleDateString('es-VE', {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    } catch (err) {
        console.error("Error formateando fecha", s, err);
        return '-';
    }
};

export const formatHash = (h: string) => h.length === 64 ? h.slice(0, 32) + '\n' + h.slice(32) : h;