using System.Reflection;

namespace MazlumApart.Shared;

public static class FeatureExtensions
{
    public static IServiceCollection AddFeatures(this IServiceCollection services, Assembly assembly)
    {
        var types = assembly.GetTypes()
            .Where(t => t is { IsAbstract: false, IsInterface: false })
            .ToList();

        // IEndpoint implementasyonları
        foreach (var type in types.Where(t => t.IsAssignableTo(typeof(IEndpoint))))
            services.AddTransient(typeof(IEndpoint), type);

        // Features altındaki *Handler sınıfları (komut/sorgu işleyicileri)
        foreach (var type in types.Where(t =>
                     t.Name.EndsWith("Handler") &&
                     t.Namespace is not null &&
                     t.Namespace.StartsWith("MazlumApart.Features")))
            services.AddScoped(type);

        return services;
    }

    public static WebApplication MapFeatures(this WebApplication app)
    {
        foreach (var endpoint in app.Services.GetServices<IEndpoint>())
            endpoint.MapEndpoint(app);

        return app;
    }
}
