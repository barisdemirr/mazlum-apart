namespace MazlumApart.Shared;

public enum ErrorType { Validation, NotFound, Conflict, Unauthorized, Forbidden, TooManyRequests, Unexpected }

public record Error(ErrorType Type, string Message, Dictionary<string, string[]>? Details = null)
{
    public static Error Validation(Dictionary<string, string[]> details) =>
        new(ErrorType.Validation, "Doğrulama hatası.", details);

    /// <summary>Tek alanlı doğrulama hatası: Error.Field("amount", "Tutar sıfırdan büyük olmalı.")</summary>
    public static Error Field(string field, string message) =>
        Validation(new() { [field] = [message] });

    public static Error NotFound(string message) => new(ErrorType.NotFound, message);
    public static Error Conflict(string message) => new(ErrorType.Conflict, message);
    public static Error Unauthorized(string message) => new(ErrorType.Unauthorized, message);
    public static Error Forbidden(string message) => new(ErrorType.Forbidden, message);
    public static Error TooManyRequests(string message) => new(ErrorType.TooManyRequests, message);
    public static Error Unexpected(string message) => new(ErrorType.Unexpected, message);
}

public class Result
{
    public Error? Error { get; protected init; }
    public bool IsSuccess => Error is null;

    public static Result Success() => new();
    public static Result Fail(Error error) => new() { Error = error };

    public static implicit operator Result(Error error) => Fail(error);
}

public class Result<T> : Result
{
    public T? Value { get; private init; }

    public static Result<T> Success(T value) => new() { Value = value };
    public static new Result<T> Fail(Error error) => new() { Error = error };

    public static implicit operator Result<T>(Error error) => Fail(error);
    public static implicit operator Result<T>(T value) => Success(value);
}
