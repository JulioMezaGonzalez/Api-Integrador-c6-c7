//padre.js
const data = await pipe.recv();

//child.js
pipe.send({ data: "hola mundo." });