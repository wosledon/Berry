using System;
using System.Collections.Generic;
using System.Linq;

namespace Berry.Modules.Rag;

public interface IConversationMemory
{
    void Append(string userId, string role, string content);
    IReadOnlyList<(string role,string content)> GetHistory(string userId, int max = 10);
}

public sealed class InMemoryConversationMemory : IConversationMemory
{
    private readonly Dictionary<string, List<(string role,string content)>> _store = new();
    private readonly object _lock = new();
    public void Append(string userId, string role, string content)
    {
        lock (_lock)
        {
            if (!_store.TryGetValue(userId, out var list))
            {
                list = new();
                _store[userId] = list;
            }
            list.Add((role, content));
        }
    }

    public IReadOnlyList<(string role, string content)> GetHistory(string userId, int max = 10)
    {
        lock (_lock)
        {
            if (!_store.TryGetValue(userId, out var list)) return Array.Empty<(string,string)>();
            return list.TakeLast(Math.Min(max, list.Count)).ToList();
        }
    }
}
