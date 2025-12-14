from backend.database import engine
from backend.models import Base
# Import all models to ensure they are registered with Base
from backend.models import User, StudyTask, Quiz, Question, Option, QuizAttempt, QuizResponse

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully.")
