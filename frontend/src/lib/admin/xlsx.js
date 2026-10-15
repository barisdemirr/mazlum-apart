"use client";

/**
 * Bağımlılıksız .xlsx üretici (panel şimdilik tarayıcıda üretir; backend gelince ClosedXML ile
 * GET /api/admin/periods/{id}/exports/<tablo>.xlsx olur, ekran aynı kalır).
 *
 * Plan 8: başlıklar Türkçe, para hücreleri ₺ biçimli sayı, tarihler gg.aa.yyyy, başlık satırı sabit ve filtreli.
 * columns: [{ header, type: "text" | "number" | "money" | "date", value: (row) => any, width? }]
 */

/* ───── CRC32 + ZIP (sıkıştırmasız) ───── */
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function zip(files) {
    const enc = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;

    const u16 = (n) => new Uint8Array([n & 255, (n >>> 8) & 255]);
    const u32 = (n) => new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
    const push = (...parts) => parts.forEach((p) => { chunks.push(p); offset += p.length; });

    for (const file of files) {
        const name = enc.encode(file.name);
        const data = enc.encode(file.content);
        const crc = crc32(data);
        const start = offset;
        push(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data);
        central.push({ name, crc, size: data.length, start });
    }

    const centralStart = offset;
    for (const c of central) {
        push(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(c.crc), u32(c.size), u32(c.size), u16(c.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.start), c.name);
    }
    const centralSize = offset - centralStart;
    push(u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(centralSize), u32(centralStart), u16(0));

    return new Blob(chunks, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/* ───── Sayfa XML ───── */
const esc = (v) => String(v).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

const colName = (i) => {
    let s = "";
    for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    return s;
};

const dateSerial = (iso) => {
    const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
};

const STYLE = { header: 1, money: 2, date: 3 };

function sheetXml(columns, rows) {
    const widths = columns.map((c) => c.width ?? Math.max(12, Math.min(40, c.header.length + 4)));
    const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");

    const headRow = `<row r="1">${columns.map((c, i) => `<c r="${colName(i)}1" s="${STYLE.header}" t="inlineStr"><is><t>${esc(c.header)}</t></is></c>`).join("")}</row>`;

    const body = rows
        .map((row, r) => {
            const cells = columns
                .map((c, i) => {
                    const ref = `${colName(i)}${r + 2}`;
                    const v = c.value(row);
                    if (v === null || v === undefined || v === "") return "";
                    if (c.type === "money" || c.type === "number") return `<c r="${ref}"${c.type === "money" ? ` s="${STYLE.money}"` : ""}><v>${Number(v)}</v></c>`;
                    if (c.type === "date") return `<c r="${ref}" s="${STYLE.date}"><v>${dateSerial(v)}</v></c>`;
                    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
                })
                .join("");
            return `<row r="${r + 2}">${cells}</row>`;
        })
        .join("");

    const last = `${colName(columns.length - 1)}${Math.max(1, rows.length + 1)}`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${headRow}${body}</sheetData><autoFilter ref="A1:${last}"/></worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;₺&quot;"/><numFmt numFmtId="165" formatCode="dd\\.mm\\.yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E40AF"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export function buildXlsx({ sheetName = "Sayfa1", columns, rows }) {
    const name = esc(sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
    return zip([
        { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
        { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
        { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
        { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
        { name: "xl/styles.xml", content: STYLES },
        { name: "xl/worksheets/sheet1.xml", content: sheetXml(columns, rows) },
    ]);
}

/** Dosya adı: ogrenciler_2026-2027_14-10-2026.xlsx */
export function exportFilename(base, periodName, now = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const slug = String(periodName).replace(/[–—]/g, "-").replace(/\s+/g, "-").replace(/[^\w-]/g, "").replace(/-Akademik$/i, "");
    return `${base}_${slug}_${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}.xlsx`;
}

export function downloadXlsx({ filename, ...spec }) {
    const blob = buildXlsx(spec);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
