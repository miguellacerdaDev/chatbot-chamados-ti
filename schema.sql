create table public.chamados (
  id bigint generated always as identity primary key,
  atendimento_id text not null,
  nome_completo text not null,
  matricula_id text not null,
  email text not null,
  descricao_problema text not null,
  prioridade_interna text not null,
  status text not null default 'PENDENTE',
  criado_em timestamptz not null default now(),
  constraint chamados_atendimento_id_unique unique (atendimento_id),
  constraint chamados_atendimento_id_preenchido check (btrim(atendimento_id) <> ''),
  constraint chamados_nome_preenchido check (btrim(nome_completo) <> ''),
  constraint chamados_matricula_preenchida check (btrim(matricula_id) <> ''),
  constraint chamados_email_formato check (email = btrim(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
  constraint chamados_descricao_preenchida check (btrim(descricao_problema) <> ''),
  constraint chamados_prioridade_valida check (prioridade_interna in ('CRÍTICA', 'ALTA', 'MÉDIA', 'BAIXA')),
  constraint chamados_status_valido check (status in ('PENDENTE', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO'))
);
comment on table public.chamados is 'Chamados de TI confirmados pelo solicitante; gravados pela integração do n8n.';
comment on column public.chamados.id is 'Protocolo numérico gerado pelo banco.';
comment on column public.chamados.atendimento_id is 'Chave estável do atendimento, gerada pelo fluxo e reutilizada nas tentativas de gravação. Não usar somente o contato.';
comment on column public.chamados.matricula_id is 'Texto para preservar zeros iniciais e identificadores alfanuméricos.';
comment on column public.chamados.prioridade_interna is 'Uso interno do suporte; não incluir nas respostas ao solicitante.';
create index chamados_status_criado_em_idx on public.chamados (status, criado_em desc);
alter table public.chamados enable row level security;
revoke all privileges on table public.chamados from public, anon, authenticated, service_role;
grant select, insert, update on table public.chamados to service_role;
revoke all privileges on sequence public.chamados_id_seq from public, anon, authenticated, service_role;
grant usage, select on sequence public.chamados_id_seq to service_role;
