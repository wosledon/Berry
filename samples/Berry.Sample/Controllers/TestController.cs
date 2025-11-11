using System;
using Berry.Host.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace Berry.Sample.Controllers;

public class TestController: ApiControllerBase
{
    [HttpGet("api/test/hello")]
    public ActionResult<string> Hello()
    {
        return "Hello, Berry!";
    }
}
