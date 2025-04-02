from multiprocessing import Manager, Process, Lock
from multiprocessing.synchronize import Lock as TypeLock
from time import sleep
from typing import Any

class Persona:
    def __init__(self, nombre="juan"):
        self.nombre = nombre

manager = Manager()
shared_dict = manager.dict()
shared_dict['persona'] = Persona("aldo")

def process1_func(shared_dict: Any, lock: TypeLock):
    with lock:
        persona = shared_dict['persona']
        print(f"Process 1 sees nombre: {persona.nombre}")
        shared_dict['persona'] = Persona("pedro")

def process2_func(shared_dict: Any, lock: TypeLock):
    sleep(2)
    with lock:
        persona = shared_dict['persona']
        print(f"Process 2 sees nombre: {persona.nombre}")
        
shared_lock = Lock()
process1 = Process(target=process1_func, args=(shared_dict, shared_lock))
process2 = Process(target=process2_func, args=(shared_dict, shared_lock))

process1.start()
process2.start()

process1.join()
process2.join()