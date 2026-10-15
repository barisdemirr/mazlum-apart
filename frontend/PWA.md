# PWA — Öğrenci ve Yönetim uygulamaları

İki ayrı kurulabilir uygulama vardır; manifestleri, scope'ları, ikonları, önbellekleri ve bildirim abonelikleri birbirinden bağımsızdır.

| | Öğrenci | Yönetim |
|---|---|---|
| Yol (scope) | `/ogrenci` | `/admin` |
| Manifest | `public/pwa/student.webmanifest` | `public/pwa/admin.webmanifest` |
| Kaynak ikon (SİZ koyarsınız) | `public/pwa/student-mobileicon.png` | `public/pwa/admin-mobileicon.png` |
| Service worker | `/pwa/sw.js?app=student` | `/pwa/sw.js?app=admin` |
| Önbellek adı | `ma-student-v1` | `ma-admin-v1` |

## 1. İkonlar
1. Kare, en az 512×512 (ideal 1024×1024) PNG hazırlayın. Logo **ortadaki %80'lik güvenli alanda** kalsın (Android maskeli ikonda kenarlar kırpılır).
2. `public/pwa/student-mobileicon.png` ve `public/pwa/admin-mobileicon.png` dosyalarının üstüne yazın (şu an yer tutucu "M" ikonları var).
3. `npm run pwa:icons` — `-192`, `-512`, `-maskable-512`, `-apple-180` dosyalarını üretir. Üretilenleri de commit'leyin.
4. Eski ikon telefonda önbellekte kalabilir; uygulamayı kaldırıp yeniden kurun.

## 2. Bildirim anahtarı (VAPID)
```
npx web-push generate-vapid-keys
```
- Public key → frontend `.env.local` / sunucu ortamı: `NEXT_PUBLIC_VAPID_PUBLIC_KEY=...`
- Private key → **yalnızca backend**. Frontend'e asla koymayın.
- Anahtar yoksa bildirim bölümü "yapılandırılmamış" der; uygulama kurulumu etkilenmez.

## 3. Test
- Service worker **yalnızca production'da** çalışır: `npm run build && npm start`, sonra `http://localhost:3000/ogrenci` veya `/admin`.
- Geliştirmede denemek için `NEXT_PUBLIC_PWA_DEV=1` (dev'de eski kayıtlar normalde otomatik silinir).
- Gerçek telefonda kurulum için HTTPS gerekir (localhost hariç).
- Chrome DevTools → Application → Manifest / Service Workers.
- **iOS**: Safari → Paylaş → "Ana Ekrana Ekle". Web push iOS'ta yalnızca ana ekrandan açılan uygulamada çalışır (iOS 16.4+). Uygulama bunu kullanıcıya gösterir.
- Önbellek stratejisi: HTML ve `/api` asla önbelleğe alınmaz (veri hep güncel). `/_next/static` ve ikonlar cache-first. Çevrimdışıyken yalnızca "bağlantı yok" sayfası gösterilir.
- Yeni sürümde SW önbelleğini sıfırlamak için `public/pwa/sw.js` içindeki `VERSION` değerini artırın.

## 4. Dil (öğrenci)
PWA scope'u tek yol olduğu için öğrenci uygulamasında URL hep `/ogrenci/...`'dir (`/en/ogrenci` → `/ogrenci`'ye yönlenir). Dil `ma_lang` çerezindedir; dil değiştirilince çerez yazılıp sayfa yenilenir. Backend de bildirimi abonelikteki `lang` değerine göre gönderir.

## 5. Backend sözleşmesi (bir sonraki aşama)
`src/services/push.js` şu an localStorage mock'udur; backend'e geçince aynı fonksiyon imzalarıyla fetch'e çevrilir.

| Uç nokta | Gövde |
|---|---|
| `POST /student/push/subscriptions` | `{ endpoint, keys:{p256dh,auth}, lang, userAgent }` |
| `DELETE /student/push/subscriptions` | `{ endpoint }` |
| `POST /admin/push/subscriptions` / `DELETE` | aynı |
| `POST /admin/push/test` (opsiyonel) | kendi cihazlarına test bildirimi |
| `POST /admin/notifications/bulk` | `{ messages:[{enrollmentId,title:{tr,en},body:{tr,en}}], url, purpose }` |

Push yükü (Web Push, JSON, şifreli): `{ "title", "body", "url", "tag", "icon"?, "image"? }`
- `url` zorunlu olarak aynı uygulamanın scope'unda olmalıdır (`/ogrenci/...` veya `/admin/...`); aksi halde SW ana sayfayı açar.
- Başlık ≤ 65, gövde ≤ 240 karakter (frontend doğrular; backend de doğrulamalı).
- Push servisi `404/410` dönerse abonelik silinmelidir.
- Her kişi için **kendi dilindeki** metin (abonelik `lang`) gönderilir; öğrenciye değişkenler (`{ad}`, `{tutar}`, `{vade}`…) backend'de doldurulur ya da frontend'in hazırladığı metin kullanılır.
- Toplu bildirimde bildirimi kapalı öğrenciler atlanır ve iletişim geçmişine "Bildirim" kanalıyla kaydedilir (SMS ile ulaşma seçeneği arayüzde var).
- Öğrenci/yönetici çıkış yapınca ilgili abonelik silinmelidir.
