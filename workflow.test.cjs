const assert=require('node:assert/strict');
const fs=require('node:fs');
const workflow=JSON.parse(fs.readFileSync(__dirname+'/chatbot-chamados-ti.json','utf8'));
const prep=workflow.nodes.find(n=>n.name==='Preparar atendimento').parameters.jsCode;
const parse=workflow.nodes.find(n=>n.name==='Validar dados do atendimento').parameters.jsCode;
const finish=workflow.nodes.find(n=>n.name==='Preparar protocolo ou pendência').parameters.jsCode;
function run(code,input,context){const $=name=>({item:{json:context[name]}});return new Function('$json','$',code)(input,$)[0].json;}
const base={session:'teste-sintetico',chatId:'contato-ficticio',payload_id:'mensagem-001',message:'Meu computador não liga',event:'message',fromMe:false};
const data={nome_completo:'Pessoa de Teste',matricula_id:'00123',email:'teste@example.com',descricao_problema:'Computador não liga',prioridade_interna:'ALTA'};
let cases=0;
const turn=run(prep,{}, {Dados:base});assert.equal(turn.gravar,false);cases++;
const summary=run(parse,{output:JSON.stringify({resposta_cliente:'Resumo',dados:data})},{'Preparar atendimento':turn});
assert.equal(summary.estado_salvar.etapa,'aguardando_confirmacao');assert.equal(summary.estado_salvar.dados.matricula_id,'00123');assert(!summary.resposta_cliente.includes('prioridade'));assert(!summary.resposta_cliente.includes('ALTA'));cases++;
const token=summary.estado_salvar.codigo;
const confirmBase={...base,payload_id:'mensagem-002',message:'CONFIRMAR '+token};
const confirmed=run(prep,{estado_atendimento:JSON.stringify(summary.estado_salvar)},{Dados:confirmBase});
assert.equal(confirmed.gravar,true);assert.equal(confirmed.chamado.atendimento_id,turn.atendimento_id);cases++;
for(const message of ['sim','CONFIRMAR ERRADO','não','CONFIRMAR '+token+' mas mude meu e-mail']){
 assert.equal(run(prep,{estado_atendimento:JSON.stringify(summary.estado_salvar)},{Dados:{...confirmBase,message}}).gravar,false);cases++;
}
const expired={...summary.estado_salvar,expira_em:Date.now()-1};
assert.equal(run(prep,{estado_atendimento:JSON.stringify(expired)},{Dados:confirmBase}).gravar,false);cases++;
assert.equal(run(prep,{estado_atendimento:JSON.stringify(summary.estado_salvar)},{Dados:{...confirmBase,chatId:'outro-contato'}}).gravar,false);cases++;
for(const patch of [{email:'invalido'},{nome_completo:''},{matricula_id:''},{descricao_problema:''},{prioridade_interna:'URGENTE'}]){
 const invalid=run(parse,{output:JSON.stringify({resposta_cliente:'',dados:{...data,...patch}})},{'Preparar atendimento':turn});
 assert.equal(invalid.estado_salvar.etapa,'coletando');cases++;
}
const malformed=run(parse,{output:'texto sem JSON'},{'Preparar atendimento':turn});
assert.equal(malformed.estado_salvar.etapa,'coletando');assert(malformed.resposta_cliente.length>0);cases++;
const row={id:123,...confirmed.chamado};
const saved=run(finish,row,{'Preparar atendimento':confirmed});
assert.equal(saved.estado_salvar.etapa,'registrado');assert(saved.resposta_cliente.includes('123'));assert(!saved.resposta_cliente.includes('ALTA'));cases++;
const failed=run(finish,{}, {'Preparar atendimento':confirmed});
assert.equal(failed.estado_salvar.etapa,'aguardando_confirmacao');assert(!failed.resposta_cliente.includes('sucesso'));cases++;
const mismatch=run(finish,{...row,matricula_id:'outro'}, {'Preparar atendimento':confirmed});
assert(!mismatch.resposta_cliente.includes('sucesso'));cases++;
const retry=run(prep,{estado_atendimento:JSON.stringify(saved.estado_salvar)},{Dados:{...confirmBase,payload_id:'retry-002'}});
assert.equal(retry.atendimento_id,confirmed.atendimento_id);assert.deepEqual(retry.chamado,confirmed.chamado);cases++;
const newTurn=run(prep,{estado_atendimento:JSON.stringify(saved.estado_salvar)},{Dados:{...base,payload_id:'nova-mensagem',message:'Novo chamado'}});
assert.equal(newTurn.gravar,false);assert.deepEqual(newTurn.dados_atuais,{});cases++;
const names=new Set(workflow.nodes.map(n=>n.name));assert.equal(names.size,workflow.nodes.length);
for(const [from,types] of Object.entries(workflow.connections)){assert(names.has(from));for(const outs of Object.values(types)){for(const output of outs){for(const edge of output)assert(names.has(edge.node));}}}
assert.equal(workflow.active,false);cases++;
console.log(JSON.stringify({passed:cases,nodes:workflow.nodes.length,externalRequests:0,whatsappMessages:0}));
