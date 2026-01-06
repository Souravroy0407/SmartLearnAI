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
