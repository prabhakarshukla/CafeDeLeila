const {spawn}=require('node:child_process');
const fs=require('node:fs');
const python=process.env.CAFE_PYTHON || 'python';
const child=spawn(python,['-m','http.server','8099','--bind','127.0.0.1'],{windowsHide:true,stdio:'pipe'});
child.on('error',e=>{console.error(e.message);process.exitCode=1;});
(async()=>{try {
 await new Promise(r=>setTimeout(r,1000));
 const response=await fetch('http://127.0.0.1:8099/index.html');
 const body=await response.text();if(response.status!==200||!body.includes('Good food.'))throw new Error('Static server check failed');
 fs.writeFileSync('audit/server-results.json',JSON.stringify({status:'PASS',command:'python -m http.server',port:8099,httpStatus:response.status,python},null,2));
 console.log('PASS Python HTTP server: index.html returned 200');
}catch(e){console.error(e.message);process.exitCode=1;}finally{child.kill();}})();
