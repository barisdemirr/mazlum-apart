/** Finansal işlemlerde hesap alanının varsayılanı: "Nakit Kasa" (yoksa ilk kasa, o da yoksa ilk hesap). Kullanıcı başka hesap seçebilir. */
const norm = (s) => String(s ?? "").toLocaleLowerCase("tr").trim();

export function defaultAccountId(accounts, type) {
    const list = (accounts ?? []).filter((a) => a.active !== false && (!type || a.type === type));
    return (list.find((a) => norm(a.name) === "nakit kasa") ?? list.find((a) => a.type === "cash") ?? list[0])?.id ?? "";
}
