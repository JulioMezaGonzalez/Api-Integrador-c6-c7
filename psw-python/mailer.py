#mailer.py
from dotenv import load_dotenv
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import TypedDict

# Cargar variables de entorno al iniciar
load_dotenv()

class MailerOptions(TypedDict):
    subject: str
    text: str

class Mailer:
    def __init__(self, to: str):
        self.emitter = os.getenv("MY_GMAIL_ADDRESS")
        self.emitter_psw = os.getenv("MY_PRIVATE_GMAIL_KEY")
        self.to = to
        
        # Verificar que las variables de entorno estén disponibles
        if not self.emitter or not self.emitter_psw:
            raise ValueError("Las variables de entorno MY_GMAIL_ADDRESS y MY_PRIVATE_GMAIL_KEY son requeridas")

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

# Ejemplo de uso
if __name__ == "__main__":
    mailer = Mailer("cidshielder@gmail.com")
    mailOptions = {
        'subject': 'Prueba de correo',
        'text': 'Este es un correo de prueba desde Python.'
    }
    mailer.send_email(mailOptions)
