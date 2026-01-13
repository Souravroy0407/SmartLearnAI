from sqlalchemy.orm import Session
from datetime import datetime, timezone
from models import ExamEvent

# Allowed Event Types
EVENT_EXAM_ASSIGNED = "exam_assigned"
EVENT_EXAM_SUBMITTED = "exam_submitted"
EVENT_EXAM_CHECKED = "exam_checked"
EVENT_REEVAL_REQUESTED = "reeval_requested"
EVENT_EXAM_RE_EVALUATED = "exam_re_evaluated"
EVENT_DEADLINE_UPDATED = "deadline_updated"

# Allowed Triggered By
TRIGGER_STUDENT = "student"
TRIGGER_TEACHER = "teacher"
TRIGGER_SYSTEM = "system"

def log_exam_event(
    db: Session,
    exam_id: int,
    student_id: int,
    teacher_id: int,
    event_type: str,
    triggered_by: str
) -> ExamEvent:
    """
    Logs a new exam event to the exam_events table.
    
    Args:
        db (Session): Database session
        exam_id (int): ID of the exam
        student_id (int): ID of the student
        teacher_id (int): ID of the teacher
        event_type (str): Type of event (use defined constants)
        triggered_by (str): Who triggered the event (use defined constants)
        
    Returns:
        ExamEvent: The created event object
    """
    
    new_event = ExamEvent(
        exam_id=exam_id,
        student_id=student_id,
        teacher_id=teacher_id,
        event_type=event_type,
        triggered_by=triggered_by,
        event_time=datetime.now(timezone.utc)
    )
    
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    
    return new_event
