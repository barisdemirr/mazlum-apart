/** Marka adı (değişmez). İletişim bilgileri sabit değildir: yönetim panelinden girilir ve lib/site/SiteProvider ile gelir. */
export const BRAND_NAME = "Mazlum Apart";

/**
 * Açılış ekranı: yalnızca ~1 sn görünür ve oturum başına bir kez oynar.
 * Süre globals.css içindeki preloader animasyonlarıyla eşleşmelidir (harfler + perde = 1 sn).
 */
export const PRELOADER_DURATION = 1000;
export const PRELOADER_STORAGE_KEY = "mazlum-preloader-seen";
