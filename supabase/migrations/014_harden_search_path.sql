-- Endurece o search_path das funções SECURITY DEFINER.
--
-- Bug latente: uma função `security definer` sem `search_path` fixo resolve nomes
-- de objeto conforme o search_path de QUEM chama. Um usuário mal-intencionado pode
-- criar um schema/tabela homônima no seu próprio search_path e fazer a função (que
-- roda com privilégios do dono) operar sobre objetos forjados. O advisor do Supabase
-- sinaliza isso como "Function has a role mutable search_path".
--
-- Fixamos `search_path = public, pg_temp` — mantém referências não-qualificadas
-- resolvendo em `public` (como hoje) e elimina a superfície de ataque. `handle_new_user`
-- já foi criada com search_path fixo, então fica de fora.

alter function public.get_user_role()                                set search_path = public, pg_temp;
alter function public.add_xp(uuid, integer, text)                    set search_path = public, pg_temp;
alter function public.touch_streak(uuid)                             set search_path = public, pg_temp;
alter function public.get_course_analytics(uuid)                     set search_path = public, pg_temp;
alter function public.maybe_issue_certificate(uuid, uuid)            set search_path = public, pg_temp;
alter function public.verify_certificate(text)                       set search_path = public, pg_temp;
alter function public.get_user_courses_progress(uuid)                set search_path = public, pg_temp;
alter function public.get_coordinator_report()                       set search_path = public, pg_temp;
alter function public.check_and_award_badges(uuid)                   set search_path = public, pg_temp;
