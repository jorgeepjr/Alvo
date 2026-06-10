-- ========== PROFILES ==========
CREATE TABLE profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       text        NOT NULL,
  perfil     text        NOT NULL DEFAULT 'vendedor' CHECK (perfil IN ('gestor', 'vendedor')),
  ativo      boolean     NOT NULL DEFAULT true,
  criado_em  timestamp   NOT NULL DEFAULT now()
);

-- ========== METAS MENSAIS ==========
CREATE TABLE metas_mensais (
  id                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ano                integer NOT NULL,
  mes                integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  meta_valor         numeric NOT NULL DEFAULT 0,
  meta_atendimentos  integer NOT NULL DEFAULT 0,
  meta_pecas         integer NOT NULL DEFAULT 0,
  criado_em          timestamp NOT NULL DEFAULT now(),
  UNIQUE (ano, mes)
);

-- ========== DISTRIBUICAO DIARIA ==========
CREATE TABLE distribuicao_diaria (
  id                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id        uuid    REFERENCES profiles(id) ON DELETE CASCADE,
  data               date    NOT NULL,
  cota_valor         numeric NOT NULL DEFAULT 0,
  cota_atendimentos  integer NOT NULL DEFAULT 0,
  cota_pecas         integer NOT NULL DEFAULT 0,
  situacao           text    NOT NULL DEFAULT 'normal' CHECK (situacao IN ('normal', 'feriado', 'fechado')),
  UNIQUE (vendedor_id, data)
);

-- ========== LANCAMENTOS ==========
CREATE TABLE lancamentos (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id         uuid    REFERENCES profiles(id) ON DELETE CASCADE,
  data                date    NOT NULL,
  atendimentos        integer NOT NULL DEFAULT 0,
  pecas               integer NOT NULL DEFAULT 0,
  valor               numeric NOT NULL DEFAULT 0,
  observacao          text,
  situacao_vendedor   text    NOT NULL DEFAULT 'normal' CHECK (situacao_vendedor IN ('normal', 'atestado', 'nao_trabalhou')),
  dia_fechado         boolean NOT NULL DEFAULT false,
  criado_por          uuid    NOT NULL REFERENCES profiles(id),
  criado_em           timestamp NOT NULL DEFAULT now()
);
CREATE INDEX idx_lancamentos_data ON lancamentos(data);
CREATE INDEX idx_lancamentos_vendedor ON lancamentos(vendedor_id);

-- ========== HISTORICO LOJA ==========
CREATE TABLE historico_loja (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ano           integer NOT NULL,
  mes           integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  venda_total   numeric NOT NULL DEFAULT 0,
  cota_total    numeric NOT NULL DEFAULT 0,
  atendimentos  integer NOT NULL DEFAULT 0,
  pecas         integer NOT NULL DEFAULT 0,
  origem        text    NOT NULL DEFAULT 'sistema' CHECK (origem IN ('importado', 'sistema')),
  UNIQUE (ano, mes)
);

-- ========== RLS ==========
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_mensais       ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribuicao_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_loja      ENABLE ROW LEVEL SECURITY;

-- Helper: função para checar se usuário é gestor (evita recursão de policy)
CREATE OR REPLACE FUNCTION is_gestor()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND perfil = 'gestor'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles: usuário vê o próprio perfil; gestor vê todos
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_gestor());
CREATE POLICY "profiles_gestor_all" ON profiles
  FOR ALL USING (is_gestor());

-- metas_mensais: leitura para todos autenticados, escrita só gestor
CREATE POLICY "metas_select" ON metas_mensais
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "metas_gestor_write" ON metas_mensais
  FOR INSERT WITH CHECK (is_gestor());
CREATE POLICY "metas_gestor_update" ON metas_mensais
  FOR UPDATE USING (is_gestor());
CREATE POLICY "metas_gestor_delete" ON metas_mensais
  FOR DELETE USING (is_gestor());

-- distribuicao_diaria: vendedor vê só a própria; gestor tudo
CREATE POLICY "distribuicao_select" ON distribuicao_diaria
  FOR SELECT USING (vendedor_id = auth.uid() OR is_gestor());
CREATE POLICY "distribuicao_gestor_write" ON distribuicao_diaria
  FOR INSERT WITH CHECK (is_gestor());
CREATE POLICY "distribuicao_gestor_update" ON distribuicao_diaria
  FOR UPDATE USING (is_gestor());
CREATE POLICY "distribuicao_gestor_delete" ON distribuicao_diaria
  FOR DELETE USING (is_gestor());

-- lancamentos: vendedor vê/insere os próprios (se dia não fechado); gestor tudo
CREATE POLICY "lancamentos_select" ON lancamentos
  FOR SELECT USING (vendedor_id = auth.uid() OR is_gestor());
CREATE POLICY "lancamentos_insert" ON lancamentos
  FOR INSERT WITH CHECK (
    is_gestor() OR (vendedor_id = auth.uid() AND criado_por = auth.uid())
  );
CREATE POLICY "lancamentos_update" ON lancamentos
  FOR UPDATE USING (
    is_gestor() OR (vendedor_id = auth.uid() AND dia_fechado = false)
  );
CREATE POLICY "lancamentos_delete" ON lancamentos
  FOR DELETE USING (is_gestor());

-- historico_loja: leitura para todos autenticados, escrita só gestor
CREATE POLICY "historico_select" ON historico_loja
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "historico_gestor_write" ON historico_loja
  FOR INSERT WITH CHECK (is_gestor());
CREATE POLICY "historico_gestor_update" ON historico_loja
  FOR UPDATE USING (is_gestor());
CREATE POLICY "historico_gestor_delete" ON historico_loja
  FOR DELETE USING (is_gestor());

-- Trigger: criar profile automaticamente ao cadastrar usuário (default vendedor)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nome, perfil)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), 'vendedor');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
