import asyncio
import queue
import multiprocessing
from sanic import Sanic, response
from sanic_cors import CORS
from multiprocessing.managers import BaseManager, Value

app = Sanic("myApp")
CORS(app, resources=r'/*')

class PasswordManagerClient(BaseManager):
    pass

PasswordManagerClient.register('get_password_queue')
PasswordManagerClient.register('get_compare_queue')
PasswordManagerClient.register('get_result_queue')
PasswordManagerClient.register('get_email_queue')

# Usamos un Value de multiprocessing para sincronización con una variable compartida
counter = Value('i', 0)

def increment_counter():
        counter.value += 1

async def get_manager():
    loop = asyncio.get_event_loop()
    manager = await loop.run_in_executor(None, lambda: PasswordManagerClient(address=('localhost', 5000), authkey=b'secret'))
    return manager

async def send_to_queue(queue, data):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, queue.put, data)
    increment_counter()  # Incrementamos el contador cada vez que se envía un dato a la cola

async def receive_from_queue(queue):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, queue.get)

@app.route("/encriptar-contrasenia", methods=["POST"])
async def encriptarpsw(request):
    try:
        password = request.json.get("password")
        if not password:
            return response.json({"error": "Falta el campo password"}, status=400)

        manager = await get_manager()
        manager.connect()
        password_queue = manager.get_password_queue()
        result_queue = manager.get_result_queue()

        await send_to_queue(password_queue, password)
        hashed_password = await receive_from_queue(result_queue)

        return response.json({"hashed_password": hashed_password, "requests_handled": counter.value})
    except Exception as e:
        return response.json({"error": str(e)}, status=500)

@app.route("/comparar-contrasenia", methods=["POST"])
async def compararpsw(request):
    try:
        usrpsw = request.json.get("password")
        hashedpsw = request.json.get("hashed_password")

        if not usrpsw or not hashedpsw:
            return response.json({"error": "Faltan campos password o hashed_password"}, status=400)

        manager = await get_manager()
        manager.connect()
        compare_queue = manager.get_compare_queue()
        result_queue = manager.get_result_queue()

        await send_to_queue(compare_queue, (usrpsw, hashedpsw))
        match = await receive_from_queue(result_queue)

        return response.json({"match": match, "requests_handled": counter.value})
    except Exception as e:
        return response.json({"error": str(e)}, status=500)

@app.route("/enviar-email", methods=["POST"])
async def enviar_email(request):
    try:
        to = request.json.get("to")
        subject = request.json.get("subject", "Sin Asunto")
        text = request.json.get("text", "")

        if not to:
            return response.json({"error": "Falta el campo to"}, status=400)

        mailOptions = {
            "subject": subject,
            "text": text
        }

        manager = await get_manager()
        manager.connect()
        email_queue = manager.get_email_queue()

        await send_to_queue(email_queue, (to, mailOptions))
        
        return response.json({"message": "Solicitud de envío de correo recibida.", "requests_handled": counter.value})
    except Exception as e:
        return response.json({"error": str(e)}, status=500)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
