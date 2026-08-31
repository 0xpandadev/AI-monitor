const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {addEntity,dashboard}=require('./lib/data.cjs');

const ROOT=__dirname;
const PUBLIC=path.join(ROOT,'public');
const HOST=process.env.AIOM_HOST||'127.0.0.1';
const PORT=Number(process.env.AIOM_PORT||4327);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};

function send(response,status,value,type='application/json; charset=utf-8'){
  const body=Buffer.isBuffer(value)?value:Buffer.from(typeof value==='string'?value:JSON.stringify(value));
  response.writeHead(status,{'Content-Type':type,'Content-Length':body.length,'Cache-Control':'no-store'});response.end(body);
}
async function jsonBody(request){const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;if(size>1_000_000)throw new Error('request too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}
function staticFile(response,url){
  const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  const target=path.resolve(PUBLIC,relative);const root=path.resolve(PUBLIC);
  if(target!==path.join(root,'index.html')&&!target.startsWith(`${root}${path.sep}`))return send(response,403,{error:'forbidden'});
  fs.readFile(target,(error,data)=>error?send(response,error.code==='ENOENT'?404:500,{error:'file_not_found'}):send(response,200,data,MIME[path.extname(target)]||'application/octet-stream'));
}

const server=http.createServer(async(request,response)=>{
  const url=new URL(request.url,`http://${request.headers.host||`${HOST}:${PORT}`}`);
  try{
    if(request.method==='GET'&&url.pathname==='/api/health')return send(response,200,{ok:true,product:'AI Opportunity Monitor',version:'0.2.0',ai_api_required:false});
    if(request.method==='GET'&&url.pathname==='/api/dashboard')return send(response,200,dashboard());
    if(request.method==='POST'&&url.pathname==='/api/watchlist'){
      const result=addEntity(await jsonBody(request));return result.ok?send(response,201,result):send(response,422,{error:'invalid_entity',details:result.errors});
    }
    if(url.pathname.startsWith('/api/'))return send(response,404,{error:'api_not_found'});
    return staticFile(response,url);
  }catch(error){return send(response,500,{error:'server_error',message:error.message});}
});

server.listen(PORT,HOST,()=>{
  console.log(`AI Opportunity Monitor: http://${HOST}:${PORT}`);
  console.log('AI execution: signed-in Codex or Claude Code; direct AI API calls: none');
});
