const path=require('path'),fs=require('fs'),os=require('os'),assert=require('node:assert/strict');
const b=path.resolve(__dirname,'..');
const request=require(path.join(b,'node_modules/supertest'));
const {Container}=require(path.join(b,'dist/application/Container.js'));
const {criarApp}=require(path.join(b,'dist/infrastructure/http/App.js'));
const {ConfiguracaoSistema}=require(path.join(b,'dist/patterns/singleton/ConfiguracaoSistema.js'));
async function main(){
 process.env.NODE_ENV='test';process.env.BCRYPT_COST='4';process.env.JWT_SECRET='segredo-de-teste-mais-de-32-caracteres-com-muita-entropia';process.env.LIMITE_LOGIN_POR_MINUTO='1000';ConfiguracaoSistema.reiniciar();
 const app=criarApp(new Container());
 const t=async(email)=>{const r=await request(app).post('/api/auth/login').send({identificador:email,senha:'siglosus123'}); assert.equal(r.status,200,JSON.stringify(r.body));return r.body.token;};
 const gestor=await t('gestor@siglosus.gov.br');const motorista=await t('motorista@siglosus.gov.br');
 const key='teste-manual-idem-001';const body={nome:'UBS Nova',tipo:'UBS',cnes:'1234555',endereco:{logradouro:'Rua Teste',numero:'1',cidade:'Itacoatiara',uf:'AM',cep:'69100000'}};
 const req=()=>request(app).post('/api/unidades').set('Authorization','Bearer '+gestor).set('Idempotency-Key',key);
 const first=await req().send(body);assert.equal(first.status,201,JSON.stringify(first.body));
 const second=await req().send(body);assert.equal(second.status,201);assert.deepEqual(second.body,first.body);
 const conflict=await req().send({...body,nome:'Outro'});assert.equal(conflict.status,409);
 const unauth=await request(app).post('/api/unidades').set('Idempotency-Key',key).send(body);assert.equal(unauth.status,401);
 const forbidden=await request(app).post('/api/unidades').set('Authorization','Bearer '+motorista).set('Idempotency-Key',key).send(body);assert.equal(forbidden.status,403);
 const routeConflict=await request(app).post('/api/medicamentos').set('Authorization','Bearer '+gestor).set('Idempotency-Key',key).send({nome:'Outro'});assert.equal(routeConflict.status,409);
 const oldEnv=process.env.NODE_ENV;process.env.NODE_ENV='production';ConfiguracaoSistema.reiniciar();
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'siglosus-check-'));
 let rejects=0;
 for(const opts of [{arquivoPersistencia:path.join(tmp,'dados.json'),forcarSeed:true}])try{new Container(opts);}catch(e){if(/proibidos/.test(e.message))rejects++};
 process.env.SIGLOSUS_SEED_DEMO='true';try{new Container({arquivoPersistencia:path.join(tmp,'dados.json')})}catch(e){if(/proibidos/.test(e.message))rejects++}delete process.env.SIGLOSUS_SEED_DEMO;
 assert.equal(rejects,2); const noSeed=new Container({arquivoPersistencia:path.join(tmp,'dados.json')});assert.equal(noSeed.usuarios.listar().length,0);fs.rmSync(tmp,{recursive:true,force:true});process.env.NODE_ENV=oldEnv;ConfiguracaoSistema.reiniciar();
 console.log('APROVADOS: 10 verificações de regressão de autenticação, idempotência, autorização e seed.');
}
main().catch(e=>{console.error(e);process.exit(1)});
