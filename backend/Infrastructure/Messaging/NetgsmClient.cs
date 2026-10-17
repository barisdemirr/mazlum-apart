using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace MazlumApart.Infrastructure.Messaging;

/// <summary>
/// Netgsm SMS REST v2 istemcisi.
///  - Kimlik: HTTP Basic (kullanıcı kodu = abone no, şifre = API ALT KULLANICI şifresi; ana hesap şifresi çalışmaz).
///  - Gönderim: POST {BaseUrl}{SendPath}  → 200 {"code":"00","jobid":"…","description":"…"} | 406 {"code":"30",…} (hata kodu)
///  - Rapor:    POST {BaseUrl}{ReportPath} (jobid ile; alıcı bazlı durum)  — Netgsm teslim raporunu push etmez, sorgulanır.
///  - Bakiye:   POST {BaseUrl}{BalancePath}
/// Rapor ve bakiye yanıtları esnek ayrıştırılır; yol/biçim farklı çıkarsa yalnızca appsettings "Sms" bölümündeki yollar değişir.
/// GÜVENLİK: Şifre yalnızca Authorization başlığında gider; bu istemcinin HttpClient günlükleri kapatılmıştır (Program.cs
/// RemoveAllLoggers) ve hatalarda URL/şifre asla günlüğe yazılmaz. Gönderimde OTOMATİK TEKRAR YOKTUR.
/// </summary>
public class NetgsmClient(HttpClient http, IOptions<SmsOptions> options, ILogger<NetgsmClient> logger)
{
    private SmsOptions O => options.Value;

    private static readonly JsonSerializerOptions Json = new() { DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };

    public enum SendOutcome { Accepted, Rejected, Unknown }

    /// <summary>JobId = Netgsm görev numarası (rapor sorgusunun anahtarı)</summary>
    public sealed record SendResult(SendOutcome Outcome, string? JobId, string? Error);

    /// <summary>No: 10 haneli cep (5XXXXXXXXX)</summary>
    public sealed record OutgoingMessage(string Msg, string No);

    private sealed record SendBody(
        [property: JsonPropertyName("msgheader")] string MsgHeader,
        [property: JsonPropertyName("encoding")] string Encoding,
        [property: JsonPropertyName("iysfilter")] string IysFilter,
        [property: JsonPropertyName("appname")] string? AppName,
        [property: JsonPropertyName("messages")] List<SendItem> Messages);

    private sealed record SendItem(
        [property: JsonPropertyName("msg")] string Msg,
        [property: JsonPropertyName("no")] string No);

    /// <summary>Bir alıcının teslim durumu (rapor satırı)</summary>
    public sealed record Report(string? Phone, string? Status, string? StatusCode, string? Operator, string? ErrorCode, string? ErrorText, int? Credits, string? Date);

    /// <summary>Netgsm hata kodu → okunur Türkçe açıklama (kodlar resmi istemci kütüphanelerinden)</summary>
    public static string Describe(string? code) => code switch
    {
        "20" => "Mesaj metninde sorun var ya da karakter sınırı aşıldı (20).",
        "30" => "Kullanıcı adı/şifre hatalı, API alt kullanıcısı yetkisiz ya da bu sunucunun IP adresi izinli değil (30).",
        "40" => "Gönderici başlığı (msgheader) Netgsm'de tanımlı/onaylı değil (40).",
        "50" => "Abone hesabında bu gönderim türüne izin yok (50).",
        "51" => "Aboneliğe ait İYS marka bilgisi bulunamadı (51).",
        "60" => "Görev (jobid) bulunamadı (60).",
        "70" => "Hatalı sorgu ya da eksik zorunlu alan (70).",
        "80" => "Gönderim sınırı aşıldı (80).",
        "85" => "Mükerrer gönderim sınırı: aynı numaraya 1 dakikada 20'den fazla görev (85).",
        _ => string.IsNullOrWhiteSpace(code) ? "Bilinmeyen sağlayıcı hatası." : $"Sağlayıcı hata kodu: {code}."
    };

    private static bool IsSuccessCode(string? code) => code is "00" or "01" or "02";

    private HttpRequestMessage Request(HttpMethod method, string path, object? body = null)
    {
        var request = new HttpRequestMessage(method, $"{O.BaseUrl.TrimEnd('/')}/{path.TrimStart('/')}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{O.UserCode}:{O.Password}")));
        if (body is not null) request.Content = JsonContent.Create(body, options: Json);
        return request;
    }

    public async Task<SendResult> SendAsync(IReadOnlyList<OutgoingMessage> messages, CancellationToken ct)
    {
        var body = new SendBody(O.MsgHeader, O.Encoding, O.IysFilter, string.IsNullOrWhiteSpace(O.AppName) ? null : O.AppName,
            messages.Select(m => new SendItem(m.Msg, m.No)).ToList());

        try
        {
            using var request = Request(HttpMethod.Post, O.SendPath, body);
            using var response = await http.SendAsync(request, ct);
            var text = (await response.Content.ReadAsStringAsync(ct)).Trim();
            var (code, jobId, description) = ParseSend(text);

            if (response.IsSuccessStatusCode)
            {
                if (IsSuccessCode(code) && !string.IsNullOrEmpty(jobId)) return new SendResult(SendOutcome.Accepted, Cut(jobId, 40), null);
                if (code is not null && !IsSuccessCode(code))
                {
                    logger.LogWarning("Netgsm gönderimi reddetti: {Code}", code);
                    return new SendResult(SendOutcome.Rejected, null, Cut(Describe(code), 300));
                }
                // 200 geldi ama yanıt anlaşılamadı: SMS gitmiş OLABİLİR
                logger.LogError("Netgsm yanıtı ayrıştırılamadı (HTTP 200).");
                return new SendResult(SendOutcome.Unknown, null, "Sağlayıcı yanıtı anlaşılamadı; gönderim durumu belirsiz.");
            }

            var status = (int)response.StatusCode;
            // 4xx (Netgsm hatalarını 406 ile döner): istek reddedildi, SMS gönderilmedi
            if (status is >= 400 and < 500)
            {
                logger.LogWarning("Netgsm gönderimi reddetti: HTTP {Status} kod {Code}", status, code);
                return new SendResult(SendOutcome.Rejected, null,
                    Cut(code is not null ? Describe(code) : $"{status} {description ?? Cut(text, 200)}", 300));
            }

            logger.LogError("Netgsm sunucu hatası: {Status}", status);
            return new SendResult(SendOutcome.Unknown, null, $"Sağlayıcı hatası ({status}).");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            // Zaman aşımı / bağlantı koptu: istek ulaşmış ve SMS gitmiş OLABİLİR → tekrar denenmez
            logger.LogError("Netgsm bağlantı hatası: {Type}", ex.GetType().Name);
            return new SendResult(SendOutcome.Unknown, null, "Sağlayıcıya bağlanılamadı ya da yanıt zaman aşımına uğradı.");
        }
    }

    /// <summary>Kalan bakiye (bağlantı/kimlik/biçim sorunu varsa null)</summary>
    public async Task<decimal?> BalanceAsync(CancellationToken ct)
    {
        try
        {
            using var request = Request(HttpMethod.Post, O.BalancePath, new { stip = 2 });
            using var response = await http.SendAsync(request, ct);
            var text = (await response.Content.ReadAsStringAsync(ct)).Trim();
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Netgsm bakiye sorgusu başarısız: {Status}", (int)response.StatusCode);
                return null;
            }
            return ParseBalance(text);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            logger.LogWarning("Netgsm bakiye sorgusu bağlantı hatası: {Type}", ex.GetType().Name);
            return null;
        }
    }

    /// <summary>Görevin (jobid) alıcı bazlı teslim raporu. Hata varsa null.</summary>
    public async Task<List<Report>?> ReportAsync(string jobId, CancellationToken ct)
    {
        try
        {
            using var request = Request(HttpMethod.Post, O.ReportPath, new { bulkIds = new[] { jobId } });
            using var response = await http.SendAsync(request, ct);
            var text = (await response.Content.ReadAsStringAsync(ct)).Trim();
            if (response.StatusCode == HttpStatusCode.NotFound) return [];
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Netgsm rapor sorgusu başarısız: {Status}", (int)response.StatusCode);
                return null;
            }
            return ParseReports(text);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException && !ct.IsCancellationRequested)
        {
            logger.LogWarning("Netgsm rapor sorgusu hatası: {Type}", ex.GetType().Name);
            return null;
        }
    }

    // ───────── Ayrıştırma (statik: kolay test edilir) ─────────

    /// <summary>Yanıt JSON ({"code","jobid","description"}) ya da düz metin ("00 123456") olabilir</summary>
    public static (string? Code, string? JobId, string? Description) ParseSend(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return (null, null, null);
        try
        {
            using var doc = JsonDocument.Parse(text);
            if (doc.RootElement.ValueKind == JsonValueKind.Object)
            {
                var root = doc.RootElement;
                return (Str(root, "code"), Str(root, "jobid") ?? Str(root, "bulkid"), Str(root, "description") ?? Str(root, "aciklama"));
            }
        }
        catch (JsonException) { /* düz metin */ }

        var parts = text.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return parts.Length == 0 ? (null, null, null) : (parts[0], parts.Length > 1 ? parts[1] : null, null);
    }

    /// <summary>Bakiye yanıtında ilk sayısal "amount/balance/kredi" değeri; bulunamazsa son sayı</summary>
    public static decimal? ParseBalance(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        try
        {
            using var doc = JsonDocument.Parse(text);
            return FindNumber(doc.RootElement, ["amount", "balance", "kredi", "credit"]);
        }
        catch (JsonException) { /* düz metin */ }

        var token = text.Split(' ', StringSplitOptions.RemoveEmptyEntries).LastOrDefault();
        return decimal.TryParse(token?.Replace(',', '.'), NumberStyles.Number, CultureInfo.InvariantCulture, out var value) ? value : null;
    }

    private static decimal? FindNumber(JsonElement element, string[] names)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var p in element.EnumerateObject())
                {
                    if (names.Contains(p.Name, StringComparer.OrdinalIgnoreCase) && TryDecimal(p.Value, out var v)) return v;
                    if (p.Value.ValueKind is JsonValueKind.Object or JsonValueKind.Array && FindNumber(p.Value, names) is { } nested) return nested;
                }
                return null;
            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray())
                    if (FindNumber(item, names) is { } found) return found;
                return null;
            default:
                return null;
        }
    }

    private static bool TryDecimal(JsonElement element, out decimal value)
    {
        value = 0;
        return element.ValueKind switch
        {
            JsonValueKind.Number => element.TryGetDecimal(out value),
            JsonValueKind.String => decimal.TryParse(element.GetString()?.Replace(',', '.'), NumberStyles.Number, CultureInfo.InvariantCulture, out value),
            _ => false
        };
    }

    /// <summary>Rapor yanıtında telefon alanı olan her nesne bir satırdır (iç içe dizilerde de aranır)</summary>
    public static List<Report> ParseReports(string text)
    {
        var list = new List<Report>();
        if (string.IsNullOrWhiteSpace(text)) return list;
        using var doc = JsonDocument.Parse(text);
        Collect(doc.RootElement, list);
        return list;
    }

    private static void Collect(JsonElement element, List<Report> list)
    {
        if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray()) Collect(item, list);
            return;
        }
        if (element.ValueKind != JsonValueKind.Object) return;

        var phone = Str(element, "cepno") ?? Str(element, "number") ?? Str(element, "no") ?? Str(element, "gsm");
        if (phone is not null)
        {
            var credits = Str(element, "mesajboy") ?? Str(element, "credit");
            list.Add(new Report(phone, Str(element, "durum") ?? Str(element, "status"), Str(element, "durumcode") ?? Str(element, "statuscode"),
                Str(element, "operator"), Str(element, "hatakod") ?? Str(element, "errorcode"), Str(element, "hataaciklama") ?? Str(element, "errordescription"),
                int.TryParse(credits, out var c) ? c : null, Str(element, "tarih") ?? Str(element, "date")));
            return;
        }
        foreach (var p in element.EnumerateObject())
            if (p.Value.ValueKind is JsonValueKind.Object or JsonValueKind.Array) Collect(p.Value, list);
    }

    private static string? Str(JsonElement obj, string name)
    {
        foreach (var p in obj.EnumerateObject())
        {
            if (!p.Name.Equals(name, StringComparison.OrdinalIgnoreCase)) continue;
            return p.Value.ValueKind switch
            {
                JsonValueKind.String => p.Value.GetString(),
                JsonValueKind.Number => p.Value.GetRawText(),
                _ => null
            };
        }
        return null;
    }

    private static string Cut(string value, int max) => value.Length > max ? value[..max] : value;
}
