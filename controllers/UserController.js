import signale from "signale";
import sanitizeHtml from "sanitize-html";
import UserModel from "../models/User.js";
import express from "express";
import {
  validateSafeString,
  validateEmail,
  validateExistingStrings,
} from "./validators.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const authTokenOptions = {
  secure: false,
  sameSite: 'Lax',
  domain: undefined
}

/**
 * key to decode the token
 * @type string
 */
const JWT_SECRET = process.env.JWT_SECRET;

async function comparePasswordWithWorker(userPassword, storedPassword) {
  const result = await fetch('http://127.0.0.1:8000/comparar-contrasenia', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({password: userPassword, hashed_password: storedPassword})
  });
  if (!result.ok) {
    return false;
  }
  const parsed = await result.json();
  if (parsed.error) {
    return false;
  }
  return parsed.match;
}

/**
 * @param {string} password 
 * @returns {Promise<string>}
 */
async function encryptPasswordWithProcess(password) {
  const result = await fetch('http://127.0.0.1:8000/encriptar-contrasenia', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  });
  if (!result.ok) {
    throw new Error("bad password response.");
  }
  const parsed = await result.json();
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  return parsed.hashed_password;
}

/** @param { express.Request } req @param { express.Response } res */
async function login(req, res, mailer) {
  try {
    const { gmail, password } = req.body;
    const safeGmail = sanitizeHtml(gmail).trim();
    const safePassword = sanitizeHtml(password).trim();
    

    if (!validateExistingStrings([safeGmail, safePassword])) {
      return res.status(400).json({
        success: false,
        message: "Email and password cannot be empty",
      });
    }

    if (!validateEmail(safeGmail) || !validateSafeString(safePassword)) {
      return res.status(400).json({
        success: false,
        message: "Request data is invalid or malformed",
      });
    }

    const user = await UserModel.findOne({ where: { gmail: safeGmail } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user was found",
      });
    }
    const isPasswordValid = await comparePasswordWithWorker(safePassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }
    mailer.to = safeGmail;
    const token = jwt.sign({ userGmail: user.gmail }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie('authToken', token, {
      httpOnly: true,
      sameSite: authTokenOptions.sameSite,
      secure: authTokenOptions.secure,
      domain: authTokenOptions.domain,//process.env.DOMAIN_ALLOWED,
      path: '/'
    });

    return res.status(200).json({
      success: true,
      user: {
        gmail: user.gmail
      },
      message: "User has been authenticated",
    });
  } catch (error) {
    signale.error(`Error in login request.\n${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Error in login request.\n${error.message}`,
    });
  }
}

function validarFortalezaContrasena(contrasena) {
  const longitudMinima = contrasena.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(contrasena);
  const tieneCaracterEspecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(contrasena);
  const tieneNumero = /[0-9]/.test(contrasena);
  
  return longitudMinima && tieneMayuscula && tieneCaracterEspecial && tieneNumero;
}

async function register(req, res) {
  try {
    const { gmail, password } = req.body;
    if (!validarFortalezaContrasena(password)) {
      return res.status(400).json({
        success: false,
        message: "favor de introducir una contraseña mas segura: almenos un numero, una mayuscula y un simbolo especial"
      });
    }
    //const safeUsername = sanitizeHtml(username).trim();
    const safeGmail = sanitizeHtml(gmail).trim();
    const safePassword = sanitizeHtml(password).trim();
    if (!validateExistingStrings([safeGmail, safePassword])) {
      return res.status(400).json({
        success: false,
        message: "username, email and password cannot be empty",
      });
    }
    if (
      !validateEmail(safeGmail) ||
      !validateSafeString(safePassword)
    ) {
      return res.status(400).json({
        success: false,
        message: "request data is invalid or malformed",
      });
    }

    const existingUser = await UserModel.findOne({
      where: { gmail: safeGmail },
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    const hashedPassword = await encryptPasswordWithProcess(safePassword);

    const newUser = await UserModel.create({
        gmail: safeGmail,
        password: hashedPassword,
    });
    if (!newUser) {
      return res.status(400).json({
        success: false,
        message: "couldn't create a new user",
      });
    }
    await newUser.save();
    return res.status(201).json({
      success: true,
      user: newUser,
      message: "new user created",
    });
  } catch (error) {
    signale.error(`error in register request.\n${error.message}`);
    return res.status(500).json({
      success: false,
      message: `error in register request.\n${error.message}`,
    });
  }
}

async function editUser(req, res) {
  try {
    const { newUsername, newEmail, newPassword } = req.body;

    const safeNewUsername = newUsername
      ? sanitizeHtml(newUsername).trim()
      : null;
    const safeNewEmail = newEmail ? sanitizeHtml(newEmail).trim() : null;
    const safeNewPassword = newPassword
      ? sanitizeHtml(newPassword).trim()
      : null;

    if (!safeNewUsername && !safeNewEmail && !safeNewPassword) {
      return res.status(400).json({
        success: false,
        message: "At least one of the new data fields must be provided",
      });
    }

    const updates = {};
    if (safeNewUsername && validateSafeString(safeNewUsername)) {
      updates.username = safeNewUsername;
    }
    if (safeNewEmail && validateEmail(safeNewEmail)) {
      updates.email = safeNewEmail;
    }
    if (safeNewPassword && validateSafeString(safeNewPassword)) {
      updates.password = await bcrypt.hash(safeNewPassword, 10);
    }

    await req.user.update(updates);

    return res.status(200).json({
      success: true,
      user: req.user,
      message: "User edited successfully",
    });
  } catch (error) {
    signale.error("Error in edit request\n" + error);
    return res.status(500).json({
      success: false,
      message: "Error in edit request\n" + error,
    });
  }
}

async function deleteUser(req, res) {
  try {
    await req.user.destroy();

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    signale.error("Error in delete request\n" + error);
    return res.status(500).json({
      success: false,
      message: "Error in delete request\n" + error,
    });
  }
}

const userController = {
  login,
  register,
  editUser,
  deleteUser,
};

export default userController;
