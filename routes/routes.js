const express = require('express');

class Routes{
    constructor(){
        this.router = express.Router();
        this.loadRoutes();
       
    }
    loadRoutes(){
        // middleware that is specific to this router
        this.router.use(function timeLog (req, res, next) {
            console.log('Time: ', Date.now())
            next()
        })
        
        this.router.get('/', function (req, res) {
            res.render('index')
          })
    }
}
module.exports = Routes;