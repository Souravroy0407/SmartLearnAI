from backend.database import engine
from sqlalchemy import text, inspect

def force_drop_quiz_tables():
    with engine.connect() as conn:
        # Tables to drop
        target_tables = ['quiz_attempts', 'options', 'questions', 'quizzes']
        
        for target in target_tables:
            # Find constraints referencing this table
            print(f"Checking references to {target}...")
            query = text(f"""
                SELECT 
                    f.name AS ForeignKey,
                    OBJECT_NAME(f.parent_object_id) AS TableName
                FROM 
                    sys.foreign_keys AS f
                WHERE 
                    OBJECT_NAME (f.referenced_object_id) = '{target}'
            """)
            
            result = conn.execute(query).fetchall()
            for row in result:
                print(f"Dropping constraint {row.ForeignKey} from {row.TableName}")
                conn.execute(text(f"ALTER TABLE {row.TableName} DROP CONSTRAINT {row.ForeignKey}"))
        
        conn.commit()

        # Now drop tables
        for table in target_tables:
             print(f"Dropping table {table}...")
             conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
        conn.commit()
        print("Dropped tables successfully.")

if __name__ == "__main__":
    force_drop_quiz_tables()
