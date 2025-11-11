using Berry.Host;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Berry Sample API", Version = "v1" });
});

builder.Services.AddControllers();

// Berry 框架模块装配
builder.Services.AddBerry(builder.Configuration);

builder.Services.AddHealthChecks();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{

}

app.UseSwagger();
app.UseSwaggerUI();

app.UseSerilogRequestLogging();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

// Berry 框架中间件装配
app.UseBerry();

app.MapControllers();

app.MapGet("/", () => Results.Ok(new { ok = true, name = "Berry Sample", version = "0.1.0" }));
app.MapHealthChecks("/health");

app.Run();
