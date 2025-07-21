// slopresponse.ts - skeleton code for serving slop
// an http server that clean exits when signalled
// no rights reserved

const slopServer = await Deno.serve((request) => {
	const r=JSON.stringify(request);
	console.log("[SLOP] serving request");
	return new Response("{SLOP} skeleteton stringify:"+r);
});

Deno.addSignalListener("SIGINT", async() => {
	console.log("Terminal SIGINT");
	await slopServer.shutdown();
	console.log("[SLOP] slopServer shutdown");
	Deno.exit(1);
});

console.log("[SLOP] skeleton code by simon");
