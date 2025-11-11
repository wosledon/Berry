using System.Security.Cryptography;
using System.Text;

namespace Berry.Shared.Security;

public static class PasswordHasher
{
    // 生成 PBKDF2 哈希，格式：pbkdf2;{iter};{saltBase64};{hashBase64}
    public static string Hash(string password, int iterations = 100_000)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, iterations, HashAlgorithmName.SHA256, 32);
        return $"pbkdf2;{iterations};{Convert.ToBase64String(salt)};{Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string hash)
    {
        try
        {
            var parts = hash.Split(';');
            if (parts.Length != 4 || parts[0] != "pbkdf2") return false;
            var iter = int.Parse(parts[1]);
            var salt = Convert.FromBase64String(parts[2]);
            var expected = Convert.FromBase64String(parts[3]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, iter, HashAlgorithmName.SHA256, expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch
        {
            return false;
        }
    }
}
