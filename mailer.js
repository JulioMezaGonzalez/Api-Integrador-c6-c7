import Piscina from "piscina";
import os from "os";

const numCPUs = os.cpus().length;

export class Mailer {
  static threadPool = new Piscina({// pool de hilos
    minThreads: Math.max(1, Math.floor(numCPUs / 4)),
    maxThreads: Math.max(2, Math.floor(numCPUs / 2)),
    filename: './mailWorker.js'//new URL('./mailWorker.js', import.meta.url).pathname
  });

  constructor() {
    this.gmail = process.env.MY_GMAIL_ADDRESS;
    this.password = process.env.MY_PRIVATE_GMAIL_KEY;
    this.to = null;
  }

  /**
   * Enviar correo utilizando un worker del pool
   */
  async sendEmail() {
    if (!this.to) {
      console.error('No se ha especificado un destinatario.');
      return;
    }

    const mailOptions = {
      from: this.gmail || "",
      to: this.to || "",
      subject: "Movimiento detectado",
      text: "Hemos detectado movimiento de la persona mayor."
    };

    try {
      const result = await Mailer.threadPool.run({
        gmail: this.gmail,
        password: this.password,
        mailOptions
      });

      console.log('Correo enviado:', result.response);
    } catch (error) {
      console.error('Error al enviar el correo:', error);
    }
  }
}
