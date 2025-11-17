using Berry.Shared.Caching;
using StackExchange.Redis;

namespace Berry.Modules.Caching;

internal sealed class RedisCacheProvider : ICacheProvider, IAsyncDisposable
{
    private readonly IConnectionMultiplexer _mux;
    private readonly IDatabase _db;

    public RedisCacheProvider(IConnectionMultiplexer mux)
    {
        _mux = mux;
        _db = _mux.GetDatabase();
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        var val = await _db.StringGetAsync(key).ConfigureAwait(false);
        if (!val.HasValue) return default;
        return System.Text.Json.JsonSerializer.Deserialize<T>(val.ToString());
    }

    public Task RemoveAsync(string key, CancellationToken ct = default)
        => _db.KeyDeleteAsync(key);

    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(value);
        return _db.StringSetAsync(key, json, ttl);
    }

    public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan ttl, CancellationToken ct = default)
    {
        var cached = await GetAsync<T>(key, ct).ConfigureAwait(false);
        if (cached is not null) return cached;
        var val = await factory().ConfigureAwait(false);
        await SetAsync(key, val, ttl, ct).ConfigureAwait(false);
        return val;
    }

    public ValueTask DisposeAsync() => _mux.DisposeAsync();
}
