using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace MazlumApart.Infrastructure.Messaging;

/// <summary>
/// Verimor SMS API v2 istemcisi (https://github.com/verimor/SMS-API/blob/master/user_guide.md).
///  - Gönderim: POST /send.json → 200 + kampanya no (düz metin) | 400 + hata kodu (ör. INSUFFICIENT_CREDITS)
///  - Kredi:    GET  /balance   → 200 + kalan kredi
///  - Rapor:    GET  /status?custom_id=… → JSON dizi (sayfa başına 100; greater_than ile devam)
/// GÜVENLİK: API şifresi istek gövdesinde/sorgusunda gider; bu istemcinin HttpClient günlükleri kapatılmıştır (Program.cs
/// RemoveAllLoggers) ve hatalarda URL/şifre asla günlüğe yazılmaz. Gönderimde OTOMATİK TEKRAR YOKTUR.
/// </summary>
public class VerimorClient(HttpClient http, IOptions<SmsOptions> options, ILogger<VerimorClient> logger)
{
    private SmsOptions O => options.Value;

    private static readonly System.Text.Json.JsonSerializerOptions Json = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public enum SendOutcome { Accepted, Rejected, Unknown }

    public sealed record SendResult(SendOutcome Outcome, string? CampaignId, string? Error);

    public sealed record OutgoingMessage(string Msg, string Dest, string Id);

    private sealed record SendBody(
        [property: JsonPropertyName("username")] string Username,
        [property: JsonPropertyName("password")] string Password,
        [property: JsonPropertyName("source_addr")] string? SourceAddr,
        [property: JsonPropertyName("valid_for")] string ValidFor,
        [property: JsonPropertyName("custom_id")] string CustomId,
        [property: JsonPropertyName("messages")] List<SendItem> Messages);

    private sealed record SendItem(
        [property: JsonPropertyName("msg")] string Msg,
        [property: JsonPropertyName("dest")] string Dest,
        [property: JsonPropertyName("id")] string Id);

    /// <summary>Teslim raporu satırı (hem /status yanıtı hem push geri çağrısı aynı alanları taşır)</summary>
    public sealed class Report
    {
        [JsonPropertyName("type")] public string? Type { get; set; }
        [JsonPropertyName("campaign_id")] public long? CampaignId { get; set; }
        [JsonPropertyName("campaign_custom_id")] public string? CampaignCustomId { get; set; }
        /// <summary>Raporlarda metin ("13582302"), bazı yanıtlarda sayı olarak gelebilir; ikisi de kabul edilir</summary>
        [JsonPropertyName("message_id")] public System.Text.Json.JsonElement MessageIdRaw { get; set; }

        [JsonIgnore]
        public string? MessageId => MessageIdRaw.ValueKind switch
        {
            System.Text.Json.JsonValueKind.String => MessageIdRaw.GetString(),
            System.Text.Json.JsonValueKind.Number => MessageIdRaw.GetRawText(),
            _ => null
        };
        [JsonPropertyName("message_custom_id")] public string? MessageCustomId { get; set; }
        [JsonPropertyName("dest")] public string? Dest { get; set; }
        [JsonPropertyName("credits")] public int? Credits { get; set; }
        [JsonPropertyName("status")] public string? Status { get; set; }
        [JsonPropertyName("gsm_error")] public string? GsmError { get; set; }
        [JsonPropertyName("sent_at")] public string? SentAt { get; set; }
        [JsonPropertyName("done_at")] public string? DoneAt { get; set; }
    }

    public async Task<SendResult> SendAsync(string customId, IReadOnlyList<OutgoingMessage> messages, CancellationToken ct)
    {
        var body = new SendBody(O.Username, O.Password, string.IsNullOrWhiteSpace(O.SourceAddr) ? null : O.SourceAddr,
            O.ValidFor, customId, messages.Select(m => new SendItem(m.Msg, m.Dest, m.Id)).ToList());

        try
        {
            using var response = await http.PostAsJsonAsync($"{O.BaseUrl.TrimEnd('/')}/send.json", body, Json, ct);
            var text = (await response.Content.ReadAsStringAsync(ct)).Trim();

            if (response.IsSuccessStatusCode) return new SendResult(SendOutcome.Accepted, Cut(text, 40), null);

            var code = (int)response.StatusCode;
            // 4xx: istek reddedildi, hiçbir SMS gönderilmedi (kredi düşmez). 429: dakikalık istek sınırı.
            if (code is >= 400 and < 500)
            {
                logger.LogWarning("Verimor gönderimi reddetti: {Status} {Error}", code, Cut(text, 200));
                return new SendResult(SendOutcome.Rejected, null, Cut($"{code} {text}", 300));
            }

            // 5xx: sağlayıcı tarafında hata — gönderilip gönderilmediği belirsiz
            logger.LogError("Verimor sunucu hatası: {Status}", code);
            return new SendResult(SendOutcome.Unknown, null, $"Sağlayıcı hatası ({code}).");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            // Zaman aşımı / bağlantı koptu: istek ulaşmış ve SMS gitmiş OLABİLİR → tekrar denenmez
            logger.LogError("Verimor bağlantı hatası: {Type}", ex.GetType().Name);
            return new SendResult(SendOutcome.Unknown, null, "Sağlayıcıya bağlanılamadı ya da yanıt zaman aşımına uğradı.");
        }
    }

    /// <summary>Kalan kredi (bağlantı/kimlik sorunu varsa null)</summary>
    public async Task<decimal?> BalanceAsync(CancellationToken ct)
    {
        try
        {
            using var response = await http.GetAsync($"{O.BaseUrl.TrimEnd('/')}/balance?{Credentials()}", ct);
            var text = (await response.Content.ReadAsStringAsync(ct)).Trim();
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Verimor kredi sorgusu başarısız: {Status}", (int)response.StatusCode);
                return null;
            }
            return decimal.TryParse(text, System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var value) ? value : null;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            logger.LogWarning("Verimor kredi sorgusu bağlantı hatası: {Type}", ex.GetType().Name);
            return null;
        }
    }

    /// <summary>Kampanyanın teslim raporu (custom_id ile; 100'erli sayfalar). Hata varsa null.</summary>
    public async Task<List<Report>?> StatusAsync(string customId, CancellationToken ct)
    {
        var all = new List<Report>();
        string? after = null;
        try
        {
            for (var page = 0; page < 20; page++) // en fazla 2000 mesaj (MaxRecipientsPerSend zaten daha küçük)
            {
                var url = $"{O.BaseUrl.TrimEnd('/')}/status?custom_id={Uri.EscapeDataString(customId)}&{Credentials()}" +
                          (after is null ? "" : $"&greater_than={Uri.EscapeDataString(after)}");
                using var response = await http.GetAsync(url, ct);
                if (response.StatusCode == HttpStatusCode.NotFound) return all;
                if (!response.IsSuccessStatusCode)
                {
                    logger.LogWarning("Verimor rapor sorgusu başarısız: {Status}", (int)response.StatusCode);
                    return null;
                }

                var rows = await response.Content.ReadFromJsonAsync<List<Report>>(ct) ?? [];
                all.AddRange(rows);
                if (rows.Count < 100) break;
                after = rows[^1].MessageId;
            }
            return all;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException && !ct.IsCancellationRequested)
        {
            logger.LogWarning("Verimor rapor sorgusu hatası: {Type}", ex.GetType().Name);
            return null;
        }
    }

    private string Credentials() => $"username={Uri.EscapeDataString(O.Username)}&password={Uri.EscapeDataString(O.Password)}";

    private static string Cut(string value, int max) => value.Length > max ? value[..max] : value;
}
