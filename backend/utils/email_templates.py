from datetime import datetime

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

def get_password_reset_template(otp_code: str) -> str:
    """
    Returns a professional HTML email template for Password Reset.
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
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
                background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
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
                background-color: #fef2f2;
                border: 1px solid #fee2e2;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 32px;
            }}
            .otp-code {{
                color: #991b1b;
                font-size: 32px;
                font-weight: 700;
                letter-spacing: 8px;
                font-family: monospace;
            }}
            .expiry {{
                color: #7f1d1d;
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
                <h2 class="title">Reset your password</h2>
                <p class="message">
                    We received a request to reset your password. Use the code below to proceed.
                </p>
                <div class="otp-box">
                    <div class="otp-code">{otp_code}</div>
                    <div class="expiry">Expires in 5 minutes</div>
                </div>
                <p class="message" style="font-size: 14px; color: #71717a; margin-bottom: 0;">
                    If you didn't request a password reset, you can safely ignore this email.
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

def get_exam_assigned_template(student_name: str, exam_title: str, subject: str, deadline: str) -> str:
    """
    Returns a professional HTML email template for Exam Assignment.
    """
    current_year = datetime.now().year
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Exam Assigned</title>
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
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
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
            }}
            .title {{
                color: #18181b;
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 16px;
                text-align: center;
            }}
            .message {{
                color: #52525b;
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 24px;
                text-align: center;
            }}
            .exam-details {{
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 32px;
            }}
            .detail-row {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
                font-size: 14px;
            }}
            .detail-row:last-child {{
                margin-bottom: 0;
            }}
            .detail-label {{
                color: #64748b;
                font-weight: 500;
            }}
            .detail-value {{
                color: #0f172a;
                font-weight: 600;
                text-align: right;
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
                <h2 class="title">New Exam Assigned</h2>
                <p class="message">
                    Hello {student_name}, a new exam has been assigned to you. Please check the details below and ensure you submit it before the deadline.
                </p>
                <div class="exam-details">
                    <div class="detail-row">
                        <span class="detail-label">Exam Title</span>
                        <span class="detail-value">{exam_title}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Subject</span>
                        <span class="detail-value">{subject}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Deadline</span>
                        <span class="detail-value">{deadline}</span>
                    </div>
                </div>
                <div style="text-align: center;">
                    <a href="#" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">View Exam</a>
                </div>
            </div>
            <div class="footer">
                <p>&copy; {current_year} SmartLearn AI. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_exam_checked_template(student_name: str, exam_title: str, marks_obtained: int, total_marks: int, feedback: str) -> str:
    """
    Returns a professional HTML email template for Exam Checked notification.
    """
    current_year = datetime.now().year
    
    # Truncate feedback if too long for email preview
    preview_feedback = feedback[:200] + "..." if len(feedback) > 200 else feedback
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exam Checked - Results Available</title>
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
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
            }}
            .title {{
                color: #18181b;
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 16px;
                text-align: center;
            }}
            .message {{
                color: #52525b;
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 24px;
                text-align: center;
            }}
            .result-card {{
                background-color: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-radius: 8px;
                padding: 24px;
                margin-bottom: 24px;
                text-align: center;
            }}
            .score-label {{
                color: #15803d;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 8px;
                display: block;
            }}
            .score-value {{
                color: #166534;
                font-size: 36px;
                font-weight: 800;
                line-height: 1;
            }}
            .score-total {{
                font-size: 18px;
                color: #86efac;
                font-weight: 500;
            }}
            .feedback-section {{
                 background-color: #f8fafc;
                 border-left: 4px solid #cbd5e1;
                 padding: 16px;
                 margin-bottom: 32px;
            }}
            .feedback-label {{
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #64748b;
                font-weight: 700;
                margin-bottom: 8px;
                display: block;
            }}
            .feedback-text {{
                color: #334155;
                font-size: 14px;
                font-style: italic;
                line-height: 1.6;
                margin: 0;
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
                <h2 class="title">Exam Checked</h2>
                <p class="message">
                    Hello {student_name}, your exam "<strong>{exam_title}</strong>" has been checked by your teacher.
                </p>
                
                <div class="result-card">
                    <span class="score-label">YOU SCORED</span>
                    <span class="score-value">{marks_obtained} <span class="score-total">/ {total_marks}</span></span>
                </div>

                <div class="feedback-section">
                    <span class="feedback-label">Teacher Feedback</span>
                    <p class="feedback-text">"{preview_feedback}"</p>
                </div>

                <div style="text-align: center;">
                    <a href="#" style="background-color: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">View Full Result</a>
                </div>
            </div>
            <div class="footer">
                <p>&copy; {current_year} SmartLearn AI. All rights reserved.</p>
                <p>Ensure to review your mistakes and improve!</p>
            </div>
        </div>
    </body>
    </html>
    """

