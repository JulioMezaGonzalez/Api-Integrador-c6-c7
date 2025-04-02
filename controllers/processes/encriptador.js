import bcrypt from "bcrypt";

process.on("message", async (data) => {
    const { password } = data;
    const saltRounds = 10;

    try {
        const hashed = await bcrypt.hash(password, saltRounds);
        process.send({ hashed });
    } catch (error) {
        process.send({ error: error.message });
    } finally {
        process.exit();
    }
});