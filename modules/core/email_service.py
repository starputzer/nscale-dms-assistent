import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class EmailService:
    """Email service for sending notifications and system emails"""
    
    def __init__(self):
        self.smtp_host = os.getenv('EMAIL_HOST', 'localhost')
        self.smtp_port = int(os.getenv('EMAIL_PORT', '587'))
        self.smtp_user = os.getenv('EMAIL_USER', '')
        self.smtp_pass = os.getenv('EMAIL_PASS', '')
        self.from_email = os.getenv('EMAIL_FROM', 'noreply@nscale-assist.local')
        self.use_tls = os.getenv('EMAIL_USE_TLS', 'true').lower() == 'true'
        
        # Thread pool for async email sending
        self.executor = ThreadPoolExecutor(max_workers=5)
        
        # Email templates
        self.templates = {
            'password_reset': {
                'subject': 'Password Reset Request - nscale Assist',
                'body': '''
                <html>
                <body>
                    <h2>Password Reset Request</h2>
                    <p>Hello {user_name},</p>
                    <p>You have requested to reset your password. Please click the link below to reset your password:</p>
                    <p><a href="{reset_link}">Reset Password</a></p>
                    <p>This link will expire in 24 hours.</p>
                    <p>If you did not request this, please ignore this email.</p>
                    <p>Best regards,<br>nscale Assist Team</p>
                </body>
                </html>
                '''
            },
            'feedback_response': {
                'subject': 'Response to Your Feedback - nscale Assist',
                'body': '''
                <html>
                <body>
                    <h2>Thank You for Your Feedback</h2>
                    <p>Hello {user_name},</p>
                    <p>We have reviewed your feedback and would like to respond:</p>
                    <blockquote style="background: #f5f5f5; padding: 10px; margin: 10px 0;">
                        <p><strong>Your feedback:</strong></p>
                        <p>{original_feedback}</p>
                    </blockquote>
                    <p><strong>Our response:</strong></p>
                    <p>{response_text}</p>
                    <p>Thank you for helping us improve nscale Assist.</p>
                    <p>Best regards,<br>nscale Assist Team</p>
                </body>
                </html>
                '''
            },
            'user_created': {
                'subject': 'Welcome to nscale Assist',
                'body': '''
                <html>
                <body>
                    <h2>Welcome to nscale Assist</h2>
                    <p>Hello {user_name},</p>
                    <p>Your account has been created successfully.</p>
                    <p><strong>Login details:</strong></p>
                    <ul>
                        <li>Email: {email}</li>
                        <li>Temporary Password: {temp_password}</li>
                    </ul>
                    <p>Please change your password after your first login.</p>
                    <p><a href="{login_url}">Login to nscale Assist</a></p>
                    <p>Best regards,<br>nscale Assist Team</p>
                </body>
                </html>
                '''
            },
            'system_alert': {
                'subject': 'System Alert - nscale Assist',
                'body': '''
                <html>
                <body>
                    <h2>System Alert</h2>
                    <p>Attention Administrator,</p>
                    <p>The following system alert has been triggered:</p>
                    <p><strong>Alert Type:</strong> {alert_type}</p>
                    <p><strong>Severity:</strong> {severity}</p>
                    <p><strong>Time:</strong> {timestamp}</p>
                    <p><strong>Details:</strong></p>
                    <p>{alert_details}</p>
                    <p>Please check the admin dashboard for more information.</p>
                    <p>Best regards,<br>nscale Assist System</p>
                </body>
                </html>
                '''
            },
            'job_completion': {
                'subject': 'Background Job Completed - nscale Assist',
                'body': '''
                <html>
                <body>
                    <h2>Background Job Completed</h2>
                    <p>Hello {user_name},</p>
                    <p>Your background job has been completed.</p>
                    <p><strong>Job Details:</strong></p>
                    <ul>
                        <li>Job ID: {job_id}</li>
                        <li>Type: {job_type}</li>
                        <li>Status: {status}</li>
                        <li>Duration: {duration}</li>
                    </ul>
                    {result_section}
                    <p>View more details in the admin dashboard.</p>
                    <p>Best regards,<br>nscale Assist System</p>
                </body>
                </html>
                '''
            }
        }
    
    def _send_email_sync(self, to_email: str, subject: str, body: str, is_html: bool = True) -> bool:
        """Synchronously send an email"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'html' if is_html else 'plain'))
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                if self.smtp_user and self.smtp_pass:
                    server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def send_email(self, to_email: str, subject: str, body: str, is_html: bool = True) -> bool:
        """Asynchronously send an email"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor,
            self._send_email_sync,
            to_email, subject, body, is_html
        )
    
    async def send_template_email(self, to_email: str, template_name: str, variables: Dict[str, str]) -> bool:
        """Send an email using a template"""
        if template_name not in self.templates:
            logger.error(f"Template '{template_name}' not found")
            return False
        
        template = self.templates[template_name]
        subject = template['subject']
        body = template['body']
        
        # Replace variables in the template
        for key, value in variables.items():
            body = body.replace(f'{{{key}}}', str(value))
        
        return await self.send_email(to_email, subject, body)
    
    async def send_password_reset_email(self, to_email: str, user_name: str, reset_link: str) -> bool:
        """Send password reset email"""
        return await self.send_template_email(
            to_email,
            'password_reset',
            {
                'user_name': user_name,
                'reset_link': reset_link
            }
        )
    
    async def send_feedback_response_email(self, to_email: str, user_name: str, 
                                          original_feedback: str, response_text: str) -> bool:
        """Send feedback response email"""
        return await self.send_template_email(
            to_email,
            'feedback_response',
            {
                'user_name': user_name,
                'original_feedback': original_feedback,
                'response_text': response_text
            }
        )
    
    async def send_user_created_email(self, to_email: str, user_name: str, 
                                     temp_password: str, login_url: str) -> bool:
        """Send welcome email to new user"""
        return await self.send_template_email(
            to_email,
            'user_created',
            {
                'user_name': user_name,
                'email': to_email,
                'temp_password': temp_password,
                'login_url': login_url
            }
        )
    
    async def send_system_alert_email(self, admin_emails: List[str], alert_type: str,
                                     severity: str, alert_details: str) -> bool:
        """Send system alert to administrators"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        success_count = 0
        
        for email in admin_emails:
            result = await self.send_template_email(
                email,
                'system_alert',
                {
                    'alert_type': alert_type,
                    'severity': severity,
                    'timestamp': timestamp,
                    'alert_details': alert_details
                }
            )
            if result:
                success_count += 1
        
        return success_count > 0
    
    async def send_job_completion_email(self, to_email: str, user_name: str,
                                       job_id: str, job_type: str, status: str,
                                       duration: str, result_data: Optional[Dict] = None) -> bool:
        """Send job completion notification"""
        result_section = ''
        if result_data:
            if status == 'success':
                result_section = f'''
                <p><strong>Results:</strong></p>
                <ul>
                    <li>Items processed: {result_data.get('items_processed', 0)}</li>
                    <li>Success rate: {result_data.get('success_rate', 0)}%</li>
                </ul>
                '''
            else:
                result_section = f'''
                <p><strong>Error Details:</strong></p>
                <p style="color: #dc3545;">{result_data.get('error_message', 'Unknown error')}</p>
                '''
        
        return await self.send_template_email(
            to_email,
            'job_completion',
            {
                'user_name': user_name,
                'job_id': job_id,
                'job_type': job_type,
                'status': status,
                'duration': duration,
                'result_section': result_section
            }
        )
    
    def add_custom_template(self, name: str, subject: str, body: str):
        """Add a custom email template"""
        self.templates[name] = {
            'subject': subject,
            'body': body
        }
        logger.info(f"Added custom email template: {name}")
    
    def test_connection(self) -> bool:
        """Test SMTP connection"""
        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                if self.smtp_user and self.smtp_pass:
                    server.login(self.smtp_user, self.smtp_pass)
            logger.info("Email service connection test successful")
            return True
        except Exception as e:
            logger.error(f"Email service connection test failed: {str(e)}")
            return False

# Global email service instance
email_service = EmailService()