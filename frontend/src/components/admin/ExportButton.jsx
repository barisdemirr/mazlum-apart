"use client";

import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { useToast } from "@/components/admin/Toast";
import { downloadXlsx, exportFilename } from "@/lib/admin/xlsx";

/**
 * "Excel'e aktar": verilen satırları, seçili dönem adıyla .xlsx olarak indirir.
 * `columns` içinde `export` tanımı olan sütunlar dosyaya yazılır.
 */
export default function ExportButton({ name, columns, rows, className = "" }) {
    const { period } = useAdmin();
    const toast = useToast();

    const exportColumns = columns
        .filter((c) => c.export)
        .map((c) => ({ header: c.header, type: c.export.type ?? "text", value: c.export.value, width: c.export.width }));

    const download = () => {
        if (!rows.length) {
            toast.info("Aktarılacak kayıt yok.");
            return;
        }
        try {
            downloadXlsx({ filename: exportFilename(name, period.name), sheetName: name, columns: exportColumns, rows });
        } catch {
            toast.error("Dosya hazırlanamadı.");
        }
    };

    return (
        <button type="button" onClick={download} className={`ad-btn ad-btn-soft ad-btn-sm ${className}`}>
            <Icon name="download" className="text-[16px]" />
            Excel'e aktar
        </button>
    );
}
