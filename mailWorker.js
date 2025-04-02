import nodemailer from "nodemailer";

export default async function sendMail({ gmail, password, mailOptions }) {
  if (!gmail || !password) {
    throw new Error("Credenciales de Gmail no definidas.");
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmail,
      pass: password
    }
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    return { response: info.response };
  } catch (error) {
    throw new Error(`Error al enviar el correo: ${error.message}`);
  }
}
