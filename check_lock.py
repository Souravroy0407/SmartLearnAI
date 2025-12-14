import sqlite3
import time

try:
    con = sqlite3.connect('sql_app.db', timeout=2) # 2 second timeout
    cur = con.cursor()
    cur.execute("PRAGMA busy_timeout = 2000")
    print("Trying to write...")
    cur.execute("CREATE TABLE IF NOT EXISTS lock_test (id INTEGER PRIMARY KEY)")
    cur.execute("INSERT INTO lock_test DEFAULT VALUES")
    con.commit()
    print("Write successful (Unlock).")
except sqlite3.OperationalError as e:
    print(f"DB LOCKED: {e}")
except Exception as e:
    print(f"Error: {e}")
finally:
    try:
        con.close()
    except:
        pass
