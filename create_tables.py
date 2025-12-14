from backend.database import engine
from backend import models

def create_tables():
    print("Creating all tables...")
    models.Base.metadata.create_all(bind=engine)
    print("Tables created.")

if __name__ == "__main__":
    create_tables()
