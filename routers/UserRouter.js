import { Router } from "express";
import userController from "../controllers/UserController.js";
import { validateToken } from "./middlewares.js";

export function userRouter(mailer) {

    const userRouter = Router();
    
    userRouter.post("/register", async function (req, res) {
        return await userController.register(req, res);
    });
    
    userRouter.post("/login", async function (req, res) {
        return await userController.login(req, res, mailer); 
    });
    
    userRouter.put("/edit", validateToken, async function (req, res) {
        return await userController.editUser(req, res); 
    });
    
    userRouter.delete("/delete", validateToken, async function (req, res) {
        return await userController.deleteUser(req, res); 
    });

    userRouter.post("/send-email", validateToken, async function (req, res) {
        console.log(req.user.gmail);
        const response = await fetch('http://localhost:8000/enviar-email', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                to: req.user.gmail, subject: "Deteccion de movimiento de la persona mayor.",
                text: "Hemos detectado que la persona mayor ha salido de su zona segura, favor de revisarlo."
            })
        });
        if (!response.ok) return res.status(400).json({ success: false, message: "el envio del email falló." });
        const parsed = await response.json();
        return res.status(200).json(...parsed);
    });

    return userRouter;
}