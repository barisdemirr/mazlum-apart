using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace MazlumApart.Infrastructure;

/// <summary>
/// Veritabanı çakışmalarını 409'a çevirir (500 yerine anlaşılır mesaj):
///  - Eşzamanlılık: iki yönetici aynı öğrenci hesabına aynı anda yazdıysa ikincisi (LedgerVersion) → "yenileyip tekrar deneyin"
///  - Tekil indeks ihlali (2601/2627): aynı anda iki kez gönderilen form, aynı T.C./telefon vb.
/// Diğer hatalar varsayılan işleyiciye bırakılır (ayrıntı sızdırmadan 500).
/// </summary>
public class ConflictExceptionHandler(ILogger<ConflictExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        string? message = exception switch
        {
            DbUpdateConcurrencyException => "Bu kayıt siz işlem yaparken başka biri tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin.",
            DbUpdateException { InnerException: SqlException { Number: 2601 or 2627 } } => "Bu kayıt zaten var (aynı bilgilerle ikinci kez gönderilmiş olabilir).",
            _ => null
        };
        if (message is null) return false;

        logger.LogWarning(exception, "Çakışma: {Path}", context.Request.Path);
        await Results.Problem(message, statusCode: StatusCodes.Status409Conflict, title: "Çakışma").ExecuteAsync(context);
        return true;
    }
}
