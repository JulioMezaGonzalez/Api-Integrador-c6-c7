import signale from "signale";
import TempModel from "../models/Temperatura.js";
import BPMModel from "../models/BPM.js";
import DistanciaModel from "../models/Distancias.js";
import ToqueModel from "../models/Toques.js";
import { Op } from "sequelize";
import sequelize from "../database/connectToDatabase.js";

// ===== INSERT RECORD FUNCTIONS =====

async function insertTemperatura(req, res) {
    return await insertRecord(req, res, TempModel, "temperatura");
}

async function insertBpm(req, res) {
    return await insertRecord(req, res, BPMModel, "bpm");
}

async function insertDistancia(req, res) {
    return await insertRecord(req, res, DistanciaModel, "distancia");
}

async function insertToque(req, res) {
    return await insertRecord(req, res, ToqueModel, "toque");
}

async function insertRecord(req, res, TypeModel, fieldname) {
    try {
        const { valor } = req.body;

        if (valor === undefined || valor === null) {
            signale.info("Petición incompleta: falta el valor");
            return res.status(400).json({
                success: false,
                message: "El valor no fue encontrado",
            });
        }

        const safeValor = parseFloat(valor);
        if (isNaN(safeValor)) {
            signale.info("Petición de inserción con valor inválido");
            return res.status(400).json({
                success: false,
                message: "El valor proporcionado no es válido",
            });
        }
        
        // Obtener la fecha actual
        const now = new Date();
        let newRecord;
        
        // Crear registro según el tipo de modelo
        switch (fieldname) {
            case "temperatura":
                newRecord = await TypeModel.create({
                    temperatura: safeValor,
                    fecha: now
                });
                break;
            case "bpm":
                newRecord = await TypeModel.create({
                    bpm: safeValor,
                    fecha: now
                });
                break;
            case "distancia":
                newRecord = await TypeModel.create({
                    distancia: safeValor,
                    fecha: now
                });
                break;
            case "toque":
                newRecord = await TypeModel.create({
                    toque: safeValor,
                    fecha: now
                });
                break;
        }

        return res.status(201).json({
            success: true,
            message: "Registro guardado exitosamente",
        });
    } catch (error) {
        signale.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

// ===== UTILITY FUNCTIONS =====

// Calcular media de valores
function calculateMean(records, valueFieldName) {
    if (!records || records.length === 0) {
        return 0;
    }
    const sum = records.reduce((acc, record) => acc + record[valueFieldName], 0);
    return sum / records.length;
}

// Obtener último registro
async function getLastRecord(TypeModel) {
    try {
        return await TypeModel.findOne({
            order: [["fecha", "DESC"]]
        });
    } catch (error) {
        signale.error("Error al obtener el último registro:", error);
        return null;
    }
}

// ===== SEARCH PER DAY FUNCTIONS =====

async function searchPerDay(req, res, TypeModel, valueFieldName) {
    try {
        const lastRecord = await getLastRecord(TypeModel);
        
        if (!lastRecord) {
            return res.status(404).json({
                success: false,
                message: "No se encontraron registros en la base de datos"
            });
        }

        // Crear copia de la fecha para no modificar la original
        const lastDate = new Date(lastRecord.fecha);
        
        // Formatear fecha actual para la consulta
        const currentDay = new Date(lastDate);
        currentDay.setHours(0, 0, 0, 0);
        
        // Formatear fecha anterior para la consulta (sin modificar lastDate)
        const previousDay = new Date(lastDate);
        previousDay.setDate(previousDay.getDate() - 1);
        previousDay.setHours(0, 0, 0, 0);
        
        const endOfCurrentDay = new Date(currentDay);
        endOfCurrentDay.setHours(23, 59, 59, 999);
        
        const endOfPreviousDay = new Date(previousDay);
        endOfPreviousDay.setHours(23, 59, 59, 999);

        // Buscar registros del día actual
        const currentDayRecords = await TypeModel.findAll({
            where: {
                fecha: {
                    [Op.between]: [currentDay, endOfCurrentDay]
                }
            }
        });

        // Buscar registros del día anterior
        const prevDayRecords = await TypeModel.findAll({
            where: {
                fecha: {
                    [Op.between]: [previousDay, endOfPreviousDay]
                }
            }
        });

        // Calcular promedios (incluso si hay 0 registros)
        const promActual = calculateMean(currentDayRecords, valueFieldName);
        const promAnterior = calculateMean(prevDayRecords, valueFieldName);

        // Formatear fechas para la respuesta
        const formatDate = (date) => `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

        return res.status(200).json({
            success: true,
            fechaActual: formatDate(currentDay),
            fechaAnterior: formatDate(previousDay),
            promActual,
            promAnterior
        });
    } catch (error) {
        signale.error("Error en búsqueda por día:", error);
        return res.status(500).json({
            success: false,
            message: "Error al procesar la consulta de registros",
            errorDetails: error.message
        });
    }
}

// ===== SEARCH PER WEEK FUNCTIONS =====

async function searchPerWeek(req, res, TypeModel, valueFieldName) {
    try {
        const lastRecord = await getLastRecord(TypeModel);
        
        if (!lastRecord) {
            return res.status(404).json({
                success: false,
                message: "No se encontraron registros en la base de datos"
            });
        }

        const lastDate = new Date(lastRecord.fecha);

        // Calcular inicio de la semana actual (domingo)
        const startOfCurrentWeek = new Date(lastDate);
        startOfCurrentWeek.setDate(lastDate.getDate() - lastDate.getDay());
        startOfCurrentWeek.setHours(0, 0, 0, 0);

        // Calcular fin de la semana actual (sábado)
        const endOfCurrentWeek = new Date(startOfCurrentWeek);
        endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);
        endOfCurrentWeek.setHours(23, 59, 59, 999);

        // Calcular inicio de la semana anterior
        const startOfPreviousWeek = new Date(startOfCurrentWeek);
        startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7);

        // Calcular fin de la semana anterior
        const endOfPreviousWeek = new Date(endOfCurrentWeek);
        endOfPreviousWeek.setDate(endOfPreviousWeek.getDate() - 7);

        // Buscar registros de la semana actual
        const currentWeekRecords = await TypeModel.findAll({
            where: {
                fecha: {
                    [Op.between]: [startOfCurrentWeek, endOfCurrentWeek]
                }
            }
        });

        // Buscar registros de la semana anterior
        const prevWeekRecords = await TypeModel.findAll({
            where: {
                fecha: {
                    [Op.between]: [startOfPreviousWeek, endOfPreviousWeek]
                }
            }
        });

        // Calcular promedios (incluso si hay 0 registros)
        const promActual = calculateMean(currentWeekRecords, valueFieldName);
        const promAnterior = calculateMean(prevWeekRecords, valueFieldName);

        // Calcular número de semanas para mostrar en la respuesta
        const getWeekNumber = (date) => {
            const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            return Math.ceil(((date - firstDayOfMonth) / (7 * 24 * 60 * 60 * 1000)) + 1);
        };

        return res.status(200).json({
            success: true,
            fechaActual: `semana ${getWeekNumber(lastDate)}`,
            fechaAnterior: `semana ${getWeekNumber(startOfPreviousWeek)}`,
            promActual,
            promAnterior
        });
    } catch (error) {
        signale.error("Error en búsqueda por semana:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor",
            errorDetails: error.message
        });
    }
}

// ===== SEARCH PER MONTH FUNCTIONS =====

async function searchPerMonth(req, res, TypeModel, valueFieldName) {
    try {
        const lastRecord = await getLastRecord(TypeModel);
        
        if (!lastRecord) {
            return res.status(404).json({
                success: false,
                message: "No se encontraron datos"
            });
        }

        const lastDate = new Date(lastRecord.fecha);
        const currentMonth = lastDate.getMonth();
        const currentYear = lastDate.getFullYear();

        // Calcular mes anterior
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // Buscar registros del mes actual
        const currentMonthRecords = await TypeModel.findAll({
            where: {
                [Op.and]: [
                    sequelize.where(sequelize.fn("MONTH", sequelize.col("fecha")), currentMonth + 1),
                    sequelize.where(sequelize.fn("YEAR", sequelize.col("fecha")), currentYear)
                ]
            }
        });

        // Buscar registros del mes anterior
        const prevMonthRecords = await TypeModel.findAll({
            where: {
                [Op.and]: [
                    sequelize.where(sequelize.fn("MONTH", sequelize.col("fecha")), prevMonth + 1),
                    sequelize.where(sequelize.fn("YEAR", sequelize.col("fecha")), prevYear)
                ]
            }
        });

        // Calcular promedios (incluso si hay 0 registros)
        const promActual = calculateMean(currentMonthRecords, valueFieldName);
        const promAnterior = calculateMean(prevMonthRecords, valueFieldName);

        // Obtener nombres de los meses
        const getMonthName = (month) => {
            const date = new Date();
            date.setMonth(month);
            return date.toLocaleString("es", { month: "long" });
        };

        return res.status(200).json({
            fechaActual: getMonthName(currentMonth),
            fechaAnterior: getMonthName(prevMonth),
            promActual,
            promAnterior
        });
    } catch (error) {
        signale.error("Error al buscar registros por mes:", error.message);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor",
            error: error.message
        });
    }
}

// ===== TYPE-SPECIFIC SEARCH FUNCTIONS =====

// --- Temperatura ---
async function searchTempPerDay(req, res) {
    return await searchPerDay(req, res, TempModel, "temperatura");
}

async function searchTempPerWeek(req, res) {
    return await searchPerWeek(req, res, TempModel, "temperatura");
}

async function searchTempPerMonth(req, res) {
    return await searchPerMonth(req, res, TempModel, "temperatura");
}

// --- BPM ---
async function searchBpmPerDay(req, res) {
    return await searchPerDay(req, res, BPMModel, "bpm");
}

async function searchBpmPerWeek(req, res) {
    return await searchPerWeek(req, res, BPMModel, "bpm");
}

async function searchBpmPerMonth(req, res) {
    return await searchPerMonth(req, res, BPMModel, "bpm");
}

// --- Distancia ---
async function searchDistanciaPerDay(req, res) {
    return await searchPerDay(req, res, DistanciaModel, "distancia");
}

async function searchDistanciaPerWeek(req, res) {
    return await searchPerWeek(req, res, DistanciaModel, "distancia");
}

async function searchDistanciaPerMonth(req, res) {
    return await searchPerMonth(req, res, DistanciaModel, "distancia");
}

// --- Toque ---
async function searchToquePerDay(req, res) {
    return await searchPerDay(req, res, ToqueModel, "toque");
}

async function searchToquePerWeek(req, res) {
    return await searchPerWeek(req, res, ToqueModel, "toque");
}

async function searchToquePerMonth(req, res) {
    return await searchPerMonth(req, res, ToqueModel, "toque");
}

// ===== CONTROLLER EXPORT =====

const statisticController = {
    // Insert functions
    insertTemperatura,
    insertBpm,
    insertDistancia,
    insertToque,
    
    // Generic search functions (for reuse)
    searchPerDay,
    searchPerWeek, 
    searchPerMonth,
    
    // Temperatura search functions
    searchTempPerDay,
    searchTempPerWeek,
    searchTempPerMonth,
    
    // BPM search functions
    searchBpmPerDay,
    searchBpmPerWeek,
    searchBpmPerMonth,
    
    // Distancia search functions
    searchDistanciaPerDay,
    searchDistanciaPerWeek,
    searchDistanciaPerMonth,
    
    // Toque search functions
    searchToquePerDay,
    searchToquePerWeek,
    searchToquePerMonth
};

export default statisticController;