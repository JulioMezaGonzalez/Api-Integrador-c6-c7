import { parentPort } from "worker_threads";
import bcrypt from "bcrypt";

parentPort.on("message", (keys) => {
    try {
        const isValid = bcrypt.compareSync(keys.userPassword, keys.storedPassword);
        parentPort.postMessage({isValid});
    } catch (error) {
        parentPort.postMessage({ isValid: false, error });
    } finally {
        process.exit();
    }
});