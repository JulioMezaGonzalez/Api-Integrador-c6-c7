import { WebSocketServer } from "ws";
import signale from "signale";
import mqtt from "mqtt";

/**
 * @param {WebSocketServer} wss
 */
export async function setMqtt(wss, mailer) {
  try {
    const client = await mqtt.connectAsync(process.env.MQTT_BROKER, {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD
    });
    signale.success("connected to mqtt");

    client.on("connect", (event) => {
      signale.info("connection to mqtt");
    });

    client.subscribe(process.env.TOPIC_DISTANCIA, (err, a) => {
      if (err) {
        signale.error(err);
      }
    });

    client.subscribe(process.env.TOPIC_TOQUE, (err, a) => {
      if (err) {
        signale.error(err);
      }
    });

    client.subscribe(process.env.TOPIC_TEMPERATURA, (err, a) => {
      if (err) {
        signale.error(err);
      }
    });

    client.subscribe(process.env.TOPIC_BPM, (err, a) => {
      if (err) {
        signale.error(err);
      }
    });

    client.on("message", async (topic, payload) => {
      try {
        /**
         * @type {{Llamada: boolean} | {Movimiento:boolean}}
        */
        console.log(payload.toString());
        const parsedData = JSON.parse(payload.toString());
        signale.success("recibido de mqtt: " + payload.toString());
        if (topic === process.env.TOPIC_DISTANCIA && parsedData.Movimiento) {
          wss.clients.forEach((client) => {
            client.send(JSON.stringify({ topic: "email/event" }));
          });
          return;
        }
        wss.clients.forEach((client) => {
          client.send(JSON.stringify({ topic, parsedData }));
        });
      } catch (error) {
        signale.error(error);
      }
    });
  } catch (error) {
    signale.error(`error setting mqtt connection.\n${error.message}`);
  }
}
