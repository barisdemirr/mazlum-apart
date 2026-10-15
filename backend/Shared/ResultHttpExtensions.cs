namespace MazlumApart.Shared;

/// <summary>Result -> HTTP yanıtı. Hatalar application/problem+json olarak döner (frontend lib/api/error.js bunu okur).</summary>
public static class ResultHttpExtensions
{
    public static IResult ToHttp<T>(this Result<T> result, Func<T, IResult> onSuccess) =>
        result.IsSuccess ? onSuccess(result.Value!) : result.Error!.ToProblem();

    public static IResult ToHttp(this Result result, Func<IResult> onSuccess) =>
        result.IsSuccess ? onSuccess() : result.Error!.ToProblem();

    /// <summary>Başarıda 200 + gövde</summary>
    public static IResult ToOk<T>(this Result<T> result) => result.ToHttp(value => Results.Ok(value));

    /// <summary>Başarıda 204</summary>
    public static IResult ToNoContent(this Result result) => result.ToHttp(() => Results.NoContent());

    public static IResult ToProblem(this Error error) => error.Type switch
    {
        ErrorType.Validation => Results.ValidationProblem(error.Details ?? new(), title: error.Message),
        ErrorType.NotFound => Results.Problem(error.Message, statusCode: 404, title: "Bulunamadı"),
        ErrorType.Conflict => Results.Problem(error.Message, statusCode: 409, title: "Çakışma"),
        ErrorType.Unauthorized => Results.Problem(error.Message, statusCode: 401, title: "Yetkisiz"),
        ErrorType.Forbidden => Results.Problem(error.Message, statusCode: 403, title: "Erişim engellendi"),
        ErrorType.TooManyRequests => Results.Problem(error.Message, statusCode: 429, title: "Çok fazla istek"),
        _ => Results.Problem(error.Message, statusCode: 500, title: "Beklenmeyen hata")
    };
}
