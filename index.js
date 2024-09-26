const express = require("express");
require('dotenv').config()
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors")
const port = 3001;
const cookieParser = require('cookie-parser');
const session = require('express-session');
const Usuario = require('./models/UsuarioModel')


const usuario_routes = require("./routes/usuarios");
const permiso_routes = require("./routes/permisos");
const vacaciones_routes = require("./routes/vacaciones");
const registros_routes = require("./routes/registros");

const uri = process.env.MONGODB_URI;

if(!uri){
    console.log("No se encontro la variable de entorno MONGODB_URI");
}

mongoose.Promise = global.Promise;

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors({
    origin: 'http://localhost:3000', // Reemplaza con la URL del frontend
    credentials: true
}));
mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    family: 4

})
    .then(() => {
        console.log('Conectado a MongoDB Atlas');
        app.use(express.json());
        app.use(cookieParser());
        app.use(session({
            secret: 'your_secret_key',
            resave: false,
            saveUninitialized: true,
            cookie: { secure: false,httpOnly: true } // En producción, debes configurar secure a true
        }));

        app.post('/login', async (req, res) => {
            const { email, contra, role,} = req.body;
            console.log('Correo:', email, 'Contraseña:', contra, 'Rol:', role); // Debugging line
            try {
                const user = await Usuario.findOne({correo:email });
                // req.session.user = { id: user.id, username: user.nombre };
                // console.log(req.session.user);
                if (!user) {
                    return res.status(400).send('Usuario no encontrado');
                }
                if (role !== user.rol) {
                    return res.status(400).send('Rol no encontrado');
                }
                if (contra !== user.contraseña) {
                    return res.status(400).send('Contraseña incorrecta');
                }
                req.session.user = { id: user._id, username: user.nombre }; // Asegúrarse de que el userId se establece correctamente
                console.log('Sesión del usuario:', req.session.user); // Línea de depuración
                // req.session.user = user;
                user.isOnline = true;
                await user.save(); // Guardar el estado actualizado del usuario en la base de datos
            
                res.json({ message: 'Login exitoso', user });
            } catch (error) {
                console.log(error);
                res.status(500).send('Error en el servidor');
            }
        });
        
        // Ruta protegida
        app.get('/protected', (req, res) => {
            if (!req.session.user) {
                return res.status(401).send('No autenticado');
            }
            res.send(req.session.user);
        });
    
   
        app.post('/logout', async (req, res) => {
            try {
              // Encuentra el usuario actual basado en la sesión
              const userId = req.session.user.id;
              const user = await Usuario.findById(userId);
              
              if (!user) {
                return res.status(400).send('Usuario no encontrado');
              }
              
              // Destruye la sesión del usuario
              req.session.destroy(async (err) => {
                if (err) {
                  return res.status(500).send('Error al cerrar sesión');
                }
                
                // Actualiza el estado en línea del usuario
                user.isOnline = false;
                await user.save();
                
                // Limpia las cookies y envía la respuesta
                res.clearCookie('connect.sid');
                res.send('Logout exitoso');
              });
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
              res.status(500).send('Error en el servidor');
            }
          });

        app.get('/isOnline/:userId', async (req, res) => {
            try {
              const user = await Usuario.findById(req.params.userId);
              if (user) {
                console.log('User found:', user);
                console.log('User status:', user.isOnline);
                res.json({ isOnline: user.isOnline });
              } else {
                res.status(404).json({ message: 'User not found' });
              }
            } catch (error) {
              console.error('Error fetching user status:', error);
              res.status(500).json({ message: 'Error fetching user status' });
            }
          });
          

       
        app.use("/api", usuario_routes);
        app.use("/api",permiso_routes);
        app.use("/api",vacaciones_routes);
        app.use("/api",registros_routes);
       
    

        app.listen(port, () => {
            console.log("servidor corriendo en el puerto", port);
        })

    })
    .catch(error => console.log(error));

 

    