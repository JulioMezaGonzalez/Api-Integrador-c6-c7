#psw_process.py
import bcrypt
from multiprocessing import Process, Queue, Manager, Lock
from multiprocessing.managers import BaseManager
from threading import Thread
import threading
from sharedMailer import SharedMailer as Mailer

def email_sender(queue:Queue, shared_mailer:Mailer, lock):
    mailer = shared_mailer
    while True:
        try:
            data = queue.get()
            if data is None:
                break
                
            with lock:
                to, mailOptions = data
                mailer.to = to
                mailer.send_email(mailOptions)
        except Exception as e:
            print(f"Error en email_sender: {e}")

class PasswordProcessor:
    def encrypt_password(self, password):
        try:
            hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            return hashed.decode('utf-8')
        except Exception as e:
            return str(e)

    def compare_password(self, password, hashed_password):
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception as e:
            return str(e)

def worker_encrypt(password_queue, result_queue):
    processor = PasswordProcessor()
    while True:
        try:
            password = password_queue.get()
            if password is None:
                break
            result = processor.encrypt_password(password)
            result_queue.put(result)
        except Exception as e:
            print(f"Error en worker_encrypt: {e}")
            result_queue.put(str(e))

def worker_compare(compare_queue, result_queue):
    processor = PasswordProcessor()
    while True:
        try:
            data = compare_queue.get()
            if data is None:
                break
            password, hashed_password = data
            result = processor.compare_password(password, hashed_password)
            result_queue.put(result)
        except Exception as e:
            print(f"Error en worker_compare: {e}")
            result_queue.put(str(e))

class PasswordManager(BaseManager):
    pass

def start_server():
    # Crear colas
    password_queue = Queue()
    compare_queue = Queue()
    result_queue = Queue()
    email_queue = Queue()
    mailer_lock = Lock()
    manager = Manager()
    shared_mailer = Mailer(None, manager)

    encrypt_workers = [Process(target=worker_encrypt, args=(password_queue, result_queue)) for _ in range(2)]
    compare_workers = [Thread(target=worker_compare, args=(compare_queue, result_queue)) for _ in range(2)]
    email_workers = [Process(target=email_sender, args=(email_queue, shared_mailer, mailer_lock)) for _ in range(2)]
    
    # Iniciar procesos
    for worker in encrypt_workers:
        worker.daemon = True
        worker.start()
        
    for worker in compare_workers:
        worker.daemon = True
        worker.start()
        
    for worker in email_workers:
        worker.daemon = True
        worker.start()

    # Registrar colas en el manager
    PasswordManager.register('get_password_queue', callable=lambda: password_queue)
    PasswordManager.register('get_compare_queue', callable=lambda: compare_queue)
    PasswordManager.register('get_result_queue', callable=lambda: result_queue)
    PasswordManager.register('get_email_queue', callable=lambda: email_queue)

    # Crear y arrancar el servidor
    manager = PasswordManager(address=('localhost', 5000), authkey=b'secret')
    server = manager.get_server()
    print("Password Manager Server started on port 5000")
    server.serve_forever()

if __name__ == '__main__':
    start_server()