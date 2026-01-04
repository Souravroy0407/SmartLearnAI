import os
import smtplib
import logging
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv # Assuming this is needed for SMTP_HOST etc.

# Placeholder for constants if dotenv is not used or for default values
# These would typically be loaded from .env or defined globally
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.example.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "user@example.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "password")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@example.com")

# Initialize logger
logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def get_otp_email_template(otp_code: str) -> str:
    """
    Returns a professional HTML email template for OTP verification.
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #f4f4f5;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 480px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                padding: 32px 24px;
                text-align: center;
            }}
            .header h1 {{
                color: #ffffff;
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }}
            .content {{
                padding: 40px 32px;
                text-align: center;
            }}
            .title {{
                color: #18181b;
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 16px;
            }}
            .message {{
                color: #52525b;
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 32px;
            }}
            .otp-box {{
                background-color: #f3f4f6;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 32px;
            }}
            .otp-code {{
                color: #111827;
                font-size: 32px;
                font-weight: 700;
                letter-spacing: 8px;
                font-family: monospace;
            }}
            .expiry {{
                color: #71717a;
                font-size: 14px;
                margin-top: 12px;
            }}
            .footer {{
                background-color: #f8fafc;
                padding: 24px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }}
            .footer p {{
                color: #94a3b8;
                font-size: 12px;
                margin: 0;
                line-height: 1.5;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>SmartLearn AI</h1>
            </div>
            <div class="content">
                <h2 class="title">Verify your email address</h2>
                <p class="message">
                    Thanks for signing up! Please use the verification code below to complete your registration.
                </p>
                <div class="otp-box">
                    <div class="otp-code">{otp_code}</div>
                    <div class="expiry">Expires in 5 minutes</div>
                </div>
                <p class="message" style="font-size: 14px; color: #71717a; margin-bottom: 0;">
                    If you didn't create an account, you can safely ignore this email.
                </p>
            </div>
            <div class="footer">
                <p>&copy; {datetime.now().year} SmartLearn AI. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """

def send_email(to_email: str, subject: str, body: str, html_body: str = None) -> bool:
    """
    Sends an email using the configured SMTP server.
    Args:
        to_email: Recipient email
        subject: Email subject
        body: Plain text body
        html_body: Optional HTML body
    """
    # Re-fetch or check variables to ensure we have the latest environment state
    # or if module-level load failed.
    host = os.getenv("SMTP_HOST") or SMTP_HOST
    port = int(os.getenv("SMTP_PORT") or SMTP_PORT or 587)
    username = os.getenv("SMTP_USERNAME") or SMTP_USERNAME
    password = os.getenv("SMTP_PASSWORD") or SMTP_PASSWORD
    sender = os.getenv("SMTP_FROM") or SMTP_FROM

    logger.info(f"Attempting to send email to {to_email} via {host}:{port}")

    if not all([host, username, password, sender]):
        logger.error(f"Missing SMTP credentials! Host: {host}, User: {username}, From: {sender}")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = sender
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Attach plain text part
        msg.attach(MIMEText(body, 'plain'))
        
        # Attach HTML part if provided
        if html_body:
            msg.attach(MIMEText(html_body, 'html'))

        logger.info("Connecting to SMTP server...")
        server = smtplib.SMTP(host, port)
        server.starttls()
        
        logger.info("Logging in to SMTP server...")
        server.login(username, password)
        
        logger.info(f"Sending mail to {to_email}...")
        text = msg.as_string()
        server.sendmail(sender, to_email, text)
        server.quit()
        
        logger.info(f"✅ Email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to send email to {to_email}: {str(e)}", exc_info=True)
        return False

# Backward compatibility alias
send_plain_email = send_email
