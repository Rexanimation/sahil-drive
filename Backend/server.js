require("dotenv").config();
const app = require("./src/app")
const connectDb = require("./src/db/db");
const initSocketServer = require("./src/sockets/socket.server");
const httpServer = require("http").createServer(app);


connectDb()
initSocketServer(httpServer);


// Server startup
httpServer.listen(process.env.PORT || 4000, () => {
    console.log(`Server is running on port ${process.env.PORT || 4000}`);
})
// Trigger nodemon restart
