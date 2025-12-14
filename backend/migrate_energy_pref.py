from sqlalchemy import create_engine, text
from backend.database import DATABASE_URL
from backend.models import Base
import os

# Ensure we're running from project root
# Run with: python -m backend.migrate_energy_pref

def log(msg):
    with open("migration.log", "a") as f:
        f.write(msg + "\n")
    print(msg)

def migrate():
    log(f"Connecting to database...")
    try:
        engine = create_engine(DATABASE_URL)
        log(f"Engine created. connecting...")
        
        with engine.connect() as connection:
            log("Connected. Checking column...")
            # Check if column exists
            try:
                # SQL Server specific check
                result = connection.execute(text(
                    "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'energy_preference'"
                )).fetchone()
                
                if not result:
                    log("Column 'energy_preference' not found. Adding it...")
                    connection.execute(text("ALTER TABLE users ADD energy_preference VARCHAR(50)"))
                    connection.commit()
                    log("Migration successful: Added 'energy_preference' column.")
                else:
                    log("Column 'energy_preference' already exists. No action needed.")
                    
            except Exception as inner_e:
                log(f"Inner Error: {inner_e}")
                
    except Exception as e:
        log(f"Migration failed details: {e}")

if __name__ == "__main__":
    with open("migration.log", "w") as f:
        f.write("Start\n")
    migrate()
