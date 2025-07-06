
const pid=Deno.pid.toString();

//Deno.env.set("slop",pid);

Deno.serve((request) => {
    const r=JSON.stringify(request);
    return new Response("Slop Fountain:"+r);
});

/*

Deno.serve({
  port: 443,
  cert: Deno.readTextFileSync("./cert.pem"),
  key: Deno.readTextFileSync("./key.pem"),
}, handler);


return new Response(body.pipeThrough(new TextEncoderStream()), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
*/