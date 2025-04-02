from dotenv import load_dotenv
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import TypedDict
from multiprocessing.managers import SyncManager

# Cargar variables de entorno al iniciar
load_dotenv()

class MailerOptions(TypedDict):
    subject: str
    text: str

class SharedMailer:
    def __init__(self, to: str, manager: SyncManager):
        self.emitter = os.getenv("MY_GMAIL_ADDRESS")
        self.emitter_psw = os.getenv("MY_PRIVATE_GMAIL_KEY")
        self.shared_state = manager.dict()
        self.shared_state["to"] = to
        
        # Verificar que las variables de entorno estén disponibles
        if not self.emitter or not self.emitter_psw:
            raise ValueError("Las variables de entorno MY_GMAIL_ADDRESS y MY_PRIVATE_GMAIL_KEY son requeridas")
    
    @property
    def to(self):
        return self.shared_state["to"]
    
    @to.setter
    def to(self, value):
        self.shared_state["to"] = value
    
    def send_email(self, mailOptions: MailerOptions):
        try:
            # Crear el correo
            msg = MIMEMultipart()
            msg['From'] = self.emitter
            msg['To'] = self.to
            msg['Subject'] = mailOptions.get('subject', 'Sin Asunto')
            msg.attach(MIMEText(mailOptions.get('text', ''), 'plain'))

            # Conectar al servidor SMTP
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(self.emitter, self.emitter_psw)
                server.sendmail(self.emitter, self.to, msg.as_string())

            print(f"Correo enviado con éxito a {self.to}.")
        except Exception as e:
            print(f"Error al enviar el correo a {self.to}: {e}")
