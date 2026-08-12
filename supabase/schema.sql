-- ============================================================
-- 个人书影管理平台 · 数据库 Schema
-- 版本: v1.0  日期: 2026-08-12
-- 数据库: Supabase (PostgreSQL)
-- ============================================================

-- ============================================================
-- 1. 枚举类型
-- ============================================================

-- 书籍状态：想读 / 在读 / 读完 / 放弃
CREATE TYPE book_status AS ENUM ('want', 'reading', 'done', 'dropped');

-- 影视状态：想看 / 在看 / 看完 / 放弃
CREATE TYPE movie_status AS ENUM ('want', 'watching', 'done', 'dropped');

-- ============================================================
-- 2. books 表
-- ============================================================

CREATE TABLE books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  author          TEXT,
  publisher       TEXT,
  pub_date        DATE,
  cover_url       TEXT,
  category        TEXT NOT NULL DEFAULT '未分类',
  tags            JSONB DEFAULT '[]'::jsonb,
  status          book_status NOT NULL DEFAULT 'want',
  rating          SMALLINT CHECK (rating >= 0 AND rating <= 10),
  douban_rating   REAL,
  comment         TEXT,
  notes           TEXT,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_books_status ON books (status);
CREATE INDEX idx_books_category ON books (category);
CREATE INDEX idx_books_created_at ON books (created_at DESC);
CREATE INDEX idx_books_finished_at ON books (finished_at DESC);
CREATE INDEX idx_books_title ON books USING gin (to_tsvector('simple', title));

-- ============================================================
-- 3. movies 表
-- ============================================================

CREATE TABLE movies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  director        TEXT,
  actors          TEXT,
  year            INTEGER,
  region          TEXT,
  duration        INTEGER,
  genre           TEXT NOT NULL DEFAULT '未分类',
  cover_url       TEXT,
  tags            JSONB DEFAULT '[]'::jsonb,
  status          movie_status NOT NULL DEFAULT 'want',
  rating          SMALLINT CHECK (rating >= 0 AND rating <= 10),
  douban_rating   REAL,
  comment         TEXT,
  notes           TEXT,
  watched_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_movies_status ON movies (status);
CREATE INDEX idx_movies_genre ON movies (genre);
CREATE INDEX idx_movies_created_at ON movies (created_at DESC);
CREATE INDEX idx_movies_watched_at ON movies (watched_at DESC);
CREATE INDEX idx_movies_title ON movies USING gin (to_tsvector('simple', title));

-- ============================================================
-- 4. yearly_goals 表
-- ============================================================

CREATE TABLE yearly_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year            INTEGER NOT NULL UNIQUE,
  books_goal      INTEGER NOT NULL DEFAULT 0,
  movies_goal     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 插入当前年度默认目标
INSERT INTO yearly_goals (year, books_goal, movies_goal)
VALUES (2026, 30, 20);

-- ============================================================
-- 5. settings 表（单行，存用户偏好）
-- ============================================================

CREATE TABLE settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_categories JSONB NOT NULL DEFAULT '["科幻","文学","历史","社科","经济","心理","效率"]'::jsonb,
  movie_categories JSONB NOT NULL DEFAULT '["电影","电视剧","纪录片","动画"]'::jsonb,
  default_view    TEXT NOT NULL DEFAULT 'card',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 插入默认设置
INSERT INTO settings (id)
VALUES (gen_random_uuid());

-- ============================================================
-- 6. 触发器：自动更新 updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_books_updated
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_movies_updated
  BEFORE UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_yearly_goals_updated
  BEFORE UPDATE ON yearly_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. 状态流转触发器：自动维护时间线
-- ============================================================

-- 书籍：进入 reading 记录 started_at，进入 done 记录 finished_at
CREATE OR REPLACE FUNCTION update_book_timeline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'reading' AND NEW.started_at IS NULL THEN
      NEW.started_at = now();
    END IF;
    IF NEW.status = 'done' AND NEW.finished_at IS NULL THEN
      NEW.finished_at = now();
    END IF;
    IF NEW.status = 'want' THEN
      NEW.started_at = NULL;
      NEW.finished_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_book_timeline
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_book_timeline();

-- 影视：进入 watching 记录 started_at（复用 watched_at 概念），
-- 进入 done 记录 watched_at
CREATE OR REPLACE FUNCTION update_movie_timeline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'done' AND NEW.watched_at IS NULL THEN
      NEW.watched_at = now();
    END IF;
    IF NEW.status = 'want' THEN
      NEW.watched_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_movie_timeline
  BEFORE UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION update_movie_timeline();

-- ============================================================
-- 8. RLS 策略（单用户无认证，全部开放）
-- ============================================================

ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE yearly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 单用户无登录，开放所有操作
CREATE POLICY "allow_all_books" ON books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_movies" ON movies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_goals" ON yearly_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_settings" ON settings FOR ALL USING (true) WITH CHECK (true);
