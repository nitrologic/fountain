
const files=["slop.js","slop.css","slop.html"];

function refreshFiles(){
}

Deno.serve((request:Request) => {
  const url:string=request.url;
  return new Response("Hello, World!"+url);
});
