// const express = require('express')
// const cors = require('cors')
// require('dotenv').config()
// let PORT = process.env.PORT;
// // const userRoutes = require('./routes/user.route')
// // const adminRoutes = require('./routes/admin.route')

// const app = express()
// app.use(cors())
// app.use(express.urlencoded({extended:true}))
// app.use(express.json())
// // app.use('/', userRoutes)
// // app.use('/', adminRoutes)



// app.listen(PORT,()=>{
//     console.log(` Server running on PORT: ${PORT}`);
// })



// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const userRoutes = require('./routes/user.routes');

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Use the unified user routes under the "/api" path
app.use('/api', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on PORT: ${PORT}`);
});


app.get('/api/user', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      res.json({ firstName: decoded.firstName, lastName: decoded.lastName, email: decoded.email });
    } catch {
      res.status(401).json({ message: 'Invalid token' });
    }
  });
  
