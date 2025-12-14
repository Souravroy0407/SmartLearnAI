from sqlalchemy import create_engine, text
from backend.database import DATABASE_URL
import os

# Ensure we have a URL
if not DATABASE_URL:
    # Try to guess or fail
    print("No DATABASE_URL found. Assuming local SQLite for testing...")
    DATABASE_URL = "sqlite:///./sql_app.db"

engine = create_engine(DATABASE_URL)

def add_column(column_name, column_type, default_val):
    with engine.connect() as conn:
        try:
            # Check if column exists is hard across dialects without inspection
            # Just try to add it.
            with open("migration_output.txt", "a") as f:
                f.write(f"Attempting to add column {column_name}...\n")
            
            # We try standard SQL first (MSSQL/Postgres style)
            sql = f"ALTER TABLE study_tasks ADD {column_name} {column_type} DEFAULT '{default_val}'"
            if 'sqlite' in DATABASE_URL:
                 sql = f"ALTER TABLE study_tasks ADD COLUMN {column_name} {column_type} DEFAULT '{default_val}'"
            
            # Special case for Integer/Boolean
            if column_type == 'INTEGER':
                sql = f"ALTER TABLE study_tasks ADD {column_name} {column_type} DEFAULT {default_val}"
                if 'sqlite' in DATABASE_URL:
                     sql = f"ALTER TABLE study_tasks ADD COLUMN {column_name} {column_type} DEFAULT {default_val}"

            conn.execute(text(sql))
            conn.commit()
            with open("migration_output.txt", "a") as f:
                f.write(f"Successfully added {column_name}.\n")
        except Exception as e:
            with open("migration_output.txt", "a") as f:
                f.write(f"Failed to add {column_name} (might already exist): {e}\n")

if __name__ == "__main__":
    with open("migration_output.txt", "w") as f:
        f.write("Starting migration...\n")
    add_column('priority', 'VARCHAR(20)', 'medium')
    add_column('difficulty_feedback', 'VARCHAR(20)', 'neutral')
    add_column('is_locked', 'INTEGER', 0)
    with open("migration_output.txt", "a") as f:
        f.write("Migration finished.\n")
