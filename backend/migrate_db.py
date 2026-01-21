from sqlalchemy import text
from database import engine

def migrate():
    with engine.connect() as conn:
        print("Adding columns to teacher_batches...")
        trans = conn.begin()
        try:
            # 1. run_days (JSON)
            conn.execute(text("ALTER TABLE teacher_batches ADD COLUMN IF NOT EXISTS run_days JSONB;"))
            # Note: Using JSONB for Postgres, but if SQLite it might differ. SQLalchemy 'JSON' type handles it, but raw SQL needs care.
            # Assuming Postgres based on models.py usage of postgresql_where.
            
            # 2. start_time (Time)
            conn.execute(text("ALTER TABLE teacher_batches ADD COLUMN IF NOT EXISTS start_time TIME;"))
            
            # 3. end_time (Time)
            conn.execute(text("ALTER TABLE teacher_batches ADD COLUMN IF NOT EXISTS end_time TIME;"))
            
            # 4. timezone (String)
            conn.execute(text("ALTER TABLE teacher_batches ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);"))
            
            # 5. status (String, Not Null, Default Active)
            conn.execute(text("ALTER TABLE teacher_batches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' NOT NULL;"))
            
            trans.commit()
            print("Migration successful.")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")
            raise e

if __name__ == "__main__":
    migrate()
