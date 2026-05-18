-- =============================================
-- Seed de dados de teste — learn·studio
-- Executa no SQL Editor do Supabase
-- ATENÇÃO: substitua o UUID abaixo pelo ID
-- real do seu usuário de teste (professor).
-- =============================================

-- Passo 1: Eleva o usuário de teste a professor
-- Substitua 'SEU-USER-ID-AQUI' pelo UUID do seu usuário
-- (Supabase > Authentication > Users > copie o ID)
-- UPDATE public.profiles
--   SET role = 'professor'
-- WHERE id = 'SEU-USER-ID-AQUI';

-- =============================================
-- Insere cursos de teste
-- (creator_id = usuário professor)
-- =============================================

-- Primeiro descobrimos o ID do primeiro professor cadastrado
DO $$
DECLARE
  v_creator uuid;
  v_course1 uuid;
  v_course2 uuid;
  v_course3 uuid;
  v_mod1    uuid;
  v_mod2    uuid;
  v_mod3    uuid;
  v_mod4    uuid;
  v_mod5    uuid;
BEGIN

  -- Pega o primeiro usuário com role professor (ou qualquer usuário se não tiver)
  SELECT id INTO v_creator
  FROM public.profiles
  WHERE role IN ('professor', 'coordenador', 'admin')
  LIMIT 1;

  IF v_creator IS NULL THEN
    SELECT id INTO v_creator FROM public.profiles LIMIT 1;
  END IF;

  IF v_creator IS NULL THEN
    RAISE NOTICE 'Nenhum usuário encontrado. Crie um usuário primeiro.';
    RETURN;
  END IF;

  RAISE NOTICE 'Usando creator_id: %', v_creator;

  -- ============================================
  -- CURSO 1 — Vídeo (linear)
  -- ============================================
  INSERT INTO public.courses (id, title, description, creator_id, status, accent_color, trail_type, estimated_hours)
  VALUES (
    gen_random_uuid(),
    'Introdução ao JavaScript Moderno',
    'Aprenda os fundamentos do JavaScript ES6+ com exemplos práticos e projetos reais. Ideal para quem está começando ou quer atualizar seus conhecimentos.',
    v_creator,
    'published',
    '#4ADE80',
    'linear',
    4.5
  ) RETURNING id INTO v_course1;

  -- Módulo 1 do Curso 1
  INSERT INTO public.modules (id, course_id, title, description, "order")
  VALUES (gen_random_uuid(), v_course1, 'Fundamentos', 'Variáveis, tipos e operadores', 1)
  RETURNING id INTO v_mod1;

  INSERT INTO public.lessons (module_id, title, description, "order", content_type, content_url, duration_seconds, is_free_preview, allow_download)
  VALUES
    (v_mod1, 'Apresentação do curso',       'Conheça o que você vai aprender neste curso.', 1, 'video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 596,  true,  false),
    (v_mod1, 'Variáveis: var, let e const', 'Entenda as diferenças e quando usar cada uma.', 2, 'video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',  653,  false, false),
    (v_mod1, 'Tipos de dados',              'String, Number, Boolean, null e undefined.',   3, 'video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 120,  false, false);

  -- Módulo 2 do Curso 1
  INSERT INTO public.modules (id, course_id, title, description, "order")
  VALUES (gen_random_uuid(), v_course1, 'Funções e Escopo', 'Arrow functions, closures e hoisting', 2)
  RETURNING id INTO v_mod2;

  INSERT INTO public.lessons (module_id, title, description, "order", content_type, content_url, duration_seconds, is_free_preview, allow_download)
  VALUES
    (v_mod2, 'Arrow functions',    'Sintaxe moderna e diferenças do function tradicional.', 1, 'video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 120, false, false),
    (v_mod2, 'Closures na prática','Como as closures funcionam e onde são úteis.',          2, 'video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',     120, false, false);

  -- ============================================
  -- CURSO 2 — Áudio (nonlinear)
  -- ============================================
  INSERT INTO public.courses (id, title, description, creator_id, status, accent_color, trail_type, estimated_hours)
  VALUES (
    gen_random_uuid(),
    'Podcast: Carreira em Tech',
    'Episódios em áudio sobre mercado de tecnologia, soft skills e dicas de carreira para desenvolvedores.',
    v_creator,
    'published',
    '#7EB8F7',
    'nonlinear',
    2.0
  ) RETURNING id INTO v_course2;

  INSERT INTO public.modules (id, course_id, title, description, "order")
  VALUES (gen_random_uuid(), v_course2, 'Episódios', 'Todos os episódios da temporada 1', 1)
  RETURNING id INTO v_mod3;

  INSERT INTO public.lessons (module_id, title, description, "order", content_type, content_url, duration_seconds, is_free_preview, allow_download)
  VALUES
    (v_mod3, 'Ep. 01 — Como entrar no mercado de tech', 'Dicas práticas para quem está começando a carreira.', 1, 'audio', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 372, true,  true),
    (v_mod3, 'Ep. 02 — Remote work: prós e contras',    'Como trabalhar de forma remota com produtividade.',   2, 'audio', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 340, false, true),
    (v_mod3, 'Ep. 03 — Portfólio que impressiona',      'O que recrutadores realmente procuram no portfólio.', 3, 'audio', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 410, false, true);

  -- ============================================
  -- CURSO 3 — PDF (linear)
  -- ============================================
  INSERT INTO public.courses (id, title, description, creator_id, status, accent_color, trail_type, estimated_hours)
  VALUES (
    gen_random_uuid(),
    'Guia de Design de APIs REST',
    'Material de referência completo sobre boas práticas, autenticação, versionamento e documentação de APIs RESTful.',
    v_creator,
    'published',
    '#FBBF24',
    'linear',
    3.0
  ) RETURNING id INTO v_course3;

  INSERT INTO public.modules (id, course_id, title, description, "order")
  VALUES (gen_random_uuid(), v_course3, 'Material de Leitura', 'PDFs do curso', 1)
  RETURNING id INTO v_mod4;

  INSERT INTO public.lessons (module_id, title, description, "order", content_type, content_url, duration_seconds, is_free_preview, allow_download)
  VALUES
    (v_mod4, 'Capítulo 1 — Princípios REST',     'Os 6 princípios arquiteturais do REST.', 1, 'pdf', 'https://www.w3.org/WAI/WCAG21/wcag-2.1.pdf', null, true,  true),
    (v_mod4, 'Capítulo 2 — Autenticação e Auth',  'JWT, OAuth2 e API Keys.',               2, 'pdf', 'https://www.w3.org/WAI/WCAG21/wcag-2.1.pdf', null, false, true);

  -- Módulo extra com misto (para testar nonlinear)
  INSERT INTO public.modules (id, course_id, title, description, "order")
  VALUES (gen_random_uuid(), v_course3, 'Vídeos Complementares', 'Reforço em vídeo', 2)
  RETURNING id INTO v_mod5;

  INSERT INTO public.lessons (module_id, title, description, "order", content_type, content_url, duration_seconds, is_free_preview, allow_download)
  VALUES
    (v_mod5, 'Revisão em vídeo — REST na prática', 'Demonstração de uma API REST completa.', 1, 'video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', 390, false, false);

  RAISE NOTICE 'Seed concluído com sucesso!';
  RAISE NOTICE 'Curso 1 (vídeo): %',  v_course1;
  RAISE NOTICE 'Curso 2 (áudio): %',  v_course2;
  RAISE NOTICE 'Curso 3 (PDF):   %',  v_course3;
END;
$$;
