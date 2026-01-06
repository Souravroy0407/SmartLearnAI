import os
import logging
import requests

# Configure logging
logger = logging.getLogger(__name__)

# Constants
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Sends an email using Brevo Transactional Email HTTP API (HTTPS).
    Replaces usages of smtplib which is blocked on Railway.
    """
    api_key = os.getenv("BREVO_API_KEY")
    sender_email = os.getenv("BREVO_SENDER_EMAIL")
    sender_name = os.getenv("BREVO_SENDER_NAME", "SmartLearn AI")

    if not api_key:
        logger.error("Missing BREVO_API_KEY environment variable")
        return False
        
    if not sender_email:
        logger.error("Missing BREVO_SENDER_EMAIL environment variable")
        return False

    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email
        },
        "to": [
            {
                "email": to_email
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }

    try:
        response = requests.post(
            BREVO_API_URL, 
            json=payload, 
            headers=headers, 
            timeout=10
        )
        
        if response.status_code == 201:
            logger.info(f"Email sent successfully to {to_email}")
            return True
        else:
            logger.error(f"Failed to send email to {to_email}. Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Exception error sending email to {to_email}: {str(e)}")
        return False
