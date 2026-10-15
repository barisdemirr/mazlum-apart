# Mazlum Apart – Doluluk (Daire / Oda / Yatak) Sistemi

## Amaç
Yönetim tek bir ekrandan hangi yatağın boş olduğunu yönetsin; öğrenci detay sayfasında boş yatağı görüp seçerek başvursun.

## Veri modeli
- **Apartment (Daire):** ad, kat, hangi oda tipine ait (RoomType).
- **Room (Oda):** daireye bağlı, ad.
- **Bed (Yatak):** odaya bağlı, etiket (Sol/Sağ yatak).
- **Period (Dönem):** örn. 2026–2027. Doluluk dönem bazlıdır.
- **BedBlock:** yönetimin elle verdiği durum (Kapalı / Dolu / Ayrılmış), dönem + yatak bazlı, not alanlı.

## Durumlar (hesaplanır, elle tutulmaz)
- **Boş:** o dönemde aktif kayıt ve blok yok.
- **Ayrılmış:** onaylanmış/bekleyen başvuru veya "Ayrılmış" bloğu var.
- **Dolu:** yerleşmiş öğrenci veya "Dolu" bloğu var.
- **Kapalı:** bakım vb.; herkese açık sayfada hiç gösterilmez.
Durum, başvuru/yerleştirme kayıtlarından türetildiği için yönetim iki yerde güncelleme yapmaz.

## Herkese açık uç nokta
`GET /api/room-types/{slug}/availability` → dönem + daireler → odalar → yataklar (`id`, `label`, `status`). Öğrenci verisi **asla** dönmez.

## Öğrenci akışı
1. Detay sayfasında daireleri/odaları görür, boş yatağa tıklar (veya "Yatak fark etmez").
2. Sağdaki kart seçimi gösterir; "Başvur" → `/basvuru?oda=<slug>&yatak=<bedId>`.
3. Başvuru formu bu parametreleri okur; gönderince yatak "Ayrılmış" olur.
4. Başkası aynı anda almışsa form "bu yatak artık boş değil" der ve yeniden seçtirir.

## Yönetim akışı (admin panel, sonraki aşama)
- **Doluluk panosu:** daire kartları, içinde odalar, yatak kutuları; renk kodu sitedekiyle aynı.
- Yatağa tıkla → Boş / Ayrılmış / Dolu / Kapalı seç (+ not). Toplu işlem: "daireyi tamamen boşalt".
- Başvuru onaylanınca yatak otomatik Dolu olur; öğrenci ayrılınca Boş'a döner.
- Dönem değişiminde bir önceki dönemden "devral" seçeneği.
- Daire/oda/yatak ekleme-düzenleme tek sayfada.

## Açık sorular (müşteriyle netleşmeli)
- Ayrılmış yatağın tutulma süresi (örn. 48 saat sonra serbest mi kalsın?).
- "Yatak fark etmez" başvurularında atamayı kim, ne zaman yapıyor?
- Aynı odada yatak seçimi öğrenciye gerçekten bırakılacak mı, yoksa yönetim son kararı mı verecek?
