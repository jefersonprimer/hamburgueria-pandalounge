import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não está configurada.");

async function init() {
  console.log("Conectando ao banco Supabase PostgreSQL...");
  const client = new Client({
    connectionString,
    ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  console.log("Conectado com sucesso!");

  console.log("Criando tabelas...");

  // Extensão pgcrypto para UUID caso não exista
  await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);

  // Tabela de Usuários
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'customer',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Tabela de Produtos
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      price NUMERIC(10, 2) NOT NULL,
      original_price NUMERIC(10, 2),
      installment_price NUMERIC(10, 2),
      installments INTEGER DEFAULT 3,
      image_url TEXT,
      images TEXT[] DEFAULT '{}',
      category VARCHAR(100),
      department VARCHAR(100),
      subcategory VARCHAR(100),
      brand VARCHAR(100),
      options JSONB DEFAULT '[]'::jsonb,
      specifications JSONB DEFAULT '{}'::jsonb,
      stock INTEGER DEFAULT 100,
      is_featured BOOLEAN DEFAULT false,
      is_new BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await client.query(`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);`);
  await client.query(`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS department VARCHAR(100);`);
  await client.query(`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);`);
  await client.query(`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;`);
  await client.query(`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';`);
  await client.query(`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;`);
  await client.query(`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '[]'::jsonb;`);
  await client.query(`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;`);
  await client.query(`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS installment_price NUMERIC(10, 2);`);
  await client.query(`ALTER TABLE public.products ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 3;`);

  await client.query(`
    UPDATE public.products
    SET images = ARRAY[image_url]
    WHERE (images IS NULL OR array_length(images, 1) IS NULL)
      AND image_url IS NOT NULL
      AND image_url <> '';
  `);

  // Acelera a busca parcial (ILIKE '%termo%') usada no autocomplete.
  await client.query(`
    CREATE INDEX IF NOT EXISTS products_name_trgm_idx
      ON public.products USING GIN (name gin_trgm_ops);
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS products_description_trgm_idx
      ON public.products USING GIN (description gin_trgm_ops);
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS products_brand_trgm_idx
      ON public.products USING GIN (brand gin_trgm_ops);
  `);

  // Tabela de Sessões
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Tabela de Cupons
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage'
        CHECK (discount_type IN ('percentage', 'fixed')),
      free_shipping BOOLEAN NOT NULL DEFAULT FALSE,
      discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_value > 0 OR free_shipping = TRUE),
      min_purchase NUMERIC(10, 2) NOT NULL DEFAULT 0,
      max_discount NUMERIC(10, 2),
      usage_limit INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS coupons_code_idx ON public.coupons (UPPER(code));
  `);

  // Tabela de Promoções
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.promotions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(120) NOT NULL,
      description TEXT,
      promotion_type VARCHAR(20) NOT NULL DEFAULT 'discount'
        CHECK (promotion_type IN ('discount', 'free_shipping')),
      min_purchase NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (min_purchase >= 0),
      scope_type VARCHAR(20) NOT NULL DEFAULT 'store'
        CHECK (scope_type IN ('store', 'department', 'category', 'brand', 'product')),
      discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage'
        CHECK (discount_type IN ('percentage', 'fixed', 'fixed_price')),
      discount_value NUMERIC(10, 2) NOT NULL
        CHECK ((promotion_type = 'discount' AND discount_value > 0) OR
               (promotion_type = 'free_shipping' AND discount_value = 0)),
      min_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_quantity >= 1),
      max_discount NUMERIC(10, 2),
      badge_label VARCHAR(40),
      priority INTEGER NOT NULL DEFAULT 0,
      stackable BOOLEAN NOT NULL DEFAULT FALSE,
      combinable_with_coupon BOOLEAN NOT NULL DEFAULT TRUE,
      starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Alvos das promoções (departamento, categoria, marca ou produto)
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.promotion_targets (
      promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
      target_type VARCHAR(20) NOT NULL
        CHECK (target_type IN ('department', 'category', 'brand', 'product')),
      target_value TEXT NOT NULL,
      PRIMARY KEY (promotion_id, target_type, target_value)
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS promotions_active_idx
      ON public.promotions (active, starts_at, expires_at);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS promotion_targets_lookup_idx
      ON public.promotion_targets (target_type, target_value);
  `);

  // Tabela de Pedidos
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.users(id),
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
      payment_id VARCHAR(100),
      payment_preference_id VARCHAR(100),
      payment_order_id VARCHAR(100),
      payment_url TEXT,
      items JSONB NOT NULL,
      address JSONB NOT NULL,
      scheduled_for TIMESTAMPTZ NOT NULL,
      subtotal NUMERIC(10,2) NOT NULL,
      total NUMERIC(10,2) NOT NULL,
      history JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS orders_user_created_idx ON public.orders(user_id, created_at DESC);`);
  await client.query(`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'pending';`);
  await client.query(`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100);`);
  await client.query(`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_preference_id VARCHAR(100);`);
  await client.query(`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_order_id VARCHAR(100);`);
  await client.query(`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_url TEXT;`);

  // Tabela de Configurações da Loja
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.store_settings (
      key VARCHAR(80) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Tabela de Recuperação de Senha
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.password_reset_codes (
      email VARCHAR(255) PRIMARY KEY,
      code_hash VARCHAR(64) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      verified_token_hash VARCHAR(64),
      verified_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Tabela de Lista de Desejos / Itens Salvos
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.user_list_items (
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, product_id)
    );
  `);

  // Tabela de SAC / Mensagens
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.sac_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(20) NOT NULL CHECK (type IN ('Sugestão', 'Reclamação')),
      full_name VARCHAR(200) NOT NULL,
      email VARCHAR(254) NOT NULL,
      phone VARCHAR(40),
      order_number VARCHAR(100),
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS sac_messages_created_idx
      ON public.sac_messages (created_at DESC);
  `);

  // Tabela de Candidaturas / Trabalhe Conosco
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.job_applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name VARCHAR(200) NOT NULL,
      photo_url TEXT,
      birth_date DATE NOT NULL,
      current_address VARCHAR(500) NOT NULL,
      email VARCHAR(254) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      marital_status VARCHAR(30) NOT NULL
        CHECK (marital_status IN ('Casado(a)', 'Solteiro(a)', 'União estável')),
      has_children BOOLEAN NOT NULL,
      children_count INTEGER,
      previous_jobs TEXT NOT NULL,
      previous_dislikes TEXT NOT NULL,
      education VARCHAR(50) NOT NULL,
      teamwork_response TEXT NOT NULL,
      skills TEXT NOT NULL,
      interested_positions TEXT[] NOT NULL,
      other_position VARCHAR(120),
      work_shifts TEXT[] NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (
        (has_children = TRUE AND children_count IS NOT NULL AND children_count BETWEEN 1 AND 30) OR
        (has_children = FALSE AND children_count IS NULL)
      )
    );
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS job_applications_created_idx
      ON public.job_applications (created_at DESC);
  `);

  console.log("Tabelas criadas com sucesso no Supabase!");
  await client.end();
}

init().catch((err) => {
  console.error("Erro ao inicializar o banco de dados:", err);
  process.exit(1);
});
